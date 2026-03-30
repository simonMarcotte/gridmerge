from functools import lru_cache

from redis.asyncio import Redis

from app.config import Settings

_redis: Redis | None = None
_storage = None


@lru_cache
def get_settings() -> Settings:
    return Settings()


async def init_redis() -> None:
    global _redis
    settings = get_settings()
    _redis = Redis.from_url(settings.redis_url, decode_responses=True)


async def close_redis() -> None:
    global _redis
    if _redis:
        await _redis.aclose()
        _redis = None


def get_redis() -> Redis:
    assert _redis is not None, "Redis not initialized"
    return _redis


def create_storage(settings: Settings):
    if settings.storage_backend == "s3":
        from app.storage.s3 import S3FileStorage
        return S3FileStorage(
            bucket=settings.s3_bucket,
            prefix=settings.s3_prefix,
            region=settings.s3_region,
        )
    from app.storage.local import LocalFileStorage
    return LocalFileStorage(settings.storage_base_path)


def get_storage():
    global _storage
    if _storage is None:
        _storage = create_storage(get_settings())
    return _storage
