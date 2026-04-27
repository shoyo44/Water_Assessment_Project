"""
Cloudflare Workers AI service.

Calls Cloudflare's REST AI API asynchronously using httpx.
Falls back gracefully when credentials are missing or the API call fails.
"""

from __future__ import annotations

import json
import logging
import re
from typing import Any

import httpx

from app.core.config import get_settings

logger = logging.getLogger(__name__)

_TIMEOUT = httpx.Timeout(60.0, connect=10.0)


def _build_prompt(
    hostel_name: str,
    total_l: float,
    per_student_l: float,
    category_split_pct: dict[str, float],
    reuse_potential_l: float,
    efficiency_score: float,
) -> str:
    """Build a concrete, data-rich prompt so the LLM gives varied, useful output."""
    category_lines = "\n".join(
        f"  - {cat.capitalize()}: {pct:.1f}%" for cat, pct in sorted(category_split_pct.items(), key=lambda x: -x[1])
    )
    return f"""You are a smart water management advisor for campus hostels in India.

Hostel name: {hostel_name}
Total water consumption (all time): {total_l:,.1f} L
Per-student usage: {per_student_l:.2f} L/student
Reuse potential: {reuse_potential_l:,.1f} L
Efficiency score: {efficiency_score:.1f}/100

Category breakdown:
{category_lines}

Based on this specific data, generate exactly 3 to 5 **actionable, data-specific** water-saving recommendations for this hostel.
Each recommendation must directly reference the numbers above (e.g. "your bath usage is X%...").

Respond ONLY with a valid JSON array. Each object must have these exact keys:
- "id": a short unique slug (e.g. "rec-bath-01")
- "priority": one of "high", "medium", or "low"
- "title": a short action title (max 8 words)
- "category": one of "bath", "laundry", "kitchen", "other", "general"
- "action": a concrete 1-2 sentence recommendation referencing the actual numbers
- "estimated_savings_l": estimated liters saved (as a number, not null)

Do not include any explanation, markdown, or text outside the JSON array."""


def _parse_ai_response(raw: str) -> list[dict[str, Any]]:
    """
    Robustly extract a JSON array from the LLM response.
    The model sometimes wraps it in markdown code fences or adds preamble text.
    """
    # Strip markdown fences if present
    cleaned = re.sub(r"```(?:json)?", "", raw).strip()
    # Find the first [...] block
    match = re.search(r"\[.*\]", cleaned, re.DOTALL)
    if not match:
        raise ValueError("No JSON array found in AI response")
    items = json.loads(match.group())
    if not isinstance(items, list) or not items:
        raise ValueError("Parsed JSON is not a non-empty list")

    validated: list[dict[str, Any]] = []
    required_keys = {"id", "priority", "title", "category", "action", "estimated_savings_l"}
    valid_priorities = {"high", "medium", "low"}
    valid_categories = {"bath", "laundry", "kitchen", "other", "general"}

    for i, item in enumerate(items):
        if not isinstance(item, dict):
            continue
        if not required_keys.issubset(item.keys()):
            logger.warning("AI item %d missing keys: %s", i, required_keys - item.keys())
            continue
        item["priority"] = item["priority"].lower() if item["priority"].lower() in valid_priorities else "medium"
        item["category"] = item["category"].lower() if item["category"].lower() in valid_categories else "general"
        try:
            item["estimated_savings_l"] = float(item["estimated_savings_l"] or 0)
        except (ValueError, TypeError):
            item["estimated_savings_l"] = 0.0
        validated.append(item)

    if not validated:
        raise ValueError("No valid recommendation objects parsed from AI response")
    return validated


async def get_ai_recommendations(
    hostel_name: str,
    total_l: float,
    per_student_l: float,
    category_split_pct: dict[str, float],
    reuse_potential_l: float,
    efficiency_score: float,
) -> list[dict[str, Any]] | None:
    """
    Call Cloudflare Workers AI and return parsed recommendations.
    Returns None on any failure so the caller can fall back to the rules engine.
    """
    settings = get_settings()

    if not settings.cf_configured:
        logger.info("Cloudflare AI not configured — falling back to rules engine")
        return None

    prompt = _build_prompt(
        hostel_name=hostel_name,
        total_l=total_l,
        per_student_l=per_student_l,
        category_split_pct=category_split_pct,
        reuse_potential_l=reuse_potential_l,
        efficiency_score=efficiency_score,
    )

    payload = {
        "messages": [
            {
                "role": "system",
                "content": (
                    "You are a water management AI assistant. "
                    "Always respond with a valid JSON array only — no markdown, no prose."
                ),
            },
            {"role": "user", "content": prompt},
        ],
        "max_tokens": 1024,
        "temperature": 0.7,
    }

    headers = {
        "Authorization": f"Bearer {settings.cf_api_token}",
        "Content-Type": "application/json",
    }

    try:
        async with httpx.AsyncClient(timeout=_TIMEOUT) as client:
            response = await client.post(settings.cf_api_url, json=payload, headers=headers)
            response.raise_for_status()
            data = response.json()

        # Cloudflare wraps the model output in data.result.response
        raw_text: str = data.get("result", {}).get("response", "")
        if not raw_text:
            logger.warning("Cloudflare AI returned empty response body: %s", data)
            return None

        recommendations = _parse_ai_response(raw_text)
        logger.info("Cloudflare AI returned %d recommendations", len(recommendations))
        return recommendations

    except httpx.HTTPStatusError as exc:
        logger.error("Cloudflare AI HTTP error %s: %s", exc.response.status_code, exc.response.text)
    except httpx.RequestError as exc:
        logger.error("Cloudflare AI request failed: %s", exc)
    except (ValueError, json.JSONDecodeError) as exc:
        logger.error("Cloudflare AI response parse error: %s", exc)
    except Exception as exc:  # pragma: no cover
        logger.error("Unexpected Cloudflare AI error: %s", exc)

    return None
