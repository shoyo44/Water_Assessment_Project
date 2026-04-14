from datetime import datetime, timezone

from bson import ObjectId
from fastapi import APIRouter, Depends, HTTPException, status
from motor.motor_asyncio import AsyncIOMotorDatabase

from app.core.database import get_db
from app.models.schemas import CalculationResultResponse

router = APIRouter(prefix="/calculations", tags=["calculations"])


def now_utc() -> datetime:
    return datetime.now(timezone.utc)


def to_object_id(value: str) -> ObjectId:
    try:
        return ObjectId(value)
    except Exception as exc:  # pragma: no cover
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid ID format") from exc


async def get_latest_student_count(db: AsyncIOMotorDatabase, hostel_id: str) -> int:
    latest = await db.student_counts.find_one({"hostel_id": hostel_id}, sort=[("effective_date", -1)])
    if latest is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Student count missing for hostel. Add student count first.",
        )
    return int(latest["student_count"])


@router.post("/run/{hostel_id}", response_model=CalculationResultResponse)
async def run_calculation(
    hostel_id: str,
    db: AsyncIOMotorDatabase = Depends(get_db),
) -> CalculationResultResponse:
    hostel = await db.hostels.find_one({"_id": to_object_id(hostel_id)})
    if hostel is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Hostel not found")

    pipeline = [
        {"$match": {"hostel_id": hostel_id}},
        {
            "$group": {
                "_id": "$hostel_id",
                "total_l": {"$sum": "$total_l"},
                "bath_l": {"$sum": "$bath_l"},
                "laundry_l": {"$sum": "$laundry_l"},
                "drinking_l": {"$sum": "$drinking_l"},
                "kitchen_l": {"$sum": "$kitchen_l"},
                "other_l": {"$sum": "$other_l"},
                "last_updated_at": {"$max": "$timestamp"},
            }
        },
    ]
    agg = await db.consumption_records.aggregate(pipeline).to_list(length=1)
    if not agg:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Consumption data missing for hostel. Add consumption first.",
        )

    summary = agg[0]
    total_l = float(summary["total_l"])
    if total_l <= 0:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Total consumption cannot be zero.")

    student_count = await get_latest_student_count(db, hostel_id)
    per_student_l = round(total_l / student_count, 3)

    category_split_pct = {
        "bath": round(float(summary["bath_l"]) * 100 / total_l, 2),
        "laundry": round(float(summary["laundry_l"]) * 100 / total_l, 2),
        "drinking": round(float(summary["drinking_l"]) * 100 / total_l, 2),
        "kitchen": round(float(summary["kitchen_l"]) * 100 / total_l, 2),
        "other": round(float(summary["other_l"]) * 100 / total_l, 2),
    }

    reuse_potential_l = round((summary["bath_l"] + summary["laundry_l"]) * 0.35, 3)
    efficiency_score = max(0.0, min(100.0, round(100 - (per_student_l / 2.5), 2)))

    doc = {
        "hostel_id": hostel_id,
        "total_l": round(total_l, 3),
        "per_student_l": per_student_l,
        "category_split_pct": category_split_pct,
        "reuse_potential_l": reuse_potential_l,
        "efficiency_score": efficiency_score,
        "computed_at": now_utc(),
        "last_updated_at": summary.get("last_updated_at"),
    }
    result = await db.calculation_results.insert_one(doc)

    return CalculationResultResponse(id=str(result.inserted_id), **doc)


@router.get("/{hostel_id}/latest", response_model=CalculationResultResponse)
async def get_latest_calculation(
    hostel_id: str,
    db: AsyncIOMotorDatabase = Depends(get_db),
) -> CalculationResultResponse:
    _ = to_object_id(hostel_id)
    latest = await db.calculation_results.find_one({"hostel_id": hostel_id}, sort=[("computed_at", -1)])
    if latest is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="No calculation found for hostel.")

    return CalculationResultResponse(
        id=str(latest["_id"]),
        hostel_id=latest["hostel_id"],
        total_l=latest["total_l"],
        per_student_l=latest["per_student_l"],
        category_split_pct=latest["category_split_pct"],
        reuse_potential_l=latest["reuse_potential_l"],
        efficiency_score=latest["efficiency_score"],
        computed_at=latest["computed_at"],
    )

