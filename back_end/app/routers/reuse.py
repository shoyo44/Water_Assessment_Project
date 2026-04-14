from datetime import datetime, timezone

from bson import ObjectId
from fastapi import APIRouter, Depends, HTTPException, status
from motor.motor_asyncio import AsyncIOMotorDatabase

from app.core.database import get_db

router = APIRouter(prefix="/reuse", tags=["reuse"])


def now_utc() -> datetime:
    return datetime.now(timezone.utc)


def to_object_id(value: str) -> ObjectId:
    try:
        return ObjectId(value)
    except Exception as exc:  # pragma: no cover
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid ID format") from exc


async def ensure_hostel_exists(db: AsyncIOMotorDatabase, hostel_id: str) -> None:
    hostel = await db.hostels.find_one({"_id": to_object_id(hostel_id)}, {"_id": 1})
    if hostel is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Hostel not found")


def build_recommendations(category_split_pct: dict[str, float], total_l: float) -> tuple[list[dict], float]:
    recommendations: list[dict] = []
    estimated_savings_l = 0.0

    bath_pct = category_split_pct.get("bath", 0)
    laundry_pct = category_split_pct.get("laundry", 0)
    kitchen_pct = category_split_pct.get("kitchen", 0)
    drinking_pct = category_split_pct.get("drinking", 0)

    if bath_pct >= 35:
        save = total_l * 0.08
        estimated_savings_l += save
        recommendations.append(
            {
                "id": "reuse-bath-01",
                "priority": "high",
                "title": "Shower flow optimization",
                "category": "bath",
                "action": "Install low-flow shower heads and enforce timed shower windows in peak blocks.",
                "estimated_savings_l": round(save, 3),
            }
        )

    if laundry_pct >= 15:
        save = total_l * 0.06
        estimated_savings_l += save
        recommendations.append(
            {
                "id": "reuse-laundry-01",
                "priority": "high",
                "title": "Laundry greywater reuse",
                "category": "laundry",
                "action": "Route final-rinse discharge to filtration for toilet flushing and garden use.",
                "estimated_savings_l": round(save, 3),
            }
        )

    if kitchen_pct >= 10:
        save = total_l * 0.03
        estimated_savings_l += save
        recommendations.append(
            {
                "id": "reuse-kitchen-01",
                "priority": "medium",
                "title": "Kitchen rinse reuse loop",
                "category": "kitchen",
                "action": "Segregate pre-rinse and use for non-potable cleaning cycles.",
                "estimated_savings_l": round(save, 3),
            }
        )

    if drinking_pct > 20:
        recommendations.append(
            {
                "id": "reuse-drink-01",
                "priority": "medium",
                "title": "Drinking water anomaly check",
                "category": "drinking",
                "action": "Review RO reject ratio and bottle-filling leakage; drinking usage appears unusually high.",
                "estimated_savings_l": 0.0,
            }
        )

    if not recommendations:
        save = total_l * 0.02
        estimated_savings_l += save
        recommendations.append(
            {
                "id": "reuse-generic-01",
                "priority": "low",
                "title": "Baseline reuse controls",
                "category": "general",
                "action": "Add usage monitoring per block and enforce preventive leak audits every week.",
                "estimated_savings_l": round(save, 3),
            }
        )

    return recommendations, round(estimated_savings_l, 3)


@router.post("/suggestions/{hostel_id}")
async def generate_reuse_suggestions(
    hostel_id: str,
    db: AsyncIOMotorDatabase = Depends(get_db),
):
    await ensure_hostel_exists(db, hostel_id)

    latest_calc = await db.calculation_results.find_one({"hostel_id": hostel_id}, sort=[("computed_at", -1)])
    if latest_calc is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No calculation found. Run /api/v1/calculations/run/{hostel_id} first.",
        )

    total_l = float(latest_calc["total_l"])
    category_split_pct = latest_calc["category_split_pct"]
    recommendations, estimated_savings_l = build_recommendations(category_split_pct, total_l)

    response = {
        "hostel_id": hostel_id,
        "source": "rules",
        "estimated_savings_l": estimated_savings_l,
        "recommendations": recommendations,
        "generated_at": now_utc(),
        "reference_calculation_id": str(latest_calc["_id"]),
    }
    result = await db.reuse_suggestions.insert_one(response)
    response.pop("_id", None)
    response["id"] = str(result.inserted_id)
    return response
