import csv
import io
from datetime import datetime, timezone

from bson import ObjectId
from fastapi import APIRouter, Depends, File, HTTPException, UploadFile, status
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
        doc["bath_l"] + doc["laundry_l"] + doc["kitchen_l"] + doc["other_l"], 3
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
                kitchen_l=item["kitchen_l"],
                other_l=item.get("other_l", 0.0),
                total_l=item["total_l"],
                created_at=item["created_at"],
            )
        )
    return records



CSV_REQUIRED_COLS = {"timestamp", "bath_l", "laundry_l", "kitchen_l"}


@router.post("/{hostel_id}/consumption/upload-csv", status_code=status.HTTP_201_CREATED)
async def upload_consumption_csv(
    hostel_id: str,
    file: UploadFile = File(...),
    db: AsyncIOMotorDatabase = Depends(get_db),
):
    """Accept a CSV file and bulk-insert consumption records for a hostel.

    Required columns: timestamp, bath_l, laundry_l, kitchen_l
    Optional column : other_l  (defaults to 0)
    Timestamps accepted as ISO-8601 or 'YYYY-MM-DD HH:MM' strings.
    """
    await ensure_hostel_exists(db, hostel_id)

    if not file.filename or not file.filename.lower().endswith(".csv"):
        raise HTTPException(status_code=400, detail="Uploaded file must be a .csv file.")

    raw = await file.read()
    try:
        text = raw.decode("utf-8-sig")  # strip BOM if present
    except UnicodeDecodeError:
        raise HTTPException(status_code=400, detail="CSV file must be UTF-8 encoded.")

    reader = csv.DictReader(io.StringIO(text))
    if reader.fieldnames is None:
        raise HTTPException(status_code=400, detail="CSV file is empty or has no header row.")

    missing = CSV_REQUIRED_COLS - {c.strip().lower() for c in reader.fieldnames}
    if missing:
        raise HTTPException(
            status_code=400,
            detail=f"CSV is missing required columns: {', '.join(sorted(missing))}",
        )

    docs: list[dict] = []
    errors: list[dict] = []

    for line_num, row in enumerate(reader, start=2):
        row = {k.strip().lower(): v.strip() for k, v in row.items() if k}
        try:
            ts_raw = row["timestamp"]
            try:
                ts = datetime.fromisoformat(ts_raw)
            except ValueError:
                ts = datetime.strptime(ts_raw, "%Y-%m-%d %H:%M")
            if ts.tzinfo is None:
                ts = ts.replace(tzinfo=timezone.utc)

            bath_l = round(float(row["bath_l"]), 3)
            laundry_l = round(float(row["laundry_l"]), 3)
            kitchen_l = round(float(row["kitchen_l"]), 3)
            other_l = round(float(row.get("other_l") or 0), 3)

            if any(v < 0 for v in [bath_l, laundry_l, kitchen_l, other_l]):
                raise ValueError("Liter values must be >= 0")

            total_l = round(bath_l + laundry_l + kitchen_l + other_l, 3)

            docs.append({
                "hostel_id": hostel_id,
                "timestamp": ts,
                "bath_l": bath_l,
                "laundry_l": laundry_l,
                "kitchen_l": kitchen_l,
                "other_l": other_l,
                "total_l": total_l,
                "created_at": now_utc(),
            })
        except Exception as exc:
            errors.append({"row": line_num, "error": str(exc), "data": dict(row)})

    if not docs and errors:
        raise HTTPException(
            status_code=400,
            detail={"message": "All rows failed validation.", "errors": errors},
        )

    if docs:
        await db.consumption_records.insert_many(docs)

    return {
        "hostel_id": hostel_id,
        "inserted": len(docs),
        "skipped": len(errors),
        "errors": errors,
    }
