from datetime import datetime, timezone

from bson import ObjectId
from fastapi import APIRouter, Depends, HTTPException, Query, status
from motor.motor_asyncio import AsyncIOMotorDatabase

from app.core.database import get_db

router = APIRouter(prefix="/charts", tags=["charts"])


def to_object_id(value: str) -> ObjectId:
    try:
        return ObjectId(value)
    except Exception as exc:  # pragma: no cover
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid ID format") from exc


async def ensure_hostel_exists(db: AsyncIOMotorDatabase, hostel_id: str) -> None:
    hostel = await db.hostels.find_one({"_id": to_object_id(hostel_id)}, {"_id": 1})
    if hostel is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Hostel not found")


@router.get("/{hostel_id}/daily")
async def daily_usage(
    hostel_id: str,
    days: int = Query(default=14, ge=1, le=120),
    db: AsyncIOMotorDatabase = Depends(get_db),
):
    await ensure_hostel_exists(db, hostel_id)
    start = datetime.now(timezone.utc)
    start = start.replace(hour=0, minute=0, second=0, microsecond=0)
    # rough range start in Python to keep query simple
    from datetime import timedelta

    range_start = start - timedelta(days=days - 1)

    pipeline = [
        {"$match": {"hostel_id": hostel_id, "timestamp": {"$gte": range_start}}},
        {
            "$group": {
                "_id": {"$dateToString": {"format": "%Y-%m-%d", "date": "$timestamp"}},
                "total_l": {"$sum": "$total_l"},
            }
        },
        {"$sort": {"_id": 1}},
    ]
    items = await db.consumption_records.aggregate(pipeline).to_list(length=days + 5)
    return {"hostel_id": hostel_id, "days": days, "series": [{"date": i["_id"], "total_l": round(i["total_l"], 3)} for i in items]}


@router.get("/{hostel_id}/weekly")
async def weekly_usage(
    hostel_id: str,
    weeks: int = Query(default=8, ge=1, le=52),
    db: AsyncIOMotorDatabase = Depends(get_db),
):
    await ensure_hostel_exists(db, hostel_id)
    pipeline = [
        {"$match": {"hostel_id": hostel_id}},
        {
            "$group": {
                "_id": {
                    "year": {"$isoWeekYear": "$timestamp"},
                    "week": {"$isoWeek": "$timestamp"},
                },
                "total_l": {"$sum": "$total_l"},
            }
        },
        {"$sort": {"_id.year": -1, "_id.week": -1}},
        {"$limit": weeks},
        {"$sort": {"_id.year": 1, "_id.week": 1}},
    ]
    items = await db.consumption_records.aggregate(pipeline).to_list(length=weeks + 2)
    return {
        "hostel_id": hostel_id,
        "weeks": weeks,
        "series": [
            {"year": i["_id"]["year"], "week": i["_id"]["week"], "total_l": round(i["total_l"], 3)}
            for i in items
        ],
    }


@router.get("/{hostel_id}/category-breakdown")
async def category_breakdown(hostel_id: str, db: AsyncIOMotorDatabase = Depends(get_db)):
    await ensure_hostel_exists(db, hostel_id)
    pipeline = [
        {"$match": {"hostel_id": hostel_id}},
        {
            "$group": {
                "_id": "$hostel_id",
                "bath_l": {"$sum": "$bath_l"},
                "laundry_l": {"$sum": "$laundry_l"},
                "drinking_l": {"$sum": "$drinking_l"},
                "kitchen_l": {"$sum": "$kitchen_l"},
                "other_l": {"$sum": "$other_l"},
                "total_l": {"$sum": "$total_l"},
            }
        },
    ]
    agg = await db.consumption_records.aggregate(pipeline).to_list(length=1)
    if not agg:
        return {
            "hostel_id": hostel_id,
            "total_l": 0,
            "split_l": {"bath": 0, "laundry": 0, "drinking": 0, "kitchen": 0, "other": 0},
            "split_pct": {"bath": 0, "laundry": 0, "drinking": 0, "kitchen": 0, "other": 0},
        }
    row = agg[0]
    total = float(row["total_l"]) if row["total_l"] else 0.0
    split_l = {
        "bath": round(float(row["bath_l"]), 3),
        "laundry": round(float(row["laundry_l"]), 3),
        "drinking": round(float(row["drinking_l"]), 3),
        "kitchen": round(float(row["kitchen_l"]), 3),
        "other": round(float(row["other_l"]), 3),
    }
    if total <= 0:
        split_pct = {key: 0 for key in split_l}
    else:
        split_pct = {key: round(value * 100 / total, 2) for key, value in split_l.items()}
    return {"hostel_id": hostel_id, "total_l": round(total, 3), "split_l": split_l, "split_pct": split_pct}

