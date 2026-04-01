from arq.connections import RedisSettings
from arq.cron import cron
from redis.asyncio import Redis

from app.config import Settings
from app.deps import create_storage
from app.worker.tasks import process_merge_job, cleanup_expired_jobs

settings = Settings()


async def startup(ctx: dict) -> None:
    ctx["redis"] = Redis.from_url(settings.redis_url, decode_responses=True)
    ctx["storage"] = create_storage(settings)
    ctx["settings"] = settings


async def shutdown(ctx: dict) -> None:
    redis: Redis = ctx.get("redis")
    if redis:
        await redis.aclose()


class WorkerSettings:
    functions = [process_merge_job]
    cron_jobs = [
        cron(cleanup_expired_jobs, minute={0, 10, 20, 30, 40, 50}),
    ]
    redis_settings = RedisSettings.from_dsn(settings.redis_url)
    max_jobs = 2
    job_timeout = 600
    max_tries = 3 # Retry up to 3 times (Spot reclamation)
    retry_delay = 5
    on_startup = startup
    on_shutdown = shutdown
