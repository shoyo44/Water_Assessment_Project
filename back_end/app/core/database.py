from motor.motor_asyncio import AsyncIOMotorClient, AsyncIOMotorDatabase
from pymongo.errors import ConfigurationError
from fastapi import HTTPException, status

from app.core.config import get_settings


class MongoManager:
    def __init__(self) -> None:
        self.client: AsyncIOMotorClient | None = None
        self.db: AsyncIOMotorDatabase | None = None
        self._uri: str | None = None
        self._db_name: str | None = None
        self.last_error: str | None = None

    async def connect(self) -> None:
        settings = get_settings()
        self._uri = settings.mongodb_uri
        self._db_name = settings.mongodb_db

    async def disconnect(self) -> None:
        if self.client:
            self.client.close()
            self.client = None
            self.db = None
            self.last_error = None

    def ensure_client(self) -> None:
        if self.client is not None and self.db is not None:
            return
        if not self._uri or not self._db_name:
            settings = get_settings()
            self._uri = settings.mongodb_uri
            self._db_name = settings.mongodb_db
        try:
            self.client = AsyncIOMotorClient(
                self._uri,
                connect=False,
                serverSelectionTimeoutMS=3000,
            )
            self.db = self.client[self._db_name]
            self.last_error = None
        except ConfigurationError as exc:
            self.client = None
            self.db = None
            self.last_error = str(exc)


mongo_manager = MongoManager()


def get_db() -> AsyncIOMotorDatabase:
    mongo_manager.ensure_client()
    if mongo_manager.db is None:
        detail = "Database is unavailable. Verify MONGODB_URI and network DNS."
        if mongo_manager.last_error:
            detail = f"{detail} Cause: {mongo_manager.last_error}"
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=detail)
    return mongo_manager.db
