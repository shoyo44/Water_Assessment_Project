from datetime import datetime, timezone

from bson import ObjectId
from fastapi import APIRouter, Depends, HTTPException, status
from motor.motor_asyncio import AsyncIOMotorDatabase

from app.core.database import get_db
from app.models.schemas import (
    ConsumptionCreate,
    ConsumptionResponse,
    HostelCreate,
    HostelResponse,
    StudentCountCreate,
    StudentCountResponse,
)

router = APIRouter(prefix="/hostels", tags=["hostels"])


def now_utc() -> datetime:
    return datetime.now(timezone.utc)


def oid(value: str) -> ObjectId:
    try:
        return ObjectId(value)
    except Exception as exc:  # pragma: no cover
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid ID format") from exc


async def ensure_hostel_exists(db: AsyncIOMotorDatabase, hostel_id: str) -> dict:
    hostel = await db.hostels.find_one({"_id": oid(hostel_id)})
    if hostel is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Hostel not found")
    return hostel


@router.post("", response_model=HostelResponse, status_code=status.HTTP_201_CREATED)
async def create_hostel(payload: HostelCreate, db: AsyncIOMotorDatabase = Depends(get_db)) -> HostelResponse:
    doc = payload.model_dump()
    doc["created_at"] = now_utc()
    result = await db.hostels.insert_one(doc)
    return HostelResponse(
        id=str(result.inserted_id),
        name=doc["name"],
        location=doc["location"],
        blocks=doc["blocks"],
        floors=doc["floors"],
        created_at=doc["created_at"],
    )


@router.post(
    "/{hostel_id}/student-count",
    response_model=StudentCountResponse,
    status_code=status.HTTP_201_CREATED,
)
async def add_student_count(
    hostel_id: str,
    payload: StudentCountCreate,
    db: AsyncIOMotorDatabase = Depends(get_db),
) -> StudentCountResponse:
    await ensure_hostel_exists(db, hostel_id)
    doc = payload.model_dump()
    doc["hostel_id"] = hostel_id
    doc["created_at"] = now_utc()
    result = await db.student_counts.insert_one(doc)
    return StudentCountResponse(id=str(result.inserted_id), **doc)


@router.post(
    "/{hostel_id}/consumption",
    response_model=ConsumptionResponse,
    status_code=status.HTTP_201_CREATED,
)
async def add_consumption_record(
    hostel_id: str,
    payload: ConsumptionCreate,
    db: AsyncIOMotorDatabase = Depends(get_db),
) -> ConsumptionResponse:
    await ensure_hostel_exists(db, hostel_id)
    doc = payload.model_dump()
    doc["hostel_id"] = hostel_id
    doc["total_l"] = round(
        doc["bath_l"] + doc["laundry_l"] + doc["drinking_l"] + doc["kitchen_l"] + doc["other_l"], 3
    )
    doc["created_at"] = now_utc()
    result = await db.consumption_records.insert_one(doc)
    return ConsumptionResponse(id=str(result.inserted_id), **doc)


@router.get("/{hostel_id}/consumption", response_model=list[ConsumptionResponse])
async def get_consumption_records(
    hostel_id: str,
    limit: int = 50,
    db: AsyncIOMotorDatabase = Depends(get_db),
) -> list[ConsumptionResponse]:
    await ensure_hostel_exists(db, hostel_id)
    limit = max(1, min(limit, 500))
    cursor = (
        db.consumption_records.find({"hostel_id": hostel_id})
        .sort("timestamp", -1)
        .limit(limit)
    )
    records: list[ConsumptionResponse] = []
    async for item in cursor:
        records.append(
            ConsumptionResponse(
                id=str(item["_id"]),
                hostel_id=item["hostel_id"],
                timestamp=item["timestamp"],
                bath_l=item["bath_l"],
                laundry_l=item["laundry_l"],
                drinking_l=item["drinking_l"],
                kitchen_l=item["kitchen_l"],
                other_l=item.get("other_l", 0.0),
                total_l=item["total_l"],
                created_at=item["created_at"],
            )
        )
    return records

