import tempfile
from pathlib import Path
import time

from redis.asyncio import Redis

from app.config import Settings
from app.models import Job, JobStatus, load_job, save_job
from app.storage.local import LocalFileStorage
from app.services.pdf_merger import (
    DEFAULT_OPTIONS,
    process_single_pdf,
    assemble_output_pdf,
)


async def process_merge_job(ctx: dict, job_id: str) -> None:
    redis: Redis = ctx["redis"]
    storage: LocalFileStorage = ctx["storage"]
    settings: Settings = ctx["settings"]

    job = await load_job(redis, job_id)
    if job is None:
        return

    job.status = JobStatus.PROCESSING
    job.progress_message = "Starting..."
    await save_job(redis, job, ttl=settings.job_ttl_seconds)

    try:
        opts = {**DEFAULT_OPTIONS, **job.options}
        input_dir = storage.local_path(f"jobs/{job_id}/input")
        pdf_paths = sorted(input_dir.glob("*.pdf"))

        if not pdf_paths:
            raise ValueError("No PDF files found")

        job.total_pdfs = len(pdf_paths)
        await save_job(redis, job, ttl=settings.job_ttl_seconds)

        all_page_paths: list[Path] = []

        with tempfile.TemporaryDirectory() as work_dir:
            work_path = Path(work_dir)

            for i, pdf_path in enumerate(pdf_paths):
                job.processed_pdfs = i
                job.progress = int(i / len(pdf_paths) * 90)
                job.progress_message = f"Processing PDF {i + 1} of {len(pdf_paths)}..."
                await save_job(redis, job, ttl=settings.job_ttl_seconds)

                page_paths = process_single_pdf(str(pdf_path), opts, work_path)
                all_page_paths.extend(page_paths)

            job.progress = 90
            job.progress_message = "Assembling output PDF..."
            await save_job(redis, job, ttl=settings.job_ttl_seconds)

            output_dir = storage.local_path(f"jobs/{job_id}/output")
            output_dir.mkdir(parents=True, exist_ok=True)
            output_path = str(output_dir / "merged.pdf")

            page_count = assemble_output_pdf(all_page_paths, output_path)

        output_size = (output_dir / "merged.pdf").stat().st_size
        first_name = job.input_filenames[0] if job.input_filenames else "merged"
        base_name = first_name.rsplit(".", 1)[0] if "." in first_name else first_name

        job.status = JobStatus.COMPLETED
        job.progress = 100
        job.processed_pdfs = len(pdf_paths)
        job.progress_message = "Done"
        job.output_filename = f"{base_name}_merged.pdf"
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
    storage: LocalFileStorage = ctx["storage"]
    redis: Redis = ctx["redis"]
    jobs_dir = storage.local_path("jobs")

    if not jobs_dir.exists():
        return

    now = time.time()
    for job_dir in jobs_dir.iterdir():
        if not job_dir.is_dir():
            continue
        job_id = job_dir.name
        # If the Redis key is gone, the job has expired — clean up files
        exists = await redis.exists(f"job:{job_id}")
        if not exists:
            await storage.delete_prefix(f"jobs/{job_id}")
