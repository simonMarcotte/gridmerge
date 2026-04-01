import tempfile
from pathlib import Path
import time

from redis.asyncio import Redis

from app.config import Settings
from app.models import Job, JobStatus, load_job, save_job
from app.services.pdf_merger import (
    DEFAULT_OPTIONS,
    process_single_pdf,
    assemble_output_pdf,
)


async def process_merge_job(ctx: dict, job_id: str) -> None:
    redis: Redis = ctx["redis"]
    storage = ctx["storage"]
    settings: Settings = ctx["settings"]

    job = await load_job(redis, job_id)
    if job is None:
        return

    job.status = JobStatus.PROCESSING
    job.progress_message = "Starting..."
    await save_job(redis, job, ttl=settings.job_ttl_seconds)

    try:
        opts = {**DEFAULT_OPTIONS, **job.options}

        with tempfile.TemporaryDirectory() as work_dir:
            work_path = Path(work_dir)
            input_dir = work_path / "input"
            input_dir.mkdir()

            # Download input PDFs from storage (works for both S3 and local)
            input_keys = await storage.list_keys(f"jobs/{job_id}/input")
            pdf_keys = sorted([k for k in input_keys if k.lower().endswith(".pdf")])

            if not pdf_keys:
                raise ValueError("No PDF files found in storage")

            pdf_paths: list[Path] = []
            for key in pdf_keys:
                filename = Path(key).name
                dest = input_dir / filename
                await storage.download(key, dest)

                # Validate PDF magic bytes (presigned uploads skip API validation)
                with open(dest, "rb") as f:
                    header = f.read(4)
                if not header.startswith(b"%PDF"):
                    raise ValueError(f"{filename} is not a valid PDF")

                pdf_paths.append(dest)

            job.total_pdfs = len(pdf_paths)
            await save_job(redis, job, ttl=settings.job_ttl_seconds)

            all_page_paths: list[Path] = []

            for i, pdf_path in enumerate(pdf_paths):
                # Check if job was cancelled
                fresh = await load_job(redis, job_id)
                if fresh and fresh.status == JobStatus.FAILED:
                    return

                job.processed_pdfs = i
                job.progress = int(i / len(pdf_paths) * 90)
                job.progress_message = f"Processing PDF {i + 1} of {len(pdf_paths)}..."
                await save_job(redis, job, ttl=settings.job_ttl_seconds)

                page_paths = process_single_pdf(str(pdf_path), opts, work_path)
                all_page_paths.extend(page_paths)

            job.progress = 90
            job.progress_message = "Assembling output PDF..."
            await save_job(redis, job, ttl=settings.job_ttl_seconds)

            # Assemble output PDF locally
            output_path = work_path / "merged.pdf"
            page_count = assemble_output_pdf(all_page_paths, str(output_path))

            # Upload result to storage
            output_key = f"jobs/{job_id}/output/merged.pdf"
            output_data = output_path.read_bytes()
            await storage.save(output_key, output_data)
            output_size = len(output_data)

        # Use the user-provided name if set, otherwise derive from first input
        if not job.output_filename:
            first_name = job.input_filenames[0] if job.input_filenames else "merged"
            base_name = first_name.rsplit(".", 1)[0] if "." in first_name else first_name
            job.output_filename = f"{base_name}_merged.pdf"

        job.status = JobStatus.COMPLETED
        job.progress = 100
        job.processed_pdfs = len(pdf_paths)
        job.progress_message = "Done"
        job.output_pages = page_count
        job.output_size = output_size
        await save_job(redis, job, ttl=settings.job_ttl_seconds)

    except Exception as e:
        job.status = JobStatus.FAILED
        job.error = str(e)
        job.progress_message = "Failed"
        await save_job(redis, job, ttl=settings.job_ttl_seconds)


async def cleanup_expired_jobs(ctx: dict) -> None:
    """Periodic task: delete job storage directories whose Redis keys have expired."""
    storage = ctx["storage"]
    redis: Redis = ctx["redis"]

    # List all job prefixes in storage
    all_keys = await storage.list_keys("jobs")
    job_ids = set()
    for key in all_keys:
        # keys look like "jobs/<job_id>/input/..." or "jobs/<job_id>/output/..."
        parts = key.split("/")
        if len(parts) >= 2:
            job_ids.add(parts[1])

    for job_id in job_ids:
        exists = await redis.exists(f"job:{job_id}")
        if not exists:
            await storage.delete_prefix(f"jobs/{job_id}")
