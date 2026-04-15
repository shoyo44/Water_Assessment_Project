# Aqua Campus Assessment

Aqua Campus is a full-stack smart water management project for hostel operations. It lets staff create hostel records, capture category-wise water usage, calculate efficiency metrics, review analytics, generate reuse suggestions, and export reports.

## What This Project Includes

- `front_end/`: Preact + Vite client application
- `back_end/`: FastAPI + MongoDB API service
- Firebase-based Google sign-in for the frontend and backend session validation
- PDF and Excel report export
- WebSocket-powered live dashboard refresh

## Main Features

- Hostel setup with name, location, blocks, floors, and student count
- Water consumption entry across bath, laundry, drinking, kitchen, and other categories
- Calculation engine for:
  - total consumption
  - per-student consumption
  - category split percentages
  - reuse potential
  - efficiency score
- Dashboard summary and chart endpoints
- Rule-based water reuse recommendations
- Downloadable `.pdf` and `.xlsx` reports

## Tech Stack

- Frontend: Preact, TypeScript, Vite, Firebase Web SDK
- Backend: FastAPI, Motor, Pydantic Settings, Firebase Admin SDK
- Database: MongoDB
- Reporting: ReportLab, OpenPyXL

## Project Structure

```text
assessment/
|-- front_end/
|   |-- src/
|   |-- public/
|   |-- package.json
|   `-- .env.example
|-- back_end/
|   |-- app/
|   |   |-- core/
|   |   |-- models/
|   |   `-- routers/
|   |-- requirements.txt
|   |-- .env.example
|   `-- firebase.env
|-- run_frontend.cmd
|-- run_backend.cmd
|-- run_all.cmd
`-- README.md
```

## Setup

### 1. Backend

From `back_end/`:

```powershell
pip install -r requirements.txt
Copy-Item .env.example .env
```

Set the required values in `back_end/.env`:

- `MONGODB_URI`
- `MONGODB_DB`
- `CORS_ORIGINS`
- `FIREBASE_SERVICE_ACCOUNT_PATH`

Start the API:

```powershell
uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

Health check:

```text
GET http://127.0.0.1:8000/health
```

### 2. Frontend

From `front_end/`:

```powershell
npm install
Copy-Item .env.example .env
```

Set the required values in `front_end/.env`:

- `VITE_API_BASE_URL`
- `VITE_FIREBASE_API_KEY`
- `VITE_FIREBASE_AUTH_DOMAIN`
- `VITE_FIREBASE_PROJECT_ID`
- `VITE_FIREBASE_STORAGE_BUCKET`
- `VITE_FIREBASE_MESSAGING_SENDER_ID`
- `VITE_FIREBASE_APP_ID`

Start the frontend:

```powershell
npm run dev
```

## Run Helpers

The repo also includes Windows helper scripts:

- `run_backend.cmd`
- `run_frontend.cmd`
- `run_all.cmd`
- `stop_dev_ports.cmd`
- `check_backend.cmd`

## API Overview

Base prefix: `/api/v1`

- `/auth/session`: validate Firebase-authenticated session
- `/hostels`: create hostel
- `/hostels/{hostel_id}/student-count`: save student count
- `/hostels/{hostel_id}/consumption`: add or list usage records
- `/calculations/run/{hostel_id}`: generate metrics
- `/calculations/{hostel_id}/latest`: fetch latest calculation
- `/dashboard/{hostel_id}/summary`: latest dashboard summary
- `/dashboard/ws/live?hostel_id=...`: live dashboard updates
- `/charts/{hostel_id}/daily`: daily usage series
- `/charts/{hostel_id}/weekly`: weekly usage series
- `/charts/{hostel_id}/category-breakdown`: category totals and percentages
- `/reuse/suggestions/{hostel_id}`: generate reuse recommendations
- `/reports/{hostel_id}.pdf`: export PDF report
- `/reports/{hostel_id}.xlsx`: export Excel report

## User Flow

1. Open the frontend app.
2. Sign in with Google.
3. Create a hostel and save student count.
4. Add water consumption records.
5. Run calculation.
6. Review dashboard, analytics, and reuse suggestions.
7. Export PDF or Excel reports.

## Notes

- The frontend defaults to `http://127.0.0.1:8000` in code if `VITE_API_BASE_URL` is missing.
- `front_end/.env.example` currently points to port `8001`, so make sure the frontend env matches the backend port you actually run.
- `back_end/firebase.env` and `serviceAccountKey.json` indicate Firebase credentials are expected locally and should be handled carefully.
