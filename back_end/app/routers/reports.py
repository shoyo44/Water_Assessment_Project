from datetime import datetime, timezone
from io import BytesIO

from bson import ObjectId
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import StreamingResponse
from motor.motor_asyncio import AsyncIOMotorDatabase
from openpyxl import Workbook
from reportlab.lib.pagesizes import A4
from reportlab.pdfgen import canvas

from app.core.database import get_db

router = APIRouter(prefix="/reports", tags=["reports"])


def to_object_id(value: str) -> ObjectId:
    try:
        return ObjectId(value)
    except Exception as exc:  # pragma: no cover
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid ID format") from exc


async def get_report_context(db: AsyncIOMotorDatabase, hostel_id: str):
    hostel = await db.hostels.find_one({"_id": to_object_id(hostel_id)})
    if hostel is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Hostel not found")

    latest_calc = await db.calculation_results.find_one({"hostel_id": hostel_id}, sort=[("computed_at", -1)])
    if latest_calc is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No calculation found. Run /api/v1/calculations/run/{hostel_id} first.",
        )
    return hostel, latest_calc


@router.get("/{hostel_id}.xlsx")
async def export_report_xlsx(hostel_id: str, db: AsyncIOMotorDatabase = Depends(get_db)):
    hostel, calc = await get_report_context(db, hostel_id)

    wb = Workbook()
    ws = wb.active
    ws.title = "Water Report"

    ws.append(["Smart Water Report"])
    ws.append(["Generated At (UTC)", datetime.now(timezone.utc).isoformat()])
    ws.append([])
    ws.append(["Hostel ID", hostel_id])
    ws.append(["Hostel Name", hostel.get("name", "")])
    ws.append(["Location", hostel.get("location", "")])
    ws.append([])
    ws.append(["Metric", "Value"])
    ws.append(["Total Consumption (L)", calc["total_l"]])
    ws.append(["Per Student (L)", calc["per_student_l"]])
    ws.append(["Reuse Potential (L)", calc["reuse_potential_l"]])
    ws.append(["Efficiency Score", calc["efficiency_score"]])
    ws.append([])
    ws.append(["Category", "Split (%)"])
    for k, v in calc["category_split_pct"].items():
        ws.append([k, v])

    output = BytesIO()
    wb.save(output)
    output.seek(0)

    filename = f"water_report_{hostel_id}.xlsx"
    return StreamingResponse(
        output,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


@router.get("/{hostel_id}.pdf")
async def export_report_pdf(hostel_id: str, db: AsyncIOMotorDatabase = Depends(get_db)):
    hostel, calc = await get_report_context(db, hostel_id)

    buffer = BytesIO()
    pdf = canvas.Canvas(buffer, pagesize=A4)
    w, h = A4

    y = h - 50
    pdf.setFont("Helvetica-Bold", 14)
    pdf.drawString(40, y, "Smart Water Management Report")
    y -= 24

    pdf.setFont("Helvetica", 10)
    pdf.drawString(40, y, f"Generated At (UTC): {datetime.now(timezone.utc).isoformat()}")
    y -= 24
    pdf.drawString(40, y, f"Hostel ID: {hostel_id}")
    y -= 16
    pdf.drawString(40, y, f"Hostel Name: {hostel.get('name', '')}")
    y -= 16
    pdf.drawString(40, y, f"Location: {hostel.get('location', '')}")
    y -= 24

    pdf.setFont("Helvetica-Bold", 11)
    pdf.drawString(40, y, "Key Metrics")
    y -= 18
    pdf.setFont("Helvetica", 10)
    pdf.drawString(50, y, f"Total Consumption (L): {calc['total_l']}")
    y -= 14
    pdf.drawString(50, y, f"Per Student (L): {calc['per_student_l']}")
    y -= 14
    pdf.drawString(50, y, f"Reuse Potential (L): {calc['reuse_potential_l']}")
    y -= 14
    pdf.drawString(50, y, f"Efficiency Score: {calc['efficiency_score']}")
    y -= 22

    pdf.setFont("Helvetica-Bold", 11)
    pdf.drawString(40, y, "Category Split (%)")
    y -= 18
    pdf.setFont("Helvetica", 10)
    for key, value in calc["category_split_pct"].items():
        pdf.drawString(50, y, f"{key}: {value}%")
        y -= 14
        if y < 60:
            pdf.showPage()
            pdf.setFont("Helvetica", 10)
            y = h - 50

    pdf.save()
    buffer.seek(0)

    filename = f"water_report_{hostel_id}.pdf"
    return StreamingResponse(
        buffer,
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )

