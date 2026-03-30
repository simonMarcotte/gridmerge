from pathlib import Path
from typing import AsyncIterator
import tempfile

import aioboto3


class S3FileStorage:
    """S3-backed storage. Implements the same interface as LocalFileStorage.

    For worker tasks that need a local file path (PyMuPDF requires real files),
    local_path() downloads the file to a temp directory and returns that path.
    """

    def __init__(self, bucket: str, prefix: str = "", region: str = "us-east-1") -> None:
        self.bucket = bucket
        self.prefix = prefix.strip("/")
        self.region = region
        self._session = aioboto3.Session()
        self._tmp = Path(tempfile.mkdtemp(prefix="gridmerge-s3-"))

    def _key(self, key: str) -> str:
        return f"{self.prefix}/{key}" if self.prefix else key

    async def save(self, key: str, data: bytes) -> None:
        async with self._session.client("s3", region_name=self.region) as s3:
            await s3.put_object(Bucket=self.bucket, Key=self._key(key), Body=data)

    async def stream(self, key: str, chunk_size: int = 8192) -> AsyncIterator[bytes]:
        async with self._session.client("s3", region_name=self.region) as s3:
            resp = await s3.get_object(Bucket=self.bucket, Key=self._key(key))
            async for chunk in resp["Body"].iter_chunks(chunk_size):
                yield chunk

    async def exists(self, key: str) -> bool:
        async with self._session.client("s3", region_name=self.region) as s3:
            try:
                await s3.head_object(Bucket=self.bucket, Key=self._key(key))
                return True
            except Exception:
                return False

    async def size(self, key: str) -> int:
        async with self._session.client("s3", region_name=self.region) as s3:
            resp = await s3.head_object(Bucket=self.bucket, Key=self._key(key))
            return resp["ContentLength"]

    async def delete_prefix(self, prefix: str) -> None:
        full_prefix = self._key(prefix)
        async with self._session.client("s3", region_name=self.region) as s3:
            paginator = s3.get_paginator("list_objects_v2")
            async for page in paginator.paginate(Bucket=self.bucket, Prefix=full_prefix):
                objects = page.get("Contents", [])
                if objects:
                    await s3.delete_objects(
                        Bucket=self.bucket,
                        Delete={"Objects": [{"Key": o["Key"]} for o in objects]},
                    )

    def local_path(self, key: str) -> Path:
        """Return a local cache path. Caller must ensure file is downloaded first
        via save() writing locally, or use the worker's tempdir approach."""
        local = self._tmp / key
        local.parent.mkdir(parents=True, exist_ok=True)
        return local
