from enum import Enum
from pydantic import BaseModel
from datetime import datetime, timezone


class JobStatus(str, Enum):
    PENDING = "pending"
    PROCESSING = "processing"
    COMPLETED = "completed"
    FAILED = "failed"


class Job(BaseModel):
    id: str
    status: JobStatus = JobStatus.PENDING
    created_at: datetime = datetime.now(timezone.utc)
    updated_at: datetime = datetime.now(timezone.utc)
    progress: int = 0
    progress_message: str = ""
    total_pdfs: int = 0
    processed_pdfs: int = 0
    options: dict = {}
    input_filenames: list[str] = []
    output_filename: str | None = None
    output_pages: int | None = None
    output_size: int | None = None
    error: str | None = None


async def load_job(redis, job_id: str) -> Job | None:
    data = await redis.get(f"job:{job_id}")
    if data is None:
        return None
    return Job.model_validate_json(data)


async def save_job(redis, job: Job, ttl: int = 3600) -> None:
    job.updated_at = datetime.now(timezone.utc)
    await redis.set(f"job:{job.id}", job.model_dump_json(), ex=ttl)
