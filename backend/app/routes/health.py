from fastapi import APIRouter, Depends
from redis.asyncio import Redis

from app.deps import get_redis

router = APIRouter()


@router.get("/health")
async def health(redis: Redis = Depends(get_redis)):
    try:
        await redis.ping()
        return {"status": "ok", "redis": "connected"}
    except Exception:
        return {"status": "degraded", "redis": "disconnected"}
