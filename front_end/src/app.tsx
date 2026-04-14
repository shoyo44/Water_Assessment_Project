import { useEffect, useMemo, useState } from 'preact/hooks'
import {
  isFirebaseConfigured,
  listenToAuth,
  getFirebaseIdToken,
  loginWithGoogle,
  logout,
  type AuthUser,
} from './firebase'
import './app.css'

type AppStage = 'intro' | 'login' | 'app'
type View = 'setup' | 'entry' | 'dashboard' | 'analytics' | 'reuse' | 'reports'
type ApiStatus = 'checking' | 'online' | 'offline'
type LiveStatus = 'idle' | 'connecting' | 'live' | 'offline'

type Hostel = {
  id: string
  name: string
  location: string
  blocks: number
  floors: number
  created_at: string
}

type ConsumptionRecord = {
  id: string
  hostel_id: string
  timestamp: string
  bath_l: number
  laundry_l: number
  drinking_l: number
  kitchen_l: number
  other_l: number
  total_l: number
  created_at: string
}

type DashboardSummary = {
  hostel_id: string
  total_consumption_l: number
  per_student_l: number
  reuse_potential_l: number
  efficiency_score: number
  category_split_pct: Record<string, number>
  last_updated_at: string | null
}

type CalculationResult = {
  id: string
  hostel_id: string
  total_l: number
  per_student_l: number
  category_split_pct: Record<string, number>
  reuse_potential_l: number
  efficiency_score: number
  computed_at: string
}

type DailyPoint = {
  date: string
  total_l: number
}

type WeeklyPoint = {
  year: number
  week: number
  total_l: number
}

type CategoryBreakdown = {
  total_l: number
  split_l: Record<string, number>
  split_pct: Record<string, number>
}

type Recommendation = {
  id: string
  priority: 'high' | 'medium' | 'low'
  title: string
  category: string
  action: string
  estimated_savings_l: number
}

type ReuseResponse = {
  source: string
  estimated_savings_l: number
  generated_at: string
  recommendations: Recommendation[]
}

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000'
const API_PREFIX = '/api/v1'

const navItems: Array<{ id: View; label: string; eyebrow: string }> = [
  { id: 'setup', label: 'Setup', eyebrow: 'Hostel' },
  { id: 'entry', label: 'Add Data', eyebrow: 'Input' },
  { id: 'dashboard', label: 'Dashboard', eyebrow: 'Live' },
  { id: 'analytics', label: 'Analytics', eyebrow: 'Charts' },
  { id: 'reuse', label: 'Reuse', eyebrow: 'Savings' },
  { id: 'reports', label: 'Reports', eyebrow: 'Export' },
]

const categoryLabels = {
  bath: 'Bath',
  laundry: 'Laundry',
  drinking: 'Drinking',
  kitchen: 'Kitchen',
  other: 'Other',
}

async function apiRequest<T>(path: string, options?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE}${path}`, {
    headers: { 'Content-Type': 'application/json', ...options?.headers },
    ...options,
  })

  if (!response.ok) {
    const errorBody = await response.json().catch(() => null)
    throw new Error(errorBody?.detail || `Request failed with status ${response.status}`)
  }

  return response.json() as Promise<T>
}

async function apiRequestWithToken<T>(path: string, token: string, options?: RequestInit): Promise<T> {
  return apiRequest<T>(path, {
    ...options,
    headers: {
      Authorization: `Bearer ${token}`,
      ...options?.headers,
    },
  })
}

function formatLiters(value?: number) {
  if (value === undefined || Number.isNaN(value)) return '0 L'
  return `${Math.round(value).toLocaleString()} L`
}

function formatNumber(value?: number) {
  if (value === undefined || Number.isNaN(value)) return '0'
  return value.toLocaleString(undefined, { maximumFractionDigits: 2 })
}

function formatDate(value?: string | null) {
  if (!value) return 'Not updated yet'
  return new Date(value).toLocaleString()
}

function toDateTimeLocal(date = new Date()) {
  const offset = date.getTimezoneOffset() * 60000
  return new Date(date.getTime() - offset).toISOString().slice(0, 16)
}

export function App() {
  const [stage, setStage] = useState<AppStage>('intro')
  const [view, setView] = useState<View>('setup')
  const [user, setUser] = useState<AuthUser | null>(null)
  const [authReady, setAuthReady] = useState(false)
  const [authError, setAuthError] = useState('')
  const [apiStatus, setApiStatus] = useState<ApiStatus>('checking')
  const [liveStatus, setLiveStatus] = useState<LiveStatus>('idle')
  const [hostel, setHostel] = useState<Hostel | null>(null)
  const [hasStudentCount, setHasStudentCount] = useState(false)
  const [records, setRecords] = useState<ConsumptionRecord[]>([])
  const [summary, setSummary] = useState<DashboardSummary | null>(null)
  const [calculation, setCalculation] = useState<CalculationResult | null>(null)
  const [dailySeries, setDailySeries] = useState<DailyPoint[]>([])
  const [weeklySeries, setWeeklySeries] = useState<WeeklyPoint[]>([])
  const [categoryBreakdown, setCategoryBreakdown] = useState<CategoryBreakdown | null>(null)
  const [reuse, setReuse] = useState<ReuseResponse | null>(null)
  const [notice, setNotice] = useState('Create a hostel to start tracking water usage.')
  const [loadingAction, setLoadingAction] = useState('')

  const hasConsumption = records.length > 0
  const canCalculate = Boolean(hostel?.id && hasStudentCount && hasConsumption)
  const canUseCalculatedFeatures = Boolean(hostel?.id && (summary || calculation))

  useEffect(() => {
    checkHealth()
  }, [])

  useEffect(() => {
    const unsubscribe = listenToAuth((nextUser) => {
      setUser(nextUser)
      setAuthReady(true)
    })

    return unsubscribe
  }, [])

  useEffect(() => {
    if (!hostel?.id) return

    setHasStudentCount(true)
    setRecords([])
    setSummary(null)
    setCalculation(null)
    setDailySeries([])
    setWeeklySeries([])
    setCategoryBreakdown(null)
    setReuse(null)

    void refreshRecords(hostel.id)
  }, [hostel?.id])

  useEffect(() => {
    if (!hostel?.id || view !== 'dashboard') {
      setLiveStatus(hostel?.id ? 'idle' : 'offline')
      return
    }

    setLiveStatus('connecting')
    const wsBase = API_BASE.replace('https://', 'wss://').replace('http://', 'ws://')
    const socket = new WebSocket(`${wsBase}${API_PREFIX}/dashboard/ws/live?hostel_id=${hostel.id}`)

    socket.onopen = () => setLiveStatus('live')
    socket.onerror = () => setLiveStatus('offline')
    socket.onclose = () => setLiveStatus('offline')
    socket.onmessage = (event) => {
      const payload = JSON.parse(event.data)
      if (payload.type === 'dashboard_summary') {
        setSummary(payload.data)
      }
      if (payload.type === 'warning') {
        setNotice(payload.detail)
      }
    }

    return () => socket.close()
  }, [hostel?.id, view])

  const totalPreview = useMemo(
    () => records.reduce((sum, item) => sum + item.total_l, 0),
    [records],
  )

  async function checkHealth() {
    setApiStatus('checking')
    try {
      await apiRequest<{ status: string }>('/health')
      setApiStatus('online')
      setNotice('System is ready. Continue with hostel setup.')
    } catch (error) {
      setApiStatus('offline')
      setNotice(error instanceof Error ? error.message : 'Service is temporarily unavailable.')
    }
  }

  async function handleGoogleLogin() {
    setAuthError('')
    try {
      const nextUser = await loginWithGoogle()
      const token = await getFirebaseIdToken()
      await apiRequestWithToken(`${API_PREFIX}/auth/session`, token, { method: 'GET' })
      setUser(nextUser)
      setStage('app')
      setNotice('Signed in successfully. Continue with hostel setup.')
    } catch (error) {
      setAuthError(error instanceof Error ? error.message : 'Google sign-in failed.')
    }
  }

  async function handleLogout() {
    await logout()
    setUser(null)
    setStage('login')
    setNotice('Signed out. Login again to access dashboard features.')
  }

  async function refreshRecords(hostelId = hostel?.id) {
    if (!hostelId) return
    const data = await apiRequest<ConsumptionRecord[]>(`${API_PREFIX}/hostels/${hostelId}/consumption?limit=50`)
    setRecords(data)
  }

  async function refreshDashboard(hostelId = hostel?.id) {
    if (!hostelId) return
    const data = await apiRequest<DashboardSummary>(`${API_PREFIX}/dashboard/${hostelId}/summary`)
    setSummary(data)
  }

  async function refreshCharts(hostelId = hostel?.id) {
    if (!hostelId) return
    const [daily, weekly, category] = await Promise.all([
      apiRequest<{ series: DailyPoint[] }>(`${API_PREFIX}/charts/${hostelId}/daily?days=7`),
      apiRequest<{ series: WeeklyPoint[] }>(`${API_PREFIX}/charts/${hostelId}/weekly?weeks=4`),
      apiRequest<CategoryBreakdown>(`${API_PREFIX}/charts/${hostelId}/category-breakdown`),
    ])
    setDailySeries(daily.series)
    setWeeklySeries(weekly.series)
    setCategoryBreakdown(category)
  }

  async function createHostel(event: Event) {
    event.preventDefault()
    const form = new FormData(event.currentTarget as HTMLFormElement)
    setLoadingAction('setup')
    try {
      const created = await apiRequest<Hostel>(`${API_PREFIX}/hostels`, {
        method: 'POST',
        body: JSON.stringify({
          name: form.get('name'),
          location: form.get('location'),
          blocks: Number(form.get('blocks')),
          floors: Number(form.get('floors')),
        }),
      })

      await apiRequest(`${API_PREFIX}/hostels/${created.id}/student-count`, {
        method: 'POST',
        body: JSON.stringify({
          student_count: Number(form.get('student_count')),
          effective_date: new Date(String(form.get('effective_date'))).toISOString(),
        }),
      })

      setHostel(created)
      setHasStudentCount(true)
      setNotice('Hostel setup saved. Add consumption data next.')
      setView('entry')
    } catch (error) {
      setNotice(error instanceof Error ? error.message : 'Could not save hostel setup.')
    } finally {
      setLoadingAction('')
    }
  }

  async function addConsumption(event: Event) {
    event.preventDefault()
    if (!hostel?.id) {
      setNotice('Create a hostel before adding consumption.')
      return
    }

    const form = new FormData(event.currentTarget as HTMLFormElement)
    setLoadingAction('consumption')
    try {
      await apiRequest(`${API_PREFIX}/hostels/${hostel.id}/consumption`, {
        method: 'POST',
        body: JSON.stringify({
          timestamp: new Date(String(form.get('timestamp'))).toISOString(),
          bath_l: Number(form.get('bath_l')),
          laundry_l: Number(form.get('laundry_l')),
          drinking_l: Number(form.get('drinking_l')),
          kitchen_l: Number(form.get('kitchen_l')),
          other_l: Number(form.get('other_l')),
        }),
      })
      await refreshRecords(hostel.id)
      setNotice('Consumption record added. Run calculation when ready.')
      ;(event.currentTarget as HTMLFormElement).reset()
    } catch (error) {
      setNotice(error instanceof Error ? error.message : 'Could not add consumption record.')
    } finally {
      setLoadingAction('')
    }
  }

  async function runCalculation() {
    if (!hostel?.id) return
    setLoadingAction('calculation')
    try {
      const data = await apiRequest<CalculationResult>(`${API_PREFIX}/calculations/run/${hostel.id}`, {
        method: 'POST',
      })
      setCalculation(data)
      await Promise.all([refreshDashboard(hostel.id), refreshCharts(hostel.id)])
      setNotice('Calculation complete. Dashboard, analytics, and reports are ready.')
      setView('dashboard')
    } catch (error) {
      setNotice(error instanceof Error ? error.message : 'Could not run calculation.')
    } finally {
      setLoadingAction('')
    }
  }

  async function generateReuseSuggestions() {
    if (!hostel?.id) return
    setLoadingAction('reuse')
    try {
      const data = await apiRequest<ReuseResponse>(`${API_PREFIX}/reuse/suggestions/${hostel.id}`, {
        method: 'POST',
      })
      setReuse(data)
      setNotice('Reuse suggestions generated.')
    } catch (error) {
      setNotice(error instanceof Error ? error.message : 'Could not generate reuse suggestions.')
    } finally {
      setLoadingAction('')
    }
  }

  function downloadReport(type: 'pdf' | 'xlsx') {
    if (!hostel?.id) return
    window.location.href = `${API_BASE}${API_PREFIX}/reports/${hostel.id}.${type}`
  }

  if (!authReady) {
    return <LoadingPage />
  }

  if (stage === 'intro') {
    return (
      <IntroPage
        onNext={() => setStage(user ? 'app' : 'login')}
      />
    )
  }

  if (stage === 'login' || !user) {
    return (
      <LoginPage
        apiStatus={apiStatus}
        authError={authError}
        isConfigured={isFirebaseConfigured}
        onBack={() => setStage('intro')}
        onLogin={handleGoogleLogin}
      />
    )
  }

  return (
    <div class="app-shell">
      <aside class="sidebar">
        <div class="brand-mark">
          <span class="brand-icon">A</span>
          <div>
            <strong>Aqua Campus</strong>
            <small>Water intelligence</small>
          </div>
        </div>

        <nav class="nav-list" aria-label="Main navigation">
          {navItems.map((item) => (
            <button
              class={view === item.id ? 'nav-item active' : 'nav-item'}
              key={item.id}
              onClick={() => setView(item.id)}
              type="button"
            >
              <span>{item.eyebrow}</span>
              {item.label}
            </button>
          ))}
        </nav>

        <div class="sidebar-card">
          <span class="card-kicker">Signed in</span>
          <p>{user.displayName || user.email}</p>
        </div>
      </aside>

      <main class="main-panel">
        <header class="topbar">
          <div>
            <p class="eyebrow">Smart Water Management</p>
            <h1>{hostel?.name || 'Aqua Campus Command Center'}</h1>
          </div>

          <div class="topbar-actions">
            <UserChip user={user} />
            <span class={`live-pill ${liveStatus}`}>Live updates {liveStatus === 'live' ? 'active' : 'ready'}</span>
            <button
              class="primary-button"
              disabled={!canCalculate || loadingAction === 'calculation'}
              onClick={runCalculation}
              type="button"
            >
              {loadingAction === 'calculation' ? 'Calculating...' : 'Run Calculation'}
            </button>
            <button class="ghost-button" onClick={handleLogout} type="button">
              Sign Out
            </button>
          </div>
        </header>

        <div class={apiStatus === 'offline' ? 'notice danger' : 'notice'}>{notice}</div>

        {view === 'setup' && (
          <SetupScreen isLoading={loadingAction === 'setup'} onSubmit={createHostel} />
        )}
        {view === 'entry' && (
          <EntryScreen
            hostel={hostel}
            records={records}
            totalPreview={totalPreview}
            isLoading={loadingAction === 'consumption'}
            onSubmit={addConsumption}
            onRunCalculation={runCalculation}
            canCalculate={canCalculate}
          />
        )}
        {view === 'dashboard' && (
          <DashboardScreen
            summary={summary}
            records={records}
            canCalculate={canCalculate}
            onRunCalculation={runCalculation}
          />
        )}
        {view === 'analytics' && (
          <AnalyticsScreen
            categoryBreakdown={categoryBreakdown}
            dailySeries={dailySeries}
            weeklySeries={weeklySeries}
          />
        )}
        {view === 'reuse' && (
          <ReuseScreen
            canGenerate={canUseCalculatedFeatures}
            isLoading={loadingAction === 'reuse'}
            reuse={reuse}
            onGenerate={generateReuseSuggestions}
          />
        )}
        {view === 'reports' && (
          <ReportsScreen
            canDownload={canUseCalculatedFeatures}
            summary={summary}
            onDownload={downloadReport}
          />
        )}
      </main>
    </div>
  )
}

function LoadingPage() {
  return (
    <section class="public-page">
      <div class="public-card compact-public-card">
        <span class="water-orb" />
        <p class="eyebrow">Loading</p>
        <h1>Preparing Aqua Campus</h1>
      </div>
    </section>
  )
}

function IntroPage({ onNext }: { onNext: () => void }) {
  return (
    <section class="public-page">
      <div class="landing-hero">
        <div class="landing-copy">
          <p class="eyebrow">Campus water intelligence</p>
          <h2>Track, calculate, and reduce hostel water usage from one dashboard.</h2>
          <p>
            Aqua Campus helps hostel administrators capture daily water consumption, calculate
            per-student usage, visualize trends, discover reuse opportunities, and export reports
            for review.
          </p>
          <div class="landing-actions">
            <button class="primary-button" onClick={onNext} type="button">
              Get Started
            </button>
          </div>
        </div>
        <div class="water-dashboard-preview" aria-label="Dashboard preview">
          <div class="preview-card large">
            <span>Total Water</span>
            <strong>1,500 L</strong>
          </div>
          <div class="preview-card">
            <span>Reuse Potential</span>
            <strong>406 L</strong>
          </div>
          <div class="preview-card">
            <span>Efficiency</span>
            <strong>95%</strong>
          </div>
          <div class="preview-bars">
            <span style={{ height: '78%' }} />
            <span style={{ height: '46%' }} />
            <span style={{ height: '32%' }} />
            <span style={{ height: '54%' }} />
            <span style={{ height: '24%' }} />
          </div>
        </div>
      </div>

      <div class="feature-grid">
        <FeatureCard
          label="Input"
          title="Capture hostel usage"
          text="Create a hostel, enter student count, and record category-wise water consumption."
        />
        <FeatureCard
          label="Calculate"
          title="Turn data into metrics"
          text="Generate total usage, per-student usage, category split, reuse potential, and efficiency score."
        />
        <FeatureCard
          label="Analyze"
          title="Understand water patterns"
          text="Use daily, weekly, and category charts to quickly identify where water is being used."
        />
        <FeatureCard
          label="Improve"
          title="Get reuse suggestions"
          text="Receive rule-based recommendations for shower optimization, laundry reuse, kitchen loops, and audits."
        />
      </div>

      <div class="workflow-panel">
        <div>
          <p class="eyebrow">How it works</p>
          <h2>One guided flow from data entry to report export.</h2>
        </div>
        <ol>
          <li>Create hostel and add student count.</li>
          <li>Add bath, laundry, drinking, kitchen, and other consumption.</li>
          <li>Run smart calculations to unlock dashboard metrics.</li>
          <li>Review charts, generate reuse suggestions, and download PDF or Excel reports.</li>
        </ol>
      </div>
    </section>
  )
}

function LoginPage({
  apiStatus,
  authError,
  isConfigured,
  onBack,
  onLogin,
}: {
  apiStatus: ApiStatus
  authError: string
  isConfigured: boolean
  onBack: () => void
  onLogin: () => void
}) {
  return (
    <section class="public-page login-page">
      <div class="login-art">
        <p class="eyebrow">Secure access</p>
        <h1>Login with Google to enter the water dashboard.</h1>
        <p>
          Authentication keeps hostel data entry, dashboards, reuse suggestions, and report exports
          behind a signed-in session.
        </p>
        <div class="login-steps">
          <span>1. Read project overview</span>
          <span>2. Sign in with Google</span>
          <span>3. Open main dashboard features</span>
        </div>
      </div>

      <div class="login-card">
        <span class="brand-icon">A</span>
        <h2>Welcome back</h2>
        <p>Use your Google account to continue to Aqua Campus Command Center.</p>

        {!isConfigured && (
          <div class="notice danger">
            Firebase is not configured yet. Copy <code>front_end/.env.example</code> to
            <code> front_end/.env</code> and add your Firebase web app values.
          </div>
        )}

        {authError && <div class="notice danger">{authError}</div>}
        {apiStatus === 'offline' && (
          <div class="notice danger">
            The service is temporarily unavailable. Please try again after starting the app server.
          </div>
        )}

        <button class="google-button" disabled={!isConfigured} onClick={onLogin} type="button">
          <span>G</span>
          Continue with Google
        </button>

        <div class="login-actions">
          <button class="ghost-button" onClick={onBack} type="button">
            Back To Intro
          </button>
        </div>
      </div>
    </section>
  )
}

function UserChip({ user }: { user: AuthUser }) {
  return (
    <span class="user-chip">
      {user.photoURL ? <img src={user.photoURL} alt="" /> : <span>{(user.displayName || user.email || 'U')[0]}</span>}
      {user.displayName || user.email}
    </span>
  )
}

function FeatureCard({ label, title, text }: { label: string; title: string; text: string }) {
  return (
    <article class="feature-card">
      <span>{label}</span>
      <h3>{title}</h3>
      <p>{text}</p>
    </article>
  )
}

function SetupScreen({
  isLoading,
  onSubmit,
}: {
  isLoading: boolean
  onSubmit: (event: Event) => void
}) {
  return (
    <section class="screen-grid setup-grid">
      <div class="hero-card">
        <p class="eyebrow">Step 1</p>
        <h2>Set up the hostel context</h2>
        <p>
          This creates the hostel ID used by consumption inputs, dashboard summaries, charts,
          reuse recommendations, and reports.
        </p>
        <div class="stepper">
          <span class="complete">Hostel details</span>
          <span>Student count</span>
          <span>Consumption</span>
          <span>Reports</span>
        </div>
      </div>

      <form class="form-card" onSubmit={onSubmit}>
        <div class="form-row">
          <label>
            Hostel name
            <input name="name" required minLength={2} placeholder="Boys Hostel A" />
          </label>
          <label>
            Location
            <input name="location" required minLength={2} placeholder="Main Campus" />
          </label>
        </div>
        <div class="form-row">
          <label>
            Blocks
            <input name="blocks" required min={1} type="number" defaultValue={2} />
          </label>
          <label>
            Floors
            <input name="floors" required min={1} type="number" defaultValue={4} />
          </label>
        </div>
        <div class="form-row">
          <label>
            Student count
            <input name="student_count" required min={1} type="number" defaultValue={420} />
          </label>
          <label>
            Effective date
            <input name="effective_date" required type="datetime-local" defaultValue={toDateTimeLocal()} />
          </label>
        </div>
        <button class="primary-button wide" disabled={isLoading} type="submit">
          {isLoading ? 'Saving setup...' : 'Save Hostel And Continue'}
        </button>
      </form>
    </section>
  )
}

function EntryScreen({
  hostel,
  records,
  totalPreview,
  isLoading,
  canCalculate,
  onSubmit,
  onRunCalculation,
}: {
  hostel: Hostel | null
  records: ConsumptionRecord[]
  totalPreview: number
  isLoading: boolean
  canCalculate: boolean
  onSubmit: (event: Event) => void
  onRunCalculation: () => void
}) {
  return (
    <section class="content-stack">
      <div class="section-heading">
        <div>
          <p class="eyebrow">Step 2</p>
          <h2>Add water consumption</h2>
          <p>{hostel ? `Recording data for ${hostel.name}` : 'Create a hostel first.'}</p>
        </div>
        <button class="primary-button" disabled={!canCalculate} onClick={onRunCalculation} type="button">
          Refresh Metrics
        </button>
      </div>

      <div class="screen-grid entry-grid">
        <form class="form-card" onSubmit={onSubmit}>
          <label>
            Timestamp
            <input name="timestamp" required type="datetime-local" defaultValue={toDateTimeLocal()} />
          </label>
          <div class="form-row">
            <label>
              Bath liters
              <input name="bath_l" required min={0} type="number" defaultValue={3200} />
            </label>
            <label>
              Laundry liters
              <input name="laundry_l" required min={0} type="number" defaultValue={1100} />
            </label>
          </div>
          <div class="form-row">
            <label>
              Drinking liters
              <input name="drinking_l" required min={0} type="number" defaultValue={450} />
            </label>
            <label>
              Kitchen liters
              <input name="kitchen_l" required min={0} type="number" defaultValue={700} />
            </label>
          </div>
          <label>
            Other liters
            <input name="other_l" min={0} type="number" defaultValue={120} />
          </label>
          <button class="primary-button wide" disabled={!hostel || isLoading} type="submit">
            {isLoading ? 'Adding record...' : 'Add Consumption Record'}
          </button>
        </form>

        <div class="insight-card">
          <p class="eyebrow">Current all-time total</p>
          <strong>{formatLiters(totalPreview)}</strong>
          <span>{records.length} consumption records saved</span>
          <p>
            Add at least one record and run calculation to unlock dashboard metrics, analytics,
            suggestions, and reports.
          </p>
        </div>
      </div>

      <RecordsTable records={records} />
    </section>
  )
}

function DashboardScreen({
  summary,
  records,
  canCalculate,
  onRunCalculation,
}: {
  summary: DashboardSummary | null
  records: ConsumptionRecord[]
  canCalculate: boolean
  onRunCalculation: () => void
}) {
  if (!summary) {
    return (
      <EmptyState
        actionLabel="Run Calculation"
        canAct={canCalculate}
        description="Add student count and consumption data, then run calculation to populate live dashboard metrics."
        title="No calculation yet"
        onAction={onRunCalculation}
      />
    )
  }

  return (
    <section class="content-stack">
      <div class="metric-grid">
        <MetricCard label="Total consumption" value={formatLiters(summary.total_consumption_l)} tone="blue" />
        <MetricCard label="Per student usage" value={`${formatNumber(summary.per_student_l)} L`} tone="teal" />
        <MetricCard label="Reuse potential" value={formatLiters(summary.reuse_potential_l)} tone="green" />
        <MetricCard label="Efficiency score" value={`${formatNumber(summary.efficiency_score)}%`} tone="amber" />
      </div>

      <div class="screen-grid dashboard-grid">
        <div class="panel-card">
          <div class="section-heading compact">
            <div>
              <p class="eyebrow">Category split</p>
              <h2>Where water is going</h2>
            </div>
          </div>
          <CategoryBars data={summary.category_split_pct} />
        </div>

        <div class="panel-card spotlight-card">
          <p class="eyebrow">Last updated</p>
          <h2>{formatDate(summary.last_updated_at)}</h2>
          <p>
            Dashboard summaries refresh automatically while this screen is open.
          </p>
        </div>
      </div>

      <RecordsTable records={records.slice(0, 6)} />
    </section>
  )
}

function AnalyticsScreen({
  dailySeries,
  weeklySeries,
  categoryBreakdown,
}: {
  dailySeries: DailyPoint[]
  weeklySeries: WeeklyPoint[]
  categoryBreakdown: CategoryBreakdown | null
}) {
  const categoryData = categoryBreakdown?.split_pct || {}

  return (
    <section class="content-stack">
      <div class="section-heading">
        <div>
          <p class="eyebrow">Charts</p>
          <h2>Usage analytics</h2>
          <p>Daily, weekly, and category insights generated from saved hostel usage data.</p>
        </div>
      </div>

      <div class="screen-grid dashboard-grid">
        <div class="panel-card">
          <p class="eyebrow">Daily usage</p>
          <BarChart data={dailySeries.map((item) => ({ label: item.date.slice(5), value: item.total_l }))} />
        </div>
        <div class="panel-card">
          <p class="eyebrow">Weekly usage</p>
          <BarChart data={weeklySeries.map((item) => ({ label: `W${item.week}`, value: item.total_l }))} />
        </div>
      </div>

      <div class="panel-card">
        <p class="eyebrow">Category breakdown</p>
        <CategoryBars data={categoryData} />
      </div>
    </section>
  )
}

function ReuseScreen({
  reuse,
  canGenerate,
  isLoading,
  onGenerate,
}: {
  reuse: ReuseResponse | null
  canGenerate: boolean
  isLoading: boolean
  onGenerate: () => void
}) {
  return (
    <section class="content-stack">
      <div class="section-heading">
        <div>
          <p class="eyebrow">Savings engine</p>
          <h2>Reuse suggestions</h2>
          <p>Recommendations generated from the latest water usage calculation.</p>
        </div>
        <button class="primary-button" disabled={!canGenerate || isLoading} onClick={onGenerate} type="button">
          {isLoading ? 'Generating...' : 'Generate Suggestions'}
        </button>
      </div>

      {!reuse ? (
        <EmptyState
          canAct={canGenerate}
          title="No suggestions yet"
          description="Run a calculation first, then generate reuse suggestions."
          actionLabel="Generate Suggestions"
          onAction={onGenerate}
        />
      ) : (
        <>
          <div class="summary-strip">
            <MetricCard label="Estimated savings" value={formatLiters(reuse.estimated_savings_l)} tone="green" />
            <MetricCard label="Suggestion source" value={reuse.source} tone="blue" />
            <MetricCard label="Generated at" value={formatDate(reuse.generated_at)} tone="teal" />
          </div>
          <div class="recommendation-grid">
            {reuse.recommendations.map((item) => (
              <article class={`recommendation-card ${item.priority}`} key={item.id}>
                <span class="priority-badge">{item.priority}</span>
                <h3>{item.title}</h3>
                <small>{item.category}</small>
                <p>{item.action}</p>
                <strong>{formatLiters(item.estimated_savings_l)} savings</strong>
              </article>
            ))}
          </div>
        </>
      )}
    </section>
  )
}

function ReportsScreen({
  canDownload,
  summary,
  onDownload,
}: {
  canDownload: boolean
  summary: DashboardSummary | null
  onDownload: (type: 'pdf' | 'xlsx') => void
}) {
  return (
    <section class="content-stack">
      <div class="section-heading">
        <div>
          <p class="eyebrow">Exports</p>
          <h2>Reports</h2>
          <p>Download the latest calculation as administration-ready PDF or Excel files.</p>
        </div>
      </div>

      <div class="screen-grid report-grid">
        <ReportCard
          canDownload={canDownload}
          description="Spreadsheet export for audit, analysis, and sharing."
          label="Excel Report"
          onClick={() => onDownload('xlsx')}
        />
        <ReportCard
          canDownload={canDownload}
          description="Formatted PDF report for review meetings and submission."
          label="PDF Report"
          onClick={() => onDownload('pdf')}
        />
      </div>

      <div class="summary-strip">
        <MetricCard label="Total" value={formatLiters(summary?.total_consumption_l)} tone="blue" />
        <MetricCard label="Per student" value={`${formatNumber(summary?.per_student_l)} L`} tone="teal" />
        <MetricCard label="Reuse potential" value={formatLiters(summary?.reuse_potential_l)} tone="green" />
      </div>
    </section>
  )
}

function MetricCard({ label, value, tone }: { label: string; value: string; tone: string }) {
  return (
    <article class={`metric-card ${tone}`}>
      <span>{label}</span>
      <strong>{value}</strong>
    </article>
  )
}

function RecordsTable({ records }: { records: ConsumptionRecord[] }) {
  return (
    <div class="panel-card">
      <div class="section-heading compact">
        <div>
          <p class="eyebrow">History</p>
          <h2>Recent consumption records</h2>
        </div>
      </div>
      {records.length === 0 ? (
        <p class="muted">No consumption records yet.</p>
      ) : (
        <div class="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Timestamp</th>
                <th>Bath</th>
                <th>Laundry</th>
                <th>Drinking</th>
                <th>Kitchen</th>
                <th>Other</th>
                <th>Total</th>
              </tr>
            </thead>
            <tbody>
              {records.map((record) => (
                <tr key={record.id}>
                  <td>{formatDate(record.timestamp)}</td>
                  <td>{formatNumber(record.bath_l)}</td>
                  <td>{formatNumber(record.laundry_l)}</td>
                  <td>{formatNumber(record.drinking_l)}</td>
                  <td>{formatNumber(record.kitchen_l)}</td>
                  <td>{formatNumber(record.other_l)}</td>
                  <td>{formatLiters(record.total_l)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

function CategoryBars({ data }: { data: Record<string, number> }) {
  const entries = Object.entries(data)

  if (entries.length === 0) {
    return <p class="muted">No category data yet.</p>
  }

  return (
    <div class="category-bars">
      {entries.map(([key, value]) => (
        <div class="category-row" key={key}>
          <div>
            <span>{categoryLabels[key as keyof typeof categoryLabels] || key}</span>
            <strong>{formatNumber(value)}%</strong>
          </div>
          <progress max={100} value={value} />
        </div>
      ))}
    </div>
  )
}

function BarChart({ data }: { data: Array<{ label: string; value: number }> }) {
  const max = Math.max(...data.map((item) => item.value), 1)

  if (data.length === 0) {
    return <p class="muted">No chart data yet.</p>
  }

  return (
    <div class="bar-chart">
      {data.map((item) => (
        <div class="bar-column" key={item.label}>
          <span style={{ height: `${Math.max(8, (item.value / max) * 100)}%` }} />
          <small>{item.label}</small>
        </div>
      ))}
    </div>
  )
}

function EmptyState({
  title,
  description,
  actionLabel,
  canAct,
  onAction,
}: {
  title: string
  description: string
  actionLabel: string
  canAct: boolean
  onAction: () => void
}) {
  return (
    <section class="empty-state">
      <span class="water-orb" />
      <h2>{title}</h2>
      <p>{description}</p>
      <button class="primary-button" disabled={!canAct} onClick={onAction} type="button">
        {actionLabel}
      </button>
    </section>
  )
}

function ReportCard({
  label,
  description,
  canDownload,
  onClick,
}: {
  label: string
  description: string
  canDownload: boolean
  onClick: () => void
}) {
  return (
    <article class="report-card">
      <span class="report-icon">R</span>
      <h3>{label}</h3>
      <p>{description}</p>
      <button class="primary-button" disabled={!canDownload} onClick={onClick} type="button">
        Download
      </button>
    </article>
  )
}
