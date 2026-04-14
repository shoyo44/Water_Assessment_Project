# Backend Implementation Plan And Frontend Handoff

## 1. Backend Purpose

The backend supports a Smart Water Management dashboard for hostels. It stores hostel details, student counts, water consumption entries, calculated usage metrics, chart-ready aggregates, reuse recommendations, report exports, and live dashboard updates.

The frontend should treat the backend as the source of truth for:

- Hostel creation and identification.
- Student count records.
- Category-wise water consumption input.
- Calculated dashboard metrics.
- Chart data.
- Reuse suggestions.
- PDF and Excel report downloads.
- Live dashboard updates through WebSocket.

## 2. Current Backend Stack

- Framework: FastAPI
- Database: MongoDB through Motor async client
- Validation: Pydantic v2
- Reports: OpenPyXL for Excel, ReportLab for PDF
- Runtime command: `uvicorn app.main:app --reload --port 8000`
- Base API prefix: `/api/v1`
- Health check: `GET /health`

Important local note: on this machine, `python` points to a broken Microsoft Store shim. Use `D:\anaconda3\python.exe` or fix PATH before running backend scripts.

## 3. Backend Workflow

### Step 1: Health Check

Frontend can call this during app startup or environment debugging.

```http
GET /health
```

Expected response:

```json
{
  "status": "ok",
  "service": "smart-water-backend"
}
```

### Step 2: Create Hostel

Creates a hostel and returns the `id` used by every other endpoint.

```http
POST /api/v1/hostels
```

Request:

```json
{
  "name": "Boys Hostel A",
  "location": "Main Campus",
  "blocks": 2,
  "floors": 4
}
```

Response:

```json
{
  "id": "mongo_object_id",
  "name": "Boys Hostel A",
  "location": "Main Campus",
  "blocks": 2,
  "floors": 4,
  "created_at": "2026-04-14T10:30:00Z"
}
```

Frontend needs:

- Hostel creation form.
- Store selected `hostel_id` in app state.
- Show validation messages for missing/invalid fields.

### Step 3: Add Student Count

Adds student count for a hostel. Calculations require this before running.

```http
POST /api/v1/hostels/{hostel_id}/student-count
```

Request:

```json
{
  "student_count": 420,
  "effective_date": "2026-04-14T00:00:00Z"
}
```

Frontend needs:

- Student count input field.
- Optional effective date picker.
- Disable calculation until student count exists.

### Step 4: Add Consumption Record

Adds category-wise water consumption for a hostel.

```http
POST /api/v1/hostels/{hostel_id}/consumption
```

Request:

```json
{
  "timestamp": "2026-04-14T10:30:00Z",
  "bath_l": 3200,
  "laundry_l": 1100,
  "drinking_l": 450,
  "kitchen_l": 700,
  "other_l": 120
}
```

Response includes calculated `total_l`.

Frontend needs:

- Consumption form with fields for bath, laundry, drinking, kitchen, and other.
- Date/time picker for timestamp.
- Client-side total preview is optional, but backend total is final.
- Prevent negative values.

### Step 5: Fetch Consumption History

Returns latest consumption records.

```http
GET /api/v1/hostels/{hostel_id}/consumption?limit=50
```

Frontend needs:

- Recent entries table.
- Optional limit selector.
- Use this for audit/history view.

### Step 6: Run Calculation

Calculates all-time total consumption and dashboard metrics.

```http
POST /api/v1/calculations/run/{hostel_id}
```

Response:

```json
{
  "id": "calculation_id",
  "hostel_id": "hostel_id",
  "total_l": 5570,
  "per_student_l": 13.262,
  "category_split_pct": {
    "bath": 57.45,
    "laundry": 19.75,
    "drinking": 8.08,
    "kitchen": 12.57,
    "other": 2.15
  },
  "reuse_potential_l": 1505,
  "efficiency_score": 94.7,
  "computed_at": "2026-04-14T10:40:00Z"
}
```

Frontend needs:

- "Run Calculation" or "Refresh Metrics" action.
- Loading state while calculation runs.
- Error state if student count or consumption is missing.

### Step 7: Dashboard Summary

Returns the latest calculated metrics for dashboard cards.

```http
GET /api/v1/dashboard/{hostel_id}/summary
```

Frontend needs dashboard cards for:

- Total consumption in liters.
- Per-student consumption.
- Reuse potential.
- Efficiency score.
- Category split.
- Last updated time.

### Step 8: Charts

Daily usage:

```http
GET /api/v1/charts/{hostel_id}/daily?days=7
```

Weekly usage:

```http
GET /api/v1/charts/{hostel_id}/weekly?weeks=4
```

Category breakdown:

```http
GET /api/v1/charts/{hostel_id}/category-breakdown
```

Frontend needs:

- Bar or line chart for daily usage.
- Bar chart for weekly usage.
- Donut/pie or stacked chart for category breakdown.
- Empty states when no consumption exists.

### Step 9: Reuse Suggestions

Generates rule-based reuse suggestions from latest calculation.

```http
POST /api/v1/reuse/suggestions/{hostel_id}
```

Response shape:

```json
{
  "hostel_id": "hostel_id",
  "source": "rules",
  "estimated_savings_l": 780,
  "recommendations": [
    {
      "id": "reuse-bath-01",
      "priority": "high",
      "title": "Shower flow optimization",
      "category": "bath",
      "action": "Install low-flow shower heads and enforce timed shower windows in peak blocks.",
      "estimated_savings_l": 445.6
    }
  ],
  "generated_at": "2026-04-14T10:42:00Z",
  "reference_calculation_id": "calculation_id",
  "id": "suggestion_id"
}
```

Frontend needs:

- Recommendation cards.
- Priority badges: high, medium, low.
- Savings summary.
- "Generate Suggestions" button after calculation exists.

### Step 10: Reports

Download Excel:

```http
GET /api/v1/reports/{hostel_id}.xlsx
```

Download PDF:

```http
GET /api/v1/reports/{hostel_id}.pdf
```

Frontend needs:

- Download buttons for Excel and PDF.
- Disable buttons until a calculation exists.
- Use browser file download behavior.

### Step 11: Live Dashboard WebSocket

Streams latest dashboard summary every 3 seconds.

```text
WS /api/v1/dashboard/ws/live?hostel_id={hostel_id}
```

Message shape:

```json
{
  "type": "dashboard_summary",
  "data": {
    "hostel_id": "hostel_id",
    "total_consumption_l": 5570,
    "per_student_l": 13.262,
    "reuse_potential_l": 1505,
    "efficiency_score": 94.7,
    "category_split_pct": {
      "bath": 57.45,
      "laundry": 19.75,
      "drinking": 8.08,
      "kitchen": 12.57,
      "other": 2.15
    },
    "last_updated_at": "2026-04-14T10:30:00+00:00"
  }
}
```

Frontend needs:

- WebSocket connection after `hostel_id` is selected.
- Reconnect handling.
- Display warning/error messages sent by backend.
- Fallback to normal `GET /summary` polling if WebSocket fails.

## 4. Suggested Frontend Screens

### Screen 1: Hostel Setup

Purpose: create/select hostel and enter student count.

Backend dependencies:

- `POST /api/v1/hostels`
- `POST /api/v1/hostels/{hostel_id}/student-count`

Required UI:

- Hostel name.
- Location.
- Blocks.
- Floors.
- Student count.
- Save/continue action.

### Screen 2: Consumption Entry

Purpose: collect water consumption by category.

Backend dependencies:

- `POST /api/v1/hostels/{hostel_id}/consumption`
- `GET /api/v1/hostels/{hostel_id}/consumption`

Required UI:

- Category inputs.
- Timestamp.
- Total preview.
- Recent submissions table.

### Screen 3: Dashboard

Purpose: show calculated metrics and live status.

Backend dependencies:

- `POST /api/v1/calculations/run/{hostel_id}`
- `GET /api/v1/dashboard/{hostel_id}/summary`
- `WS /api/v1/dashboard/ws/live?hostel_id={hostel_id}`

Required UI:

- Total water card.
- Per-student card.
- Reuse potential card.
- Efficiency score card.
- Last updated indicator.
- Refresh/run calculation button.

### Screen 4: Charts And Analytics

Purpose: visualize usage trends and category split.

Backend dependencies:

- `GET /api/v1/charts/{hostel_id}/daily?days=7`
- `GET /api/v1/charts/{hostel_id}/weekly?weeks=4`
- `GET /api/v1/charts/{hostel_id}/category-breakdown`

Required UI:

- Daily usage chart.
- Weekly usage chart.
- Category breakdown chart.
- Empty states.

### Screen 5: Reuse Suggestions

Purpose: show water-saving recommendations.

Backend dependencies:

- `POST /api/v1/reuse/suggestions/{hostel_id}`

Required UI:

- Suggestions list.
- Priority filters or badges.
- Estimated savings display.
- Category labels.

### Screen 6: Reports

Purpose: export PDF and Excel reports.

Backend dependencies:

- `GET /api/v1/reports/{hostel_id}.xlsx`
- `GET /api/v1/reports/{hostel_id}.pdf`

Required UI:

- Download Excel button.
- Download PDF button.
- Disabled state if no calculation exists.

## 5. Frontend Data State Requirements

Frontend should maintain:

- `hostelId`: selected or newly created hostel id.
- `hostel`: current hostel details.
- `hasStudentCount`: whether student count has been submitted.
- `hasConsumption`: whether at least one consumption record exists.
- `latestCalculation`: latest calculation response.
- `dashboardSummary`: summary response or WebSocket data.
- `chartData`: daily, weekly, and category data.
- `reuseSuggestions`: latest generated suggestions.
- `apiStatus`: loading, success, error states per feature.

## 6. Recommended Frontend Workflow

1. Check backend health with `GET /health`.
2. Create hostel.
3. Add student count.
4. Add one or more consumption records.
5. Run calculation.
6. Load dashboard summary.
7. Load charts.
8. Generate reuse suggestions.
9. Enable report downloads.
10. Connect WebSocket for live dashboard updates.

## 7. Backend Features Complete For Frontend Use

- Health endpoint.
- Hostel creation.
- Student count entry.
- Consumption entry.
- Consumption history.
- Calculation generation.
- Latest calculation fetch.
- Dashboard summary.
- Dashboard WebSocket stream.
- Daily chart data.
- Weekly chart data.
- Category breakdown data.
- Rule-based reuse suggestions.
- PDF report export.
- Excel report export.

## 8. Backend Features Still Needed Or Optional

These are mentioned in planning docs or `.env.example`, but are not fully implemented yet:

- Project metadata endpoint: `GET /api/v1/meta/project-overview`.
- Multi-hostel comparison endpoint: `GET /api/v1/analysis/compare-hostels`.
- Compare-hostels report: `GET /api/v1/reports/compare-hostels.xlsx`.
- AI-based reuse suggestions using Cloudflare Workers AI.
- Authentication and authorization.
- Date-range filters for dashboard calculations.
- Hostel listing endpoint for selecting existing hostels.
- Update/delete endpoints for hostel, student count, and consumption records.
- Strong startup MongoDB ping.

## 9. Items Backend Should Give Frontend

The frontend team needs these from backend before construction:

- Base URL, for example `http://127.0.0.1:8000`.
- API prefix, currently `/api/v1`.
- Confirmed `.env` values for CORS allowed frontend origins.
- Sample `hostel_id` from a successful create-hostel call.
- Final response contracts for all dashboard, chart, suggestion, and report endpoints.
- Error response examples for missing student count, missing consumption, invalid hostel id, and missing calculation.
- Decision on whether dashboard metrics are all-time or date-filtered.
- Decision on whether frontend should support multiple hostels now or only one hostel MVP.
- Decision on whether AI suggestions are required for the first frontend version.

## 10. Suggested MVP Frontend Scope

For the first working frontend, build this sequence:

1. Hostel setup form.
2. Student count form.
3. Consumption entry form.
4. Run calculation button.
5. Dashboard metric cards.
6. Daily and category charts.
7. Reuse suggestions panel.
8. PDF/XLSX report buttons.

After MVP:

- Add weekly analytics.
- Add WebSocket live refresh.
- Add multi-hostel comparison.
- Add AI-generated suggestions.
- Add authentication.

