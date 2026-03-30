from arq.connections import RedisSettings
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
        # Run cleanup every 10 minutes
        cleanup_expired_jobs,
    ]
    redis_settings = RedisSettings.from_dsn(settings.redis_url)
    max_jobs = 2
    job_timeout = 600
    on_startup = startup
    on_shutdown = shutdown
