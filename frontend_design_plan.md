# Frontend Design Plan For Smart Water Management

Reference document: [backend_frontend_implementation_plan.md](backend_frontend_implementation_plan.md)

## 1. Product Direction

The frontend should feel like a campus operations dashboard for water intelligence. The goal is not just to show charts, but to help hostel administrators understand water usage, run calculations, identify waste, and download reports.

Recommended design theme:

**Aqua Campus Command Center**

The interface should be:

- Calm and clean like a sustainability product.
- Operational like a facility-management dashboard.
- Visual enough for quick understanding.
- Simple enough for non-technical hostel staff.
- Responsive for desktop and mobile.

## 2. Visual Style

### Color Palette

Use a light dashboard base with water-inspired accents.

```css
:root {
  --color-navy-950: #071a2c;
  --color-navy-900: #0b1f33;
  --color-blue-600: #0f8fbd;
  --color-aqua-500: #18a7c9;
  --color-teal-400: #2dd4bf;
  --color-mint-100: #e8fff8;
  --color-sky-50: #effaff;
  --color-slate-900: #102030;
  --color-slate-600: #5d7285;
  --color-slate-200: #d9e5ec;
  --color-slate-100: #eef5f8;
  --color-white: #ffffff;
  --color-amber-500: #f59e0b;
  --color-coral-500: #ef4444;
  --color-green-500: #22c55e;
}
```

### Background Direction

Use a soft, layered background:

- Base: `#f5f8fa`.
- Large faint radial aqua glow behind dashboard cards.
- Subtle wave or contour-line pattern in the hero/dashboard background.
- White cards with soft blue borders.

Avoid plain white-only pages because the product should feel tied to water and sustainability.

### Typography

Recommended font pair:

- Headings: `Sora` or `Space Grotesk`.
- Body: `Manrope` or `Plus Jakarta Sans`.

Typography usage:

- Large metric numbers should be bold and easy to scan.
- Labels should be compact and muted.
- Recommendation titles should feel actionable.

### Card Style

Cards should use:

- Border radius: `20px` to `28px`.
- Background: white or very light blue.
- Border: `1px solid rgba(15, 143, 189, 0.12)`.
- Shadow: soft, not heavy.
- Hover: slight lift and brighter border.

### Data Visualization Colors

Use consistent colors across charts:

- Bath: aqua blue `#18a7c9`
- Laundry: teal `#2dd4bf`
- Drinking: sky `#38bdf8`
- Kitchen: amber `#f59e0b`
- Other: slate `#94a3b8`

Priority colors:

- High: coral/red
- Medium: amber
- Low: teal/green

## 3. App Layout

### Desktop Layout

Use a fixed sidebar plus top header.

```text
+-------------------------------------------------------------+
| Sidebar | Top Bar: Hostel, Date, Live Status, Refresh       |
|         +---------------------------------------------------+
|         | Main Content                                      |
|         | Metric Cards                                      |
|         | Charts + Suggestions                              |
|         | Tables / Reports                                  |
+-------------------------------------------------------------+
```

Sidebar navigation:

- Dashboard
- Add Data
- Analytics
- Reuse Suggestions
- Reports
- Settings

Top bar:

- Current hostel name.
- Backend status indicator.
- Live WebSocket indicator.
- Run calculation button.
- Optional date range placeholder for future backend support.

### Mobile Layout

Use:

- Top app bar.
- Bottom navigation or drawer menu.
- Metric cards stacked vertically.
- Charts as full-width cards.
- Forms in single-column layout.

## 4. Screen Designs

## Screen 1: Startup And Health State

Backend dependency:

- `GET /health`

Purpose:

Confirm backend availability and show a friendly state if API is unavailable.

Layout:

- Centered product title.
- Backend status pill.
- "Start Setup" button when healthy.
- Error card when backend fails.

States:

- Loading: "Checking backend connection..."
- Success: "Backend connected"
- Failure: "Backend unavailable. Check server and MongoDB configuration."

## Screen 2: Hostel Setup

Backend dependencies:

- `POST /api/v1/hostels`
- `POST /api/v1/hostels/{hostel_id}/student-count`

Purpose:

Create the hostel context required by all other backend endpoints.

Layout:

```text
Page Title: Set Up Hostel

Left Card:
  Hostel name
  Location
  Blocks
  Floors

Right Card:
  Student count
  Effective date
  Setup progress

Footer Action:
  Save Hostel And Continue
```

Design notes:

- Show a progress stepper: Hostel Details -> Student Count -> Consumption.
- Use helpful microcopy: "This hostel ID powers dashboard, charts, reports, and suggestions."
- After success, store `hostelId`.

Validation:

- Name and location required.
- Blocks and floors must be positive.
- Student count must be greater than zero.

## Screen 3: Consumption Entry

Backend dependencies:

- `POST /api/v1/hostels/{hostel_id}/consumption`
- `GET /api/v1/hostels/{hostel_id}/consumption?limit=50`

Purpose:

Input water consumption by category and display recent entries.

Layout:

```text
Header:
  Add Water Consumption
  Selected Hostel

Main Form Card:
  Timestamp
  Bath liters
  Laundry liters
  Drinking liters
  Kitchen liters
  Other liters
  Total preview
  Submit button

Side Insight Card:
  Largest category preview
  Estimated total
  Next step prompt: Run calculation

Bottom:
  Recent consumption table
```

Design notes:

- Category inputs can use icons or colored chips.
- Total preview should update as the user types.
- After submit, refresh recent entries.

Recent table columns:

- Timestamp
- Bath
- Laundry
- Drinking
- Kitchen
- Other
- Total

## Screen 4: Dashboard

Backend dependencies:

- `POST /api/v1/calculations/run/{hostel_id}`
- `GET /api/v1/dashboard/{hostel_id}/summary`
- `WS /api/v1/dashboard/ws/live?hostel_id={hostel_id}`

Purpose:

Show the latest calculated performance summary.

Layout:

```text
Hero:
  "Water Intelligence Dashboard"
  Hostel name
  Last updated
  Live status
  Run Calculation button

Metric Cards:
  Total Consumption
  Per Student Usage
  Reuse Potential
  Efficiency Score

Main Grid:
  Daily Usage Chart
  Category Split Chart
  Reuse Opportunity Snapshot
  Recent Consumption Table
```

Metric card behavior:

- Total Consumption: liters, large number.
- Per Student Usage: liters/student.
- Reuse Potential: liters, highlighted in teal.
- Efficiency Score: circular gauge or progress ring.

Empty state:

If no calculation exists:

- Show "No calculation yet."
- Explain: "Add student count and consumption data, then run calculation."
- Provide direct button to Add Data.

WebSocket behavior:

- Connect only after `hostelId` is available.
- Show status: Live, Reconnecting, Offline.
- If WebSocket fails, fallback to manual refresh or polling.

## Screen 5: Analytics

Backend dependencies:

- `GET /api/v1/charts/{hostel_id}/daily?days=7`
- `GET /api/v1/charts/{hostel_id}/weekly?weeks=4`
- `GET /api/v1/charts/{hostel_id}/category-breakdown`

Purpose:

Give deeper chart-based analysis of water usage.

Layout:

```text
Top Controls:
  Days selector: 7 / 14 / 30
  Weeks selector: 4 / 8 / 12

Charts:
  Daily Usage Trend
  Weekly Usage Trend
  Category Breakdown
  Category Liters Table
```

Chart recommendations:

- Daily: line chart or vertical bar chart.
- Weekly: bar chart.
- Category breakdown: donut chart with legend.
- Category liters: compact table for exact numbers.

Empty state:

- "No chart data yet."
- "Add consumption records to unlock analytics."

## Screen 6: Reuse Suggestions

Backend dependency:

- `POST /api/v1/reuse/suggestions/{hostel_id}`

Purpose:

Generate and display water-saving actions.

Layout:

```text
Header:
  Reuse Suggestions
  Generate Suggestions button

Summary Card:
  Estimated Savings
  Source: Rules
  Generated at

Recommendation Cards:
  Priority badge
  Title
  Category
  Action text
  Estimated savings
```

Card style:

- High priority cards should have coral accent border.
- Medium priority cards should use amber accent.
- Low priority cards should use teal/green accent.

Suggested filters:

- All
- High
- Medium
- Low
- Bath
- Laundry
- Kitchen

Empty state:

- "Run calculation before generating reuse suggestions."

## Screen 7: Reports

Backend dependencies:

- `GET /api/v1/reports/{hostel_id}.xlsx`
- `GET /api/v1/reports/{hostel_id}.pdf`

Purpose:

Allow report downloads for administration and sharing.

Layout:

```text
Report Header:
  Hostel name
  Latest calculation timestamp

Download Cards:
  Excel Report
  PDF Report

Preview Summary:
  Total consumption
  Per-student usage
  Reuse potential
  Efficiency score
```

Design notes:

- Use two large download cards.
- Show file type icon, description, and download button.
- Disable downloads until calculation exists.

## 5. Core Components

Build reusable components around backend data.

### Navigation Components

- `AppShell`
- `Sidebar`
- `TopBar`
- `MobileNav`
- `BackendStatusPill`
- `LiveStatusPill`

### Form Components

- `HostelForm`
- `StudentCountForm`
- `ConsumptionForm`
- `NumberInputWithUnit`
- `DateTimeInput`
- `FormError`

### Dashboard Components

- `MetricCard`
- `EfficiencyGauge`
- `CategorySplitLegend`
- `LastUpdatedLabel`
- `RunCalculationButton`

### Chart Components

- `DailyUsageChart`
- `WeeklyUsageChart`
- `CategoryBreakdownChart`
- `ChartEmptyState`

### Reuse Components

- `SuggestionSummaryCard`
- `RecommendationCard`
- `PriorityBadge`
- `SavingsBadge`

### Report Components

- `ReportDownloadCard`
- `ReportPreview`

### State Components

- `LoadingCard`
- `EmptyState`
- `ErrorBanner`
- `SuccessToast`

## 6. API To UI Mapping

| Backend Endpoint | Frontend Screen | UI Output |
|---|---|---|
| `GET /health` | Startup / App shell | Backend connected indicator |
| `POST /api/v1/hostels` | Hostel Setup | Creates `hostelId` |
| `POST /api/v1/hostels/{hostel_id}/student-count` | Hostel Setup | Enables consumption/calculation flow |
| `POST /api/v1/hostels/{hostel_id}/consumption` | Consumption Entry | Saves water usage record |
| `GET /api/v1/hostels/{hostel_id}/consumption` | Consumption Entry / Dashboard | Recent records table |
| `POST /api/v1/calculations/run/{hostel_id}` | Dashboard | Updates dashboard metrics |
| `GET /api/v1/calculations/{hostel_id}/latest` | Dashboard / Reports | Latest calculation fallback |
| `GET /api/v1/dashboard/{hostel_id}/summary` | Dashboard | Metric cards |
| `WS /api/v1/dashboard/ws/live` | Dashboard | Live metric updates |
| `GET /api/v1/charts/{hostel_id}/daily` | Analytics | Daily chart |
| `GET /api/v1/charts/{hostel_id}/weekly` | Analytics | Weekly chart |
| `GET /api/v1/charts/{hostel_id}/category-breakdown` | Analytics | Category chart |
| `POST /api/v1/reuse/suggestions/{hostel_id}` | Reuse Suggestions | Recommendation cards |
| `GET /api/v1/reports/{hostel_id}.xlsx` | Reports | Excel download |
| `GET /api/v1/reports/{hostel_id}.pdf` | Reports | PDF download |

## 7. Frontend State Model

Recommended global state:

```ts
type AppState = {
  backendHealthy: boolean;
  hostelId: string | null;
  hostel: Hostel | null;
  hasStudentCount: boolean;
  hasConsumption: boolean;
  latestCalculation: CalculationResult | null;
  dashboardSummary: DashboardSummary | null;
  dailySeries: DailyPoint[];
  weeklySeries: WeeklyPoint[];
  categoryBreakdown: CategoryBreakdown | null;
  reuseSuggestions: ReuseSuggestionResponse | null;
  liveStatus: "connecting" | "live" | "reconnecting" | "offline";
};
```

Recommended local UI states:

- Form submission loading.
- Field validation errors.
- API error banners.
- Empty states for missing calculation/data.
- Toast messages after successful saves.

## 8. User Journey

Primary MVP journey:

1. User opens app.
2. App checks backend health.
3. User creates hostel.
4. User enters student count.
5. User adds consumption record.
6. User runs calculation.
7. User sees dashboard cards and charts.
8. User generates reuse suggestions.
9. User downloads PDF or Excel report.

This should be presented as a guided flow so the user never wonders what to do next.

## 9. Interaction Details

### Run Calculation

Button label:

- Default: `Run Calculation`
- After data changes: `Refresh Metrics`
- Loading: `Calculating...`

Behavior:

- Disabled without `hostelId`.
- Should show a helpful error if backend says student count or consumption is missing.
- After success, refresh dashboard summary, charts, and report availability.

### Generate Suggestions

Button label:

- Default: `Generate Suggestions`
- Loading: `Generating...`

Behavior:

- Disabled until calculation exists.
- After success, show suggestions immediately.

### Download Reports

Button labels:

- `Download Excel`
- `Download PDF`

Behavior:

- Disabled until calculation exists.
- Use browser download.
- Show error toast if backend returns missing calculation.

## 10. Empty And Error States

Use friendly messages tied to the workflow.

Examples:

- No hostel: "Create a hostel to start tracking water usage."
- No student count: "Add student count before running calculations."
- No consumption: "Add at least one consumption record to unlock analytics."
- No calculation: "Run calculation to populate dashboard metrics."
- Backend offline: "Backend is not reachable. Start FastAPI server and check MongoDB."
- WebSocket offline: "Live updates are paused. You can still refresh manually."

## 11. Responsive Behavior

Desktop:

- Sidebar visible.
- 4 metric cards in one row.
- Charts in 2-column grid.

Tablet:

- Sidebar collapses.
- 2 metric cards per row.
- Charts stacked or 2-column depending width.

Mobile:

- Bottom navigation.
- 1 metric card per row.
- Forms full width.
- Tables become cards or horizontally scrollable.

## 12. Recommended MVP Build Order

Build frontend in this order:

1. App shell, routing, theme, and layout.
2. Backend health check.
3. Hostel setup screen.
4. Student count form.
5. Consumption entry form and recent records table.
6. Run calculation action.
7. Dashboard metric cards.
8. Daily usage and category breakdown charts.
9. Reuse suggestions screen.
10. Report download screen.
11. Weekly chart.
12. WebSocket live updates.

## 13. Features To Avoid In First Version

Avoid these until backend support is added:

- Existing hostel selector from backend, because there is no hostel list endpoint yet.
- Multi-hostel comparison, because compare endpoint is not implemented.
- Date-filtered dashboard metrics, because calculations are currently all-time.
- AI-labeled suggestions, because current suggestion source is rule-based.
- Editing/deleting records, because update/delete APIs are not implemented.
- Authentication UI, because backend auth is not implemented.

## 14. Final Frontend Deliverable

The first complete frontend should include:

- A guided setup flow.
- A consumption input workflow.
- A dashboard with live-ready metric cards.
- Analytics charts using backend chart endpoints.
- Rule-based reuse suggestion cards.
- PDF and Excel report downloads.
- Helpful empty/error/loading states.
- Responsive design for desktop and mobile.

This gives the project a complete end-to-end demo using the backend that already exists, while leaving clear room for future features like AI suggestions, multi-hostel comparison, authentication, and date-range analytics.
