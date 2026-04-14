import asyncio
from datetime import datetime

from bson import ObjectId
from fastapi import APIRouter, Depends, HTTPException, WebSocket, WebSocketDisconnect, status
from motor.motor_asyncio import AsyncIOMotorDatabase
from pymongo.errors import PyMongoError

from app.core.database import get_db, mongo_manager
from app.models.schemas import DashboardSummaryResponse

router = APIRouter(prefix="/dashboard", tags=["dashboard"])


def to_object_id(value: str) -> ObjectId:
    try:
        return ObjectId(value)
    except Exception as exc:  # pragma: no cover
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid ID format") from exc


def as_iso(value):
    if isinstance(value, datetime):
        return value.isoformat()
    return value


async def build_summary(db: AsyncIOMotorDatabase, hostel_id: str) -> DashboardSummaryResponse:
    hostel = await db.hostels.find_one({"_id": to_object_id(hostel_id)})
    if hostel is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Hostel not found")

    latest = await db.calculation_results.find_one({"hostel_id": hostel_id}, sort=[("computed_at", -1)])
    if latest is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No calculation found. Run /api/v1/calculations/run/{hostel_id} first.",
        )

    return DashboardSummaryResponse(
        hostel_id=hostel_id,
        total_consumption_l=latest["total_l"],
        per_student_l=latest["per_student_l"],
        reuse_potential_l=latest["reuse_potential_l"],
        efficiency_score=latest["efficiency_score"],
        category_split_pct=latest["category_split_pct"],
        last_updated_at=latest.get("last_updated_at"),
    )


@router.get("/{hostel_id}/summary", response_model=DashboardSummaryResponse)
async def get_dashboard_summary(
    hostel_id: str,
    db: AsyncIOMotorDatabase = Depends(get_db),
) -> DashboardSummaryResponse:
    return await build_summary(db, hostel_id)


@router.websocket("/ws/live")
async def websocket_live_dashboard(websocket: WebSocket):
    await websocket.accept()

    hostel_id = websocket.query_params.get("hostel_id")
    if not hostel_id:
        await websocket.send_json({"type": "error", "detail": "hostel_id query parameter is required"})
        await websocket.close(code=1008)
        return

    try:
        to_object_id(hostel_id)
    except HTTPException:
        await websocket.send_json({"type": "error", "detail": "Invalid hostel_id format"})
        await websocket.close(code=1008)
        return

    try:
        mongo_manager.ensure_client()
        if mongo_manager.db is None:
            await websocket.send_json(
                {"type": "error", "detail": "Database unavailable. Check MONGODB_URI/network and retry."}
            )
            await websocket.close(code=1011)
            return
        db = mongo_manager.db

        while True:
            try:
                summary = await build_summary(db, hostel_id)
                payload = summary.model_dump()
                payload["last_updated_at"] = as_iso(payload.get("last_updated_at"))
                await websocket.send_json({"type": "dashboard_summary", "data": payload})
            except HTTPException as exc:
                await websocket.send_json({"type": "warning", "status": exc.status_code, "detail": exc.detail})
            except PyMongoError as exc:
                await websocket.send_json({"type": "error", "detail": "Database read error", "error": str(exc)})
                await websocket.close(code=1011)
                return

            await asyncio.sleep(3)

    except WebSocketDisconnect:
        return
