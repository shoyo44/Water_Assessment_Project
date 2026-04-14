# Smart Water Backend (MVP)

FastAPI backend for hostel water input, calculations, and dashboard summary.

## 1) Setup

```powershell
cd D:\Projects\assessment\back_end
pip install -r requirements.txt
```

Create/verify `.env` with at least:
- `MONGODB_URI`
- `MONGODB_DB`

## 2) Run

```powershell
uvicorn app.main:app --reload --port 8000
```

Health:

```text
GET http://localhost:8000/health
```

## 3) MVP API Flow

1. Create hostel  
`POST /api/v1/hostels`

2. Add student count  
`POST /api/v1/hostels/{hostel_id}/student-count`

3. Add consumption record  
`POST /api/v1/hostels/{hostel_id}/consumption`

4. Run calculations  
`POST /api/v1/calculations/run/{hostel_id}`

5. Get dashboard summary  
`GET /api/v1/dashboard/{hostel_id}/summary`

6. Chart endpoints
- `GET /api/v1/charts/{hostel_id}/daily?days=7`
- `GET /api/v1/charts/{hostel_id}/weekly?weeks=4`
- `GET /api/v1/charts/{hostel_id}/category-breakdown`

7. Reuse suggestions
- `POST /api/v1/reuse/suggestions/{hostel_id}`

8. Report exports
- `GET /api/v1/reports/{hostel_id}.xlsx`
- `GET /api/v1/reports/{hostel_id}.pdf`

9. Live dashboard WebSocket
- `WS /api/v1/dashboard/ws/live?hostel_id={hostel_id}`

## 5) One-command smoke test

Run backend first, then:

```powershell
cd D:\Projects\assessment\back_end
powershell -ExecutionPolicy Bypass -File .\smoke_test.ps1 -BaseUrl http://127.0.0.1:8000
```

WebSocket quick check (after getting a valid `hostel_id` from smoke test/API):

```powershell
cd D:\Projects\assessment\back_end
python .\ws_smoke_test.py --base-url http://127.0.0.1:8000 --hostel-id <hostel_id> --messages 2
```

## 4) Example Payloads

Create hostel:

```json
{
  "name": "Boys Hostel A",
  "location": "Main Campus",
  "blocks": 2,
  "floors": 4
}
```

Student count:

```json
{
  "student_count": 420,
  "effective_date": "2026-04-14T00:00:00Z"
}
```

Consumption:

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
