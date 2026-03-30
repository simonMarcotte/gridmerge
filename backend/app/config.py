from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    redis_url: str = "redis://localhost:6379"
    storage_backend: str = "local"  # "local" or "s3"
    storage_base_path: str = "/tmp/gridmerge-storage"
    s3_bucket: str = ""
    s3_prefix: str = ""
    s3_region: str = "us-east-1"
    max_upload_size_mb: int = 100
    max_files: int = 20
    job_ttl_seconds: int = 3600
    rate_limit_per_minute: int = 30
    cors_origins: list[str] = [
        "http://localhost:3000",
        "http://localhost:5173",
        "http://127.0.0.1:5173",
    ]

    model_config = {"env_prefix": "GRIDMERGE_"}


# Clamping ranges for user-supplied options
OPTIONS_LIMITS = {
    "PAGE_WIDTH": (500, 10000),
    "PAGE_HEIGHT": (500, 15000),
    "MARGIN": (0, 200),
    "TITLE_HEIGHT": (0, 500),
    "SLIDES_PER_COLUMN": (1, 10),
    "SLIDES_PER_ROW": (1, 10),
    "DPI_SCALE": (1, 8),
}


def validate_options(raw: dict) -> dict:
    """Validate and clamp merge options to safe ranges."""
    cleaned: dict = {}
    for key, (lo, hi) in OPTIONS_LIMITS.items():
        if key in raw:
            val = raw[key]
            if not isinstance(val, (int, float)):
                continue
            cleaned[key] = max(lo, min(hi, int(val)))
    return cleaned
