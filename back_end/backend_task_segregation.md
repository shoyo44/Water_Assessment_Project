# Backend Task Segregation (From Provided Sketch)

## 1) `.env` Review First

Current `.env` already has:
- Cloudflare Workers AI config (`CF_ACCOUNT_ID`, `CF_API_TOKEN`, `CF_MODEL`)
- MongoDB config (`MONGODB_URI`, `MONGODB_DB`, `MONGODB_COLLECTION`)

Backend implications:
- AI-based reuse suggestions can be implemented immediately.
- MongoDB persistence is available for input, calculations, and reports.
- A safe `.env.example` has been added for team onboarding without exposing secrets.

Security note:
- Existing secrets should be treated as sensitive credentials and rotated if they were shared publicly.

---

## 2) Backend-Only Tasks (Mapped to Your Image)

### Module A: Introduction Metadata
- Define project/domain metadata endpoint.
- Endpoint: `GET /api/v1/meta/project-overview`
- Purpose: serves app intro/title/description/config hints.

### Module B: Input Taking (I/P Taken)
- Capture number of students per hostel/building.
- Capture water consumption by category:
  - bath
  - laundry
  - drinking
  - kitchen
  - other (optional)
- Core endpoints:
  - `POST /api/v1/hostels`
  - `POST /api/v1/hostels/{hostel_id}/student-count`
  - `POST /api/v1/hostels/{hostel_id}/consumption`
  - `GET /api/v1/hostels/{hostel_id}/consumption`

### Module C: Calculation Part
- Implement backend calculation engine:
  - total consumption
  - per-student consumption
  - category-wise split
  - reuse-potential estimate
- Endpoint:
  - `POST /api/v1/calculations/run/{hostel_id}`
  - `GET /api/v1/calculations/{hostel_id}/latest`

### Module D: Result Part (Live Dashboard)
- Return aggregated results for dashboard cards.
- Support live updates via WebSocket/SSE.
- Endpoints:
  - `GET /api/v1/dashboard/{hostel_id}/summary`
  - `WS /api/v1/dashboard/ws/live`

### Module E: Bar Graph / Charts
- Serve chart-ready time-series data.
- Endpoints:
  - `GET /api/v1/charts/{hostel_id}/daily`
  - `GET /api/v1/charts/{hostel_id}/weekly`
  - `GET /api/v1/charts/{hostel_id}/category-breakdown`

### Module F: Reuse Suggestion
- Generate rule-based + AI suggestions:
  - where reuse is possible
  - expected water savings
  - priority actions
- Endpoint:
  - `POST /api/v1/reuse/suggestions/{hostel_id}`

### Module G: Multi-Hostel Usage Calculation
- Compare multiple hostels:
  - total usage
  - per-student usage
  - efficiency score
  - ranked list
- Endpoint:
  - `GET /api/v1/analysis/compare-hostels`

### Module H: Reports (Excel + PDF)
- Export reports for each hostel or comparison scope.
- Endpoints:
  - `GET /api/v1/reports/{hostel_id}.xlsx`
  - `GET /api/v1/reports/{hostel_id}.pdf`
  - `GET /api/v1/reports/compare-hostels.xlsx`

---

## 3) Suggested Data Models

- `hostels`
  - `id`, `name`, `location`, `building_count`, `created_at`
- `student_counts`
  - `hostel_id`, `count`, `effective_date`
- `consumption_records`
  - `hostel_id`, `timestamp`, `bath_l`, `laundry_l`, `drinking_l`, `kitchen_l`, `other_l`
- `calculation_results`
  - `hostel_id`, `total_l`, `per_student_l`, `reuse_potential_l`, `efficiency_score`, `computed_at`
- `reuse_suggestions`
  - `hostel_id`, `suggestions[]`, `estimated_savings_l`, `generated_at`, `source` (`rules`/`ai`)
- `report_jobs`
  - `hostel_id`, `type` (`pdf`/`xlsx`), `status`, `file_path`, `created_at`

---

## 4) Build Order (Backend First)

1. Input APIs + Mongo persistence (Modules A, B)
2. Calculation service (Module C)
3. Dashboard summary + live stream (Module D)
4. Chart endpoints (Module E)
5. Reuse suggestion service (Module F)
6. Multi-hostel comparison (Module G)
7. PDF/Excel exports (Module H)

---

## 5) MVP Definition

MVP backend is complete when:
- input can be saved for at least one hostel
- calculations run and persist
- dashboard summary endpoint responds
- at least one chart endpoint returns real data
- one reusable suggestion endpoint works
