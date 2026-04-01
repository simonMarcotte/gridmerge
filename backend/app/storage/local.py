from pathlib import Path
from typing import AsyncIterator
import shutil
import aiofiles


class LocalFileStorage:
    def __init__(self, base_path: str) -> None:
        self.base = Path(base_path).resolve()
        self.base.mkdir(parents=True, exist_ok=True)

    def local_path(self, key: str) -> Path:
        path = (self.base / key).resolve()
        # Prevent path traversal — resolved path must stay within base
        if not str(path).startswith(str(self.base)):
            raise ValueError(f"Path traversal blocked: {key}")
        return path

    async def save(self, key: str, data: bytes) -> None:
        path = self.local_path(key)
        path.parent.mkdir(parents=True, exist_ok=True)
        async with aiofiles.open(path, "wb") as f:
            await f.write(data)

    async def stream(self, key: str, chunk_size: int = 8192) -> AsyncIterator[bytes]:
        path = self.local_path(key)
        async with aiofiles.open(path, "rb") as f:
            while True:
                chunk = await f.read(chunk_size)
                if not chunk:
                    break
                yield chunk

    async def exists(self, key: str) -> bool:
        return self.local_path(key).exists()

    async def size(self, key: str) -> int:
        return self.local_path(key).stat().st_size

    async def list_keys(self, prefix: str) -> list[str]:
        """List all file keys under a prefix."""
        path = self.local_path(prefix)
        if not path.exists():
            return []
        keys: list[str] = []
        for f in path.rglob("*"):
            if f.is_file():
                keys.append(str(f.relative_to(self.base)))
        return keys

    async def download(self, key: str, dest: Path) -> Path:
        """Copy a local file to dest (for interface compatibility with S3)."""
        import shutil as _shutil
        src = self.local_path(key)
        dest.parent.mkdir(parents=True, exist_ok=True)
        _shutil.copy2(src, dest)
        return dest

    async def delete_prefix(self, prefix: str) -> None:
        path = self.local_path(prefix)
        if path.exists():
            shutil.rmtree(path)
