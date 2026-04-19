import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from './store/auth.store';
import { AppLayout } from './components/layout/AppLayout';
import { LoginPage } from './pages/auth/LoginPage';
import { DashboardPage } from './pages/dashboard/DashboardPage';
import { LeadsPage } from './pages/leads/LeadsPage';
import { LeadDetailPage } from './pages/leads/LeadDetailPage';
import { LeadIntelligencePage } from './pages/leads/LeadIntelligencePage';
import { PipelinePage } from './pages/leads/PipelinePage';
import { TerritoryMapPage } from './pages/leads/TerritoryMapPage';
import { AppointmentsPage } from './pages/leads/AppointmentsPage';
import { InspectionPage } from './pages/inspections/InspectionPage';
import { MeasurementPage } from './pages/inspections/MeasurementPage';
import { AnalyticsPage } from './pages/analytics/AnalyticsPage';
import { ProposalsPage } from './pages/proposals/ProposalsPage';
import { ProposalDetailPage } from './pages/proposals/ProposalDetailPage';
import { InvoicesPage } from './pages/invoices/InvoicesPage';
import { MobileFieldApp } from './pages/mobile/MobileFieldApp';

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />

      {/* Mobile standalone route */}
      <Route path="/field" element={
        <ProtectedRoute><MobileFieldApp /></ProtectedRoute>
      } />

      {/* Main app with sidebar layout */}
      <Route path="/" element={
        <ProtectedRoute><AppLayout /></ProtectedRoute>
      }>
        <Route index element={<Navigate to="/dashboard" replace />} />
        <Route path="dashboard" element={<DashboardPage />} />

        {/* Leads */}
        <Route path="leads" element={<LeadsPage />} />
        <Route path="leads/:id" element={<LeadDetailPage />} />
        <Route path="leads/new" element={<LeadDetailPage isNew />} />
        <Route path="lead-intelligence" element={<LeadIntelligencePage />} />
        <Route path="pipeline" element={<PipelinePage />} />
        <Route path="map" element={<TerritoryMapPage />} />
        <Route path="appointments" element={<AppointmentsPage />} />

        {/* Inspections */}
        <Route path="inspections/:id" element={<InspectionPage />} />
        <Route path="measurements/:openingId" element={<MeasurementPage />} />

        {/* Proposals & Invoices */}
        <Route path="proposals" element={<ProposalsPage />} />
        <Route path="proposals/:id" element={<ProposalDetailPage />} />
        <Route path="invoices" element={<InvoicesPage />} />

        {/* Analytics */}
        <Route path="analytics" element={<AnalyticsPage />} />

        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Route>
    </Routes>
  );
}
