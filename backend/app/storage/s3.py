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

    async def list_keys(self, prefix: str) -> list[str]:
        """List all object keys under a prefix."""
        full_prefix = self._key(prefix)
        keys: list[str] = []
        async with self._session.client("s3", region_name=self.region) as s3:
            paginator = s3.get_paginator("list_objects_v2")
            async for page in paginator.paginate(Bucket=self.bucket, Prefix=full_prefix):
                for obj in page.get("Contents", []):
                    # Strip the storage prefix to return relative keys
                    k = obj["Key"]
                    if self.prefix and k.startswith(self.prefix + "/"):
                        k = k[len(self.prefix) + 1:]
                    keys.append(k)
        return keys

    async def download(self, key: str, dest: Path) -> Path:
        """Download an S3 object to a local file path."""
        dest.parent.mkdir(parents=True, exist_ok=True)
        async with self._session.client("s3", region_name=self.region) as s3:
            resp = await s3.get_object(Bucket=self.bucket, Key=self._key(key))
            data = await resp["Body"].read()
            dest.write_bytes(data)
        return dest

    async def presigned_upload_url(self, key: str, expires_in: int = 300) -> str:
        """Generate a presigned URL for uploading a file directly to S3."""
        async with self._session.client("s3", region_name=self.region) as s3:
            return await s3.generate_presigned_url(
                "put_object",
                Params={"Bucket": self.bucket, "Key": self._key(key)},
                ExpiresIn=expires_in,
            )

    async def presigned_url(self, key: str, expires_in: int = 300, filename: str | None = None) -> str:
        """Generate a presigned download URL (S3 only)."""
        params = {"Bucket": self.bucket, "Key": self._key(key)}
        if filename:
            params["ResponseContentDisposition"] = f'attachment; filename="{filename}"'
            params["ResponseContentType"] = "application/pdf"
        async with self._session.client("s3", region_name=self.region) as s3:
            return await s3.generate_presigned_url(
                "get_object", Params=params, ExpiresIn=expires_in,
            )

    def local_path(self, key: str) -> Path:
        """Return a local cache path. For S3, files must be downloaded first
        via download() before they exist here."""
        local = self._tmp / key
        local.parent.mkdir(parents=True, exist_ok=True)
        return local
