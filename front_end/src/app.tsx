import { useEffect, useMemo, useState } from 'preact/hooks'
import {
  isFirebaseConfigured,
  listenToAuth,
  getFirebaseIdToken,
  loginWithGoogle,
  logout,
  type AuthUser,
} from './firebase'
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  PieChart, Pie, Cell
} from 'recharts'
import './app.css'

type AppStage = 'intro' | 'login' | 'app'
type View = 'dashboard' | 'setup' | 'entry' | 'reuse' | 'reports'
type ApiStatus = 'checking' | 'online' | 'offline'

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
  { id: 'dashboard', label: 'Dashboard', eyebrow: 'Analytics' },
  { id: 'setup', label: 'Setup', eyebrow: 'Hostel' },
  { id: 'entry', label: 'Add Data', eyebrow: 'Input' },
  { id: 'reuse', label: 'Reuse', eyebrow: 'Savings' },
  { id: 'reports', label: 'Reports', eyebrow: 'Export' },
]


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
  const [view, setView] = useState<View>('dashboard')
  const [user, setUser] = useState<AuthUser | null>(null)
  const [authReady, setAuthReady] = useState(false)
  const [authError, setAuthError] = useState('')
  const [apiStatus, setApiStatus] = useState<ApiStatus>('checking')
  const [hostel, setHostel] = useState<Hostel | null>(null)
  const [hasStudentCount, setHasStudentCount] = useState(false)
  const [records, setRecords] = useState<ConsumptionRecord[]>([])
  const [calculation, setCalculation] = useState<CalculationResult | null>(null)
  const [reuse, setReuse] = useState<ReuseResponse | null>(null)
  const [csvUploadResult, setCsvUploadResult] = useState<{ inserted: number; skipped: number; errors: { row: number; error: string }[] } | null>(null)
  const [notice, setNotice] = useState('Welcome! Please sign in to view your dashboard.')
  const [loadingAction, setLoadingAction] = useState('')

  const [dashboardSummary, setDashboardSummary] = useState<any>(null)
  const [chartData, setChartData] = useState<any>(null)
  const [categoryBreakdown, setCategoryBreakdown] = useState<any>(null)

  const hasConsumption = records.length > 0
  const canCalculate = Boolean(hostel?.id && hasStudentCount && hasConsumption)
  const canUseCalculatedFeatures = Boolean(hostel?.id && calculation)

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
    setCalculation(null)
    setReuse(null)
    setDashboardSummary(null)
    setChartData(null)
    setCategoryBreakdown(null)

    void refreshRecords(hostel.id)
    void refreshDashboard(hostel.id)
  }, [hostel?.id])

  async function refreshDashboard(hostelId = hostel?.id) {
    if (!hostelId) return
    try {
      const sum = await apiRequest<any>(`${API_PREFIX}/dashboard/${hostelId}/summary`).catch(() => null)
      if (sum) setDashboardSummary(sum)
      const charts = await apiRequest<any>(`${API_PREFIX}/charts/${hostelId}/daily?days=30`).catch(() => null)
      if (charts) setChartData(charts)
      const breakdown = await apiRequest<any>(`${API_PREFIX}/charts/${hostelId}/category-breakdown`).catch(() => null)
      if (breakdown) setCategoryBreakdown(breakdown)
    } catch(e) {
      // Ignore if not calculated yet
    }
  }



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

  async function uploadCsv(event: Event) {
    event.preventDefault()
    if (!hostel?.id) {
      setNotice('Create a hostel before uploading data.')
      return
    }
    const form = event.currentTarget as HTMLFormElement
    const fileInput = form.querySelector('input[type="file"]') as HTMLInputElement
    const file = fileInput?.files?.[0]
    if (!file) {
      setNotice('Select a CSV file first.')
      return
    }
    const formData = new FormData()
    formData.append('file', file)
    setLoadingAction('consumption')
    setCsvUploadResult(null)
    try {
      const res = await fetch(`${API_BASE}${API_PREFIX}/hostels/${hostel.id}/consumption/upload-csv`, {
        method: 'POST',
        body: formData,
      })
      if (!res.ok) {
        const err = await res.json().catch(() => null)
        throw new Error(err?.detail?.message || err?.detail || `Upload failed (${res.status})`)
      }
      const data = await res.json()
      setCsvUploadResult(data)
      await refreshRecords(hostel.id)
      setNotice(`CSV uploaded — ${data.inserted} rows inserted${data.skipped ? `, ${data.skipped} skipped` : ''}.`)
      form.reset()
    } catch (error) {
      setNotice(error instanceof Error ? error.message : 'Could not upload CSV.')
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
      setNotice('Calculation complete. Check the Reuse module for AI suggestions.')
      await refreshRecords(hostel.id)
      await refreshDashboard(hostel.id)
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

        {view === 'dashboard' && (
          <DashboardScreen
            hostel={hostel}
            summary={dashboardSummary}
            chartData={chartData}
            categoryBreakdown={categoryBreakdown}
            onSetup={() => setView('setup')}
            onAddData={() => setView('entry')}
          />
        )}
        
        {view === 'setup' && (
          <SetupScreen isLoading={loadingAction === 'setup'} onSubmit={createHostel} />
        )}
        {view === 'entry' && (
          <EntryScreen
            hostel={hostel}
            records={records}
            totalPreview={totalPreview}
            isLoading={loadingAction === 'consumption'}
            csvResult={csvUploadResult}
            onSubmit={uploadCsv}
            onRunCalculation={runCalculation}
            canCalculate={canCalculate}
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
            calculation={calculation}
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
    <section class="public-page animated-intro">
      <div class="water-background">
        <div class="bubble bubble-1"></div>
        <div class="bubble bubble-2"></div>
        <div class="bubble bubble-3"></div>
        <div class="bubble bubble-4"></div>
        <div class="bubble bubble-5"></div>
        <div class="bubble bubble-6"></div>
        <div class="bubble bubble-7"></div>
        <div class="wave wave-back"></div>
        <div class="wave wave-front"></div>
      </div>
      
      <div class="landing-hero has-water-effect">
        <div class="landing-copy">
          <p class="eyebrow">Aqua Campus AI</p>
          <h2>Smart Water Intelligence & Optimization</h2>
          <p>
            Seamlessly ingest hostel CSV data, track consumption via real-time dashboards, and leverage 
            Cloudflare AI to generate actionable water-saving strategies.
          </p>
          <div class="landing-actions">
            <button class="primary-button large-cta" onClick={onNext} type="button">
              Enter Secure Portal
            </button>
          </div>
        </div>
        
        <div class="water-feature-list floating-preview" aria-label="Feature descriptions">
          <div class="feature-description-item">
            <div class="feature-icon-small">📊</div>
            <div>
              <h4>Smart Consumption Tracking</h4>
              <p>Monitor daily water usage across Bath, Laundry, and Kitchen categories with precision.</p>
            </div>
          </div>
          <div class="feature-description-item">
            <div class="feature-icon-small">🤖</div>
            <div>
              <h4>AI-Powered Reuse Logic</h4>
              <p>Leverage Cloudflare AI to discover hidden reuse opportunities and reduce campus waste.</p>
            </div>
          </div>
          <div class="feature-description-item">
            <div class="feature-icon-small">📄</div>
            <div>
              <h4>Automated Reporting</h4>
              <p>Generate instant sustainability reports in PDF and Excel formats for administrative review.</p>
            </div>
          </div>
        </div>


      </div>

      <div class="focused-features has-water-effect">
        <div class="feature-item">
          <div class="feature-icon">📊</div>
          <h3>Automated CSV Ingestion</h3>
          <p>Drop 30-day usage logs directly into the system for instant parsing and MongoDB storage.</p>
        </div>
        <div class="feature-item">
          <div class="feature-icon">🧠</div>
          <h3>Cloudflare AI Insights</h3>
          <p>Dynamic LLM-powered recommendations tailored strictly to your hostel's consumption data.</p>
        </div>
        <div class="feature-item">
          <div class="feature-icon">📈</div>
          <h3>Real-Time Visuals</h3>
          <p>Interactive Recharts-driven dashboards plotting 30-day trends and category breakdowns.</p>
        </div>
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
    <section class="public-page login-page animated-intro">
      <div class="water-background">
        <div class="bubble bubble-1"></div>
        <div class="bubble bubble-2"></div>
        <div class="bubble bubble-3"></div>
        <div class="bubble bubble-4"></div>
        <div class="bubble bubble-5"></div>
        <div class="wave wave-back"></div>
        <div class="wave wave-front"></div>
      </div>
      <div class="login-art has-water-effect">
        <p class="eyebrow">Aqua Campus Secure</p>
        <h2>Access Water Intelligence</h2>
        <p>
          Join your campus community in tracking sustainability metrics and uncovering 
          AI-driven water saving opportunities.
        </p>
        <div class="login-feature-points">
          <div class="login-point"><span>🔐</span> Secure Data Management</div>
          <div class="login-point"><span>📊</span> Personal Dashboard Access</div>
          <div class="login-point"><span>🧠</span> Collaborative AI Audits</div>
        </div>
      </div>


      <div class="login-card high-end-card has-water-effect">
        <div class="login-card-header">
          <span class="brand-icon">A</span>
          <span class="login-badge">Portal Entry</span>
        </div>
        
        <div class="login-card-copy">
          <h2>Welcome Back</h2>
          <p>Please use your authorized Google account to access the Aqua Campus Command Center.</p>
        </div>

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

        <div class="login-main-action">
          <button class="google-button premium-google-btn" disabled={!isConfigured} onClick={onLogin} type="button">
            <svg viewBox="0 0 24 24" width="24" height="24">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.66l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
            </svg>
            Continue with Google
          </button>
        </div>

        <div class="login-footer">
          <button class="ghost-button-slim" onClick={onBack} type="button">
            ← Back to project overview
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

function downloadCsvTemplate() {
  const header = 'timestamp,bath_l,laundry_l,kitchen_l,other_l'
  const example1 = `${new Date().toISOString().slice(0, 16).replace('T', ' ')},3200,1100,700,120`
  const example2 = `${new Date(Date.now() - 86400000).toISOString().slice(0, 16).replace('T', ' ')},2900,980,650,90`
  const csv = [header, example1, example2].join('\n')
  const blob = new Blob([csv], { type: 'text/csv' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = 'water_consumption_template.csv'
  a.click()
  URL.revokeObjectURL(url)
}

function EntryScreen({
  hostel,
  records,
  totalPreview,
  isLoading,
  canCalculate,
  csvResult,
  onSubmit,
  onRunCalculation,
}: {
  hostel: Hostel | null
  records: ConsumptionRecord[]
  totalPreview: number
  isLoading: boolean
  canCalculate: boolean
  csvResult: { inserted: number; skipped: number; errors: { row: number; error: string }[] } | null
  onSubmit: (event: Event) => void
  onRunCalculation: () => void
}) {
  const [filename, setFilename] = useState<string>('')

  // Clear filename on successful upload response
  useEffect(() => {
    if (csvResult && !isLoading) {
      setFilename('')
    }
  }, [csvResult, isLoading])
  return (
    <section class="content-stack">
      <div class="section-heading">
        <div>
          <p class="eyebrow">Step 2</p>
          <h2>Upload consumption data</h2>
          <p>{hostel ? `Recording data for ${hostel.name}` : 'Create a hostel first.'}</p>
        </div>
        <button class="primary-button" disabled={!canCalculate} onClick={onRunCalculation} type="button">
          Refresh Metrics
        </button>
      </div>

      <div class="screen-grid entry-grid">
        <div class="form-card">
          <div class="csv-instructions">
            <p class="eyebrow">CSV format</p>
            <p>Upload a CSV file with the columns below. One row per day or period.</p>
            <div class="csv-schema">
              <div class="schema-row required"><span>timestamp</span><small>Required — ISO date or YYYY-MM-DD HH:MM</small></div>
              <div class="schema-row required"><span>bath_l</span><small>Required — bath water in litres</small></div>
              <div class="schema-row required"><span>laundry_l</span><small>Required — laundry water in litres</small></div>
              <div class="schema-row required"><span>kitchen_l</span><small>Required — kitchen water in litres</small></div>
              <div class="schema-row"><span>other_l</span><small>Optional — defaults to 0</small></div>
            </div>
            <button class="ghost-button" onClick={downloadCsvTemplate} type="button">
              ↓ Download template
            </button>
          </div>

          <form class="csv-upload-form" onSubmit={onSubmit}>
            <label class="file-drop-zone">
              <input 
                accept=".csv" 
                name="file" 
                type="file" 
                onChange={(e) => {
                  const file = (e.target as HTMLInputElement).files?.[0]
                  setFilename(file ? file.name : '')
                }}
              />
              <span class="file-drop-label">
                <strong>{filename || 'Choose a CSV file'}</strong>
                <small>{filename ? 'File ready to upload' : 'or drag and drop here'}</small>
              </span>
            </label>
            <button class="primary-button wide" disabled={!hostel || !filename || isLoading} type="submit">
              {isLoading ? 'Uploading...' : 'Upload CSV'}
            </button>
          </form>

          {csvResult && (
            <div class={`csv-result ${csvResult.skipped > 0 ? 'has-errors' : 'success'}`}>
              <p><strong>{csvResult.inserted}</strong> rows inserted · <strong>{csvResult.skipped}</strong> skipped</p>
              {csvResult.errors.length > 0 && (
                <ul class="csv-errors">
                  {csvResult.errors.map((e) => (
                    <li key={e.row}><span>Row {e.row}</span> {e.error}</li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </div>

        <div class="insight-card">
          <p class="eyebrow">Current all-time total</p>
          <strong>{formatLiters(totalPreview)}</strong>
          <span>{records.length} consumption records saved</span>
          <p>
            Upload at least one CSV and run calculation to unlock reuse suggestions and reports.
          </p>
        </div>
      </div>

      <RecordsTable records={records} />
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
  calculation,
  onDownload,
}: {
  canDownload: boolean
  calculation: CalculationResult | null
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
        <MetricCard label="Total" value={formatLiters(calculation?.total_l)} tone="blue" />
        <MetricCard label="Per student" value={`${formatNumber(calculation?.per_student_l)} L`} tone="teal" />
        <MetricCard label="Reuse potential" value={formatLiters(calculation?.reuse_potential_l)} tone="green" />
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

function DashboardScreen({
  hostel,
  summary,
  chartData,
  categoryBreakdown,
  onSetup,
  onAddData,
}: {
  hostel: Hostel | null
  summary: any
  chartData: any
  categoryBreakdown: any
  onSetup: () => void
  onAddData: () => void
}) {
  if (!hostel) {
    return (
      <section class="content-stack">
        <div class="section-heading">
          <div>
            <p class="eyebrow">Welcome</p>
            <h2>Water Intelligence Dashboard</h2>
          </div>
        </div>
        <div class="insight-card empty-state">
          <h3>No Hostel Configured</h3>
          <p>You need to set up a hostel profile to begin analyzing data.</p>
          <button class="primary-button" onClick={onSetup}>Go to Setup</button>
        </div>
      </section>
    )
  }

  if (!summary || !chartData) {
    return (
      <section class="content-stack">
        <div class="section-heading">
          <div>
            <p class="eyebrow">Overview</p>
            <h2>{hostel.name} Dashboard</h2>
          </div>
        </div>
        <div class="insight-card empty-state">
          <h3>No Data Calculated Yet</h3>
          <p>Please upload consumption data and run a calculation to view your dashboard insights.</p>
          <button class="primary-button" onClick={onAddData}>Add Data</button>
        </div>
      </section>
    )
  }

  const COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#8b5cf6']
  const pieData = categoryBreakdown?.split_l ? Object.entries(categoryBreakdown.split_l).map(([name, value], i) => ({ name, value, color: COLORS[i % COLORS.length] })) : []

  return (
    <section class="content-stack">
      <div class="section-heading">
        <div>
          <p class="eyebrow">Overview</p>
          <h2>{hostel.name} Dashboard</h2>
          <p>Real-time analytics and efficiency metrics.</p>
        </div>
        <div class="efficiency-badge">
          <span>Score: {summary.efficiency_score} / 100</span>
        </div>
      </div>

      <div class="kpi-grid">
        <div class="kpi-card">
          <p class="eyebrow">Total Consumption</p>
          <h3>{formatLiters(summary.total_consumption_l)}</h3>
        </div>
        <div class="kpi-card">
          <p class="eyebrow">Per Student (Avg)</p>
          <h3>{formatNumber(summary.per_student_l)} L</h3>
        </div>
        <div class="kpi-card">
          <p class="eyebrow">Reuse Potential</p>
          <h3 class="highlight-green">{formatLiters(summary.reuse_potential_l)}</h3>
        </div>
      </div>

      <div class="charts-grid">
        <div class="chart-container span-2">
          <h3>30-Day Trend</h3>
          <div style={{ width: '100%', height: 300 }}>
            <ResponsiveContainer>
              <LineChart data={chartData.series}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="date" tick={{fontSize: 12}} stroke="#94a3b8" />
                <YAxis tick={{fontSize: 12}} stroke="#94a3b8" />
                <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                <Legend />
                <Line type="monotone" dataKey="total_l" stroke="#0ea5e9" strokeWidth={3} dot={{r: 4, strokeWidth: 2}} activeDot={{r: 6}} name="Daily Consumption (L)" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div class="chart-container">
          <h3>Category Breakdown</h3>
          <div style={{ width: '100%', height: 300 }}>
            <ResponsiveContainer>
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {pieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip formatter={(value) => formatLiters(value as number)} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </section>
  )
}
