from functools import lru_cache
from json import JSONDecodeError
from pathlib import Path

import firebase_admin
from fastapi import Header, HTTPException, status
from firebase_admin import auth, credentials

from app.core.config import get_settings


@lru_cache
def initialize_firebase_admin() -> bool:
    settings = get_settings()
    service_account_path = Path(settings.firebase_service_account_path)
    if not service_account_path.is_absolute():
        service_account_path = Path.cwd() / service_account_path
    service_account_path = service_account_path.resolve()

    if not service_account_path.exists():
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=f"Firebase service account not found at {service_account_path}",
        )

    if not firebase_admin._apps:
        try:
            cred = credentials.Certificate(str(service_account_path))
            firebase_admin.initialize_app(cred)
        except (ValueError, JSONDecodeError, OSError) as exc:
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail=f"Firebase service account is invalid at {service_account_path}",
            ) from exc

    return True


async def verify_firebase_token(authorization: str | None = Header(default=None)) -> dict:
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing Firebase bearer token.",
        )

    initialize_firebase_admin()
    token = authorization.removeprefix("Bearer ").strip()

    try:
        return auth.verify_id_token(token)
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired Firebase token.",
        ) from exc
