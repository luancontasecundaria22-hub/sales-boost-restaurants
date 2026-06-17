import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import './index.css'
import App from './App.tsx'
import { AuthProvider } from './contexts/AuthContext.tsx'
import { useAuth } from './contexts/AuthContext.tsx'
import LoginPage from './pages/auth/LoginPage.tsx'
import SignupPage from './pages/auth/SignupPage.tsx'
import GscCallbackPage from './pages/auth/GscCallbackPage.tsx'
import GbpCallbackPage from './pages/auth/GbpCallbackPage.tsx'
import DashboardLayout from './pages/dashboard/DashboardLayout.tsx'
import OverviewPage from './pages/dashboard/OverviewPage.tsx'
import DiagnosticsPage from './pages/dashboard/DiagnosticsPage.tsx'
import InsightsPage from './pages/dashboard/InsightsPage.tsx'
import IntegrationsPage from './pages/dashboard/IntegrationsPage.tsx'
import SettingsPage from './pages/dashboard/SettingsPage.tsx'
import PostsPage from './pages/dashboard/PostsPage.tsx'
import CompetitorsPage from './pages/dashboard/CompetitorsPage.tsx'
import AgentePage from './pages/dashboard/AgentePage.tsx'
import OpportunitiesPage from './pages/dashboard/OpportunitiesPage.tsx'
import ReportPage from './pages/dashboard/ReportPage.tsx'
import JarvisPage from './pages/jarvis/JarvisPage.tsx'
import OwnerPage from './pages/owner/OwnerPage.tsx'
import OnboardingPage from './pages/onboarding/OnboardingPage.tsx'
import DiagnosticoPage from './pages/diagnostico/DiagnosticoPage.tsx'

const Spinner = () => (
  <div style={{ minHeight: '100vh', background: '#0E0B0A', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
    <div style={{ width: '32px', height: '32px', border: '3px solid rgba(255,109,41,0.2)', borderTopColor: '#FF6D29', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />
    <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
  </div>
)

function ClientRoute({ children }: { children: React.ReactNode }) {
  const { user, role, loading } = useAuth()
  if (loading) return <Spinner />
  if (!user) return <Navigate to="/login" replace />
  if (role === 'owner') return <Navigate to="/owner" replace />
  return <>{children}</>
}

function OwnerRoute({ children }: { children: React.ReactNode }) {
  const { user, role, loading } = useAuth()
  if (loading) return <Spinner />
  if (!user) return <Navigate to="/login" replace />
  if (role !== 'owner') return <Navigate to="/dashboard" replace />
  return <>{children}</>
}

function RouterRoot() {
  return (
    <Routes>
      <Route path="/" element={<App />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/signup" element={<SignupPage />} />
      <Route path="/auth/gsc/callback" element={<GscCallbackPage />} />
      <Route path="/auth/gbp/callback" element={<GbpCallbackPage />} />

      {/* Owner-only */}
      <Route path="/owner" element={<OwnerRoute><OwnerPage /></OwnerRoute>} />

      {/* Client dashboard */}
      <Route
        path="/dashboard"
        element={
          <ClientRoute>
            <DashboardLayout />
          </ClientRoute>
        }
      >
        <Route index element={<OverviewPage />} />
        <Route path="diagnostico" element={<DiagnosticsPage />} />
        <Route path="insights" element={<InsightsPage />} />
        <Route path="integrations" element={<IntegrationsPage />} />
        <Route path="posts" element={<PostsPage />} />
        <Route path="agente" element={<AgentePage />} />
        <Route path="oportunidades" element={<OpportunitiesPage />} />
        <Route path="concorrentes" element={<CompetitorsPage />} />
        <Route path="relatorio" element={<ReportPage />} />
        <Route path="settings" element={<SettingsPage />} />
      </Route>

      <Route path="/jarvis" element={<ClientRoute><JarvisPage /></ClientRoute>} />
      <Route path="/onboarding" element={<OnboardingPage />} />
      <Route path="/diagnostico/:id" element={<DiagnosticoPage />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <RouterRoot />
      </AuthProvider>
    </BrowserRouter>
  </StrictMode>,
)
