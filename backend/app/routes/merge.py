import json
import re
import uuid
import asyncio

from fastapi import APIRouter, File, UploadFile, Form, HTTPException, Depends
from fastapi.responses import StreamingResponse
from redis.asyncio import Redis

from app.deps import get_redis, get_storage, get_settings
from app.config import Settings, validate_options
from app.storage.local import LocalFileStorage  # noqa: used as type hint fallback
from app.models import Job, JobStatus, load_job, save_job

router = APIRouter()

PDF_MAGIC = b"%PDF"

# Regex: keep only alphanumeric, spaces, hyphens, underscores, dots
_SAFE_FILENAME_RE = re.compile(r"[^\w\s\-.]", re.UNICODE)


def sanitize_filename(name: str) -> str:
    """Strip dangerous characters from a filename."""
    name = _SAFE_FILENAME_RE.sub("", name)
    # Collapse whitespace/dots, prevent empty
    name = name.strip(". ")
    return name or "file"


async def _check_rate_limit(redis: Redis, settings: Settings) -> None:
    """Simple sliding-window rate limit using Redis INCR + EXPIRE."""
    key = "gridmerge:rate:global"
    count = await redis.incr(key)
    if count == 1:
        await redis.expire(key, 60)
    if count > settings.rate_limit_per_minute:
        raise HTTPException(status_code=429, detail="Too many requests, try again later")


@router.post("/jobs", status_code=202)
async def create_job(
    files: list[UploadFile] = File(...),
    options: str = Form(None),
    redis: Redis = Depends(get_redis),
    storage: LocalFileStorage = Depends(get_storage),
    settings: Settings = Depends(get_settings),
):
    await _check_rate_limit(redis, settings)

    # Validate and clamp options
    try:
        raw_options = json.loads(options) if options else {}
    except json.JSONDecodeError:
        raise HTTPException(status_code=400, detail="Invalid JSON in options")
    options_dict = validate_options(raw_options)

    # Validate file count
    if len(files) < 1:
        raise HTTPException(status_code=400, detail="At least one file is required")
    if len(files) > settings.max_files:
        raise HTTPException(
            status_code=400,
            detail=f"Too many files (max {settings.max_files})",
        )

    max_bytes = settings.max_upload_size_mb * 1024 * 1024
    job_id = uuid.uuid4().hex
    filenames: list[str] = []

    for file in files:
        if not file.filename or not file.filename.lower().endswith(".pdf"):
            raise HTTPException(status_code=400, detail="Only PDF files are allowed")

        data = await file.read()

        # Size check
        if len(data) > max_bytes:
            raise HTTPException(
                status_code=400,
                detail=f"File {file.filename} exceeds {settings.max_upload_size_mb}MB limit",
            )

        # PDF magic number check
        if not data[:4].startswith(PDF_MAGIC):
            raise HTTPException(
                status_code=400,
                detail=f"File {file.filename} is not a valid PDF",
            )

        # Sanitize filename for storage key
        safe_name = sanitize_filename(file.filename)
        if not safe_name.lower().endswith(".pdf"):
            safe_name += ".pdf"

        idx = len(filenames)
        storage_key = f"jobs/{job_id}/input/{idx:03d}_{safe_name}"
        await storage.save(storage_key, data)
        filenames.append(file.filename)

    # Create job record
    job = Job(
        id=job_id,
        total_pdfs=len(filenames),
        options=options_dict,
        input_filenames=filenames,
    )
    await save_job(redis, job, ttl=settings.job_ttl_seconds)

    # Enqueue to ARQ
    from arq import ArqRedis

    arq = ArqRedis.from_url(settings.redis_url)
    await arq.enqueue_job("process_merge_job", job_id)
    await arq.aclose()

    return {"job_id": job_id, "status": job.status}


@router.get("/jobs/{job_id}")
async def get_job(job_id: str, redis: Redis = Depends(get_redis)):
    # Validate job_id is a hex string to prevent injection
    if not job_id.isalnum() or len(job_id) != 32:
        raise HTTPException(status_code=400, detail="Invalid job ID")
    job = await load_job(redis, job_id)
    if job is None:
        raise HTTPException(status_code=404, detail="Job not found")
    return job.model_dump()


@router.get("/jobs/{job_id}/download")
async def download_job(
    job_id: str,
    redis: Redis = Depends(get_redis),
    storage: LocalFileStorage = Depends(get_storage),
):
    if not job_id.isalnum() or len(job_id) != 32:
        raise HTTPException(status_code=400, detail="Invalid job ID")

    job = await load_job(redis, job_id)
    if job is None:
        raise HTTPException(status_code=404, detail="Job not found")
    if job.status != JobStatus.COMPLETED:
        raise HTTPException(status_code=409, detail=f"Job status is {job.status}")

    output_key = f"jobs/{job_id}/output/merged.pdf"
    if not await storage.exists(output_key):
        raise HTTPException(status_code=404, detail="Output file not found")

    # Sanitize output filename for Content-Disposition header
    safe_output_name = sanitize_filename(job.output_filename or "merged.pdf")

    return StreamingResponse(
        storage.stream(output_key),
        media_type="application/pdf",
        headers={
            "Content-Disposition": f'attachment; filename="{safe_output_name}"',
            "X-PDF-Name": safe_output_name,
            "X-PDF-Size": str(job.output_size or 0),
            "X-PDF-Pages": str(job.output_pages or 0),
        },
    )


# Backwards-compatible sync endpoint
@router.post("/merge-pdfs/")
async def merge_pdfs_sync(
    files: list[UploadFile] = File(...),
    options: str = Form(None),
    redis: Redis = Depends(get_redis),
    storage: LocalFileStorage = Depends(get_storage),
    settings: Settings = Depends(get_settings),
):
    """Synchronous wrapper: creates a job, polls until done, returns PDF."""
    response = await create_job(files, options, redis, storage, settings)
    job_id = response["job_id"]

    for _ in range(300):
        await asyncio.sleep(1)
        job = await load_job(redis, job_id)
        if job is None:
            raise HTTPException(status_code=500, detail="Job disappeared")
        if job.status == JobStatus.COMPLETED:
            return await download_job(job_id, redis, storage)
        if job.status == JobStatus.FAILED:
            raise HTTPException(status_code=500, detail=job.error or "Merge failed")

    raise HTTPException(status_code=504, detail="Job timed out")
