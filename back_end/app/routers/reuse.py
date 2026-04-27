"""
Reuse suggestions router.

Primary path  → Cloudflare Workers AI  (source: "ai")
Fallback path → deterministic rules engine  (source: "rules")

The fallback activates automatically when:
  - Cloudflare credentials are not configured
  - The API call fails
  - The AI response cannot be parsed into valid recommendations
"""

from __future__ import annotations

import logging
from datetime import datetime, timezone

from bson import ObjectId
from fastapi import APIRouter, Depends, HTTPException, status
from motor.motor_asyncio import AsyncIOMotorDatabase

from app.core.database import get_db
from app.services.cloudflare import get_ai_recommendations

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/reuse", tags=["reuse"])


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def now_utc() -> datetime:
    return datetime.now(timezone.utc)


def to_object_id(value: str) -> ObjectId:
    try:
        return ObjectId(value)
    except Exception as exc:  # pragma: no cover
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid ID format") from exc


async def ensure_hostel_exists(db: AsyncIOMotorDatabase, hostel_id: str) -> dict:
    hostel = await db.hostels.find_one({"_id": to_object_id(hostel_id)})
    if hostel is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Hostel not found")
    return hostel


# ---------------------------------------------------------------------------
# Rules engine (deterministic fallback)
# ---------------------------------------------------------------------------

def build_rule_recommendations(
    category_split_pct: dict[str, float], total_l: float
) -> tuple[list[dict], float]:
    """
    Generate rule-based recommendations from category percentages.
    Returns (recommendations, estimated_savings_l).
    """
    recommendations: list[dict] = []
    estimated_savings_l = 0.0

    bath_pct = category_split_pct.get("bath", 0)
    laundry_pct = category_split_pct.get("laundry", 0)
    kitchen_pct = category_split_pct.get("kitchen", 0)
    other_pct = category_split_pct.get("other", 0)

    if bath_pct >= 35:
        save = round(total_l * 0.08, 3)
        estimated_savings_l += save
        recommendations.append({
            "id": "reuse-bath-01",
            "priority": "high",
            "title": "Shower flow optimization",
            "category": "bath",
            "action": (
                f"Bath accounts for {bath_pct:.1f}% of total usage ({total_l * bath_pct / 100:,.0f} L). "
                "Install low-flow shower heads and enforce timed shower windows in peak blocks."
            ),
            "estimated_savings_l": save,
        })

    if laundry_pct >= 15:
        save = round(total_l * 0.06, 3)
        estimated_savings_l += save
        recommendations.append({
            "id": "reuse-laundry-01",
            "priority": "high",
            "title": "Laundry greywater reuse",
            "category": "laundry",
            "action": (
                f"Laundry represents {laundry_pct:.1f}% ({total_l * laundry_pct / 100:,.0f} L). "
                "Route final-rinse discharge to filtration for toilet flushing and garden use."
            ),
            "estimated_savings_l": save,
        })

    if kitchen_pct >= 10:
        save = round(total_l * 0.03, 3)
        estimated_savings_l += save
        recommendations.append({
            "id": "reuse-kitchen-01",
            "priority": "medium",
            "title": "Kitchen rinse reuse loop",
            "category": "kitchen",
            "action": (
                f"Kitchen usage is {kitchen_pct:.1f}% ({total_l * kitchen_pct / 100:,.0f} L). "
                "Segregate pre-rinse water and use it for non-potable cleaning cycles."
            ),
            "estimated_savings_l": save,
        })

    if other_pct > 15:
        save = round(total_l * other_pct / 100 * 0.20, 3)
        estimated_savings_l += save
        recommendations.append({
            "id": "reuse-other-01",
            "priority": "low",
            "title": "Investigate unaccounted usage",
            "category": "other",
            "action": (
                f"'Other' category is {other_pct:.1f}% ({total_l * other_pct / 100:,.0f} L) — "
                "audit tap leaks and unmetered outlets to identify and eliminate hidden waste."
            ),
            "estimated_savings_l": save,
        })

    if not recommendations:
        save = round(total_l * 0.02, 3)
        estimated_savings_l += save
        recommendations.append({
            "id": "reuse-generic-01",
            "priority": "low",
            "title": "Baseline reuse controls",
            "category": "general",
            "action": (
                f"Overall usage of {total_l:,.0f} L is within normal range. "
                "Add per-block usage monitoring and schedule preventive leak audits every two weeks."
            ),
            "estimated_savings_l": save,
        })

    return recommendations, round(estimated_savings_l, 3)


# ---------------------------------------------------------------------------
# Endpoint
# ---------------------------------------------------------------------------

@router.post("/suggestions/{hostel_id}")
async def generate_reuse_suggestions(
    hostel_id: str,
    db: AsyncIOMotorDatabase = Depends(get_db),
):
    hostel = await ensure_hostel_exists(db, hostel_id)
    hostel_name: str = hostel.get("name", "Unknown Hostel")

    latest_calc = await db.calculation_results.find_one(
        {"hostel_id": hostel_id}, sort=[("computed_at", -1)]
    )
    if latest_calc is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No calculation found. Run /api/v1/calculations/run/{hostel_id} first.",
        )

    total_l = float(latest_calc["total_l"])
    per_student_l = float(latest_calc.get("per_student_l", 0))
    category_split_pct: dict[str, float] = latest_calc["category_split_pct"]
    reuse_potential_l = float(latest_calc.get("reuse_potential_l", 0))
    efficiency_score = float(latest_calc.get("efficiency_score", 0))

    # ── Try Cloudflare AI first ──────────────────────────────────────────
    source = "ai"
    recommendations = await get_ai_recommendations(
        hostel_name=hostel_name,
        total_l=total_l,
        per_student_l=per_student_l,
        category_split_pct=category_split_pct,
        reuse_potential_l=reuse_potential_l,
        efficiency_score=efficiency_score,
    )

    # ── Fall back to rules engine if AI unavailable / failed ────────────
    if recommendations is None:
        source = "rules"
        logger.info("Using rules engine for hostel %s", hostel_id)
        recommendations, estimated_savings_l = build_rule_recommendations(category_split_pct, total_l)
    else:
        estimated_savings_l = round(sum(r.get("estimated_savings_l", 0) for r in recommendations), 3)

    response = {
        "hostel_id": hostel_id,
        "source": source,
        "estimated_savings_l": estimated_savings_l,
        "recommendations": recommendations,
        "generated_at": now_utc(),
        "reference_calculation_id": str(latest_calc["_id"]),
        "hostel_name": hostel_name,
    }
    result = await db.reuse_suggestions.insert_one(response)
    response.pop("_id", None)
    response["id"] = str(result.inserted_id)
    return response
