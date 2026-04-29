import { lazy, Suspense } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from './store/auth.store';
import { AppLayout } from './components/layout/AppLayout';
import { DrilldownProvider } from './components/DrilldownPanel';
import { LoginPage } from './pages/auth/LoginPage';
import { DashboardPage } from './pages/dashboard/DashboardPage';
import { LeadsPage } from './pages/leads/LeadsPage';
import { LeadDetailPage } from './pages/leads/LeadDetailPage';
import { NewLeadPage } from './pages/leads/NewLeadPage';
import { LeadIntelligencePage } from './pages/leads/LeadIntelligencePage';
import { PipelinePage } from './pages/leads/PipelinePage';
import { TerritoryMapPage } from './pages/leads/TerritoryMapPage';
import { AppointmentsPage } from './pages/leads/AppointmentsPage';
import { AutomationsPage } from './pages/leads/AutomationsPage';
import { MarketingPlaybooksPage } from './pages/marketing/MarketingPlaybooksPage';
import { InspectionPage } from './pages/inspections/InspectionPage';
import { MeasurementPage } from './pages/inspections/MeasurementPage';
import { ProposalsPage } from './pages/proposals/ProposalsPage';
import { ProposalDetailPage } from './pages/proposals/ProposalDetailPage';
import { QuotePage } from './pages/proposals/QuotePage';
import { InvoicesPage } from './pages/invoices/InvoicesPage';
import { ContactsPage } from './pages/contacts/ContactsPage';
import { NotificationsPage } from './pages/notifications/NotificationsPage';
import { SettingsPage } from './pages/settings/SettingsPage';

// ─── Lazy-loaded (code-split) heavy pages ─────────────────
const AnalyticsPage       = lazy(() => import('./pages/analytics/AnalyticsPage').then(m => ({ default: m.AnalyticsPage })));
const SiloCoachPage       = lazy(() => import('./pages/analytics/SiloCoachPage').then(m => ({ default: m.SiloCoachPage })));
const ProductCatalogPage  = lazy(() => import('./pages/proposals/ProductCatalogPage').then(m => ({ default: m.ProductCatalogPage })));
const AdminPage           = lazy(() => import('./pages/admin/AdminPage').then(m => ({ default: m.AdminPage })));
const MobileFieldApp      = lazy(() => import('./pages/mobile/MobileFieldApp').then(m => ({ default: m.MobileFieldApp })));
const InstallSchedulePage = lazy(() => import('./pages/installs/InstallSchedulePage').then(m => ({ default: m.InstallSchedulePage })));
const PostInstallPage     = lazy(() => import('./pages/installs/PostInstallPage').then(m => ({ default: m.PostInstallPage })));
const QuickQuotePage      = lazy(() => import('./pages/proposals/QuickQuotePage').then(m => ({ default: m.QuickQuotePage })));
const CommissionPage      = lazy(() => import('./pages/commissions/CommissionPage').then(m => ({ default: m.CommissionPage })));
const CsvImportPage       = lazy(() => import('./pages/leads/CsvImportPage').then(m => ({ default: m.CsvImportPage })));
const HomeownerPortalPage = lazy(() => import('./pages/homeowner/HomeownerPortalPage').then(m => ({ default: m.HomeownerPortalPage })));
const FieldInstallPage    = lazy(() => import('./pages/mobile/FieldInstallPage').then(m => ({ default: m.FieldInstallPage })));

// Slim fallback for lazy routes
function PageLoader() {
  return (
    <div className="flex items-center justify-center h-48">
      <div className="w-7 h-7 border-2 border-brand-500/30 border-t-brand-500 rounded-full animate-spin" />
    </div>
  );
}

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

export default function App() {
  return (
    <DrilldownProvider>
    <Suspense fallback={<PageLoader />}>
      <Routes>
        {/* Public homeowner proposal portal — no auth required */}
        <Route path="/portal/:id" element={<HomeownerPortalPage />} />

        {/* QR Install landing — public, auto-authenticates from token in URL */}
        <Route path="/field-install" element={<FieldInstallPage />} />

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
          <Route path="leads/new" element={<NewLeadPage />} />
          <Route path="leads/:id" element={<LeadDetailPage />} />
          <Route path="lead-intelligence" element={<LeadIntelligencePage />} />
          <Route path="pipeline" element={<PipelinePage />} />
          <Route path="map" element={<TerritoryMapPage />} />
          <Route path="appointments" element={<AppointmentsPage />} />
          <Route path="playbooks" element={<MarketingPlaybooksPage />} />
          <Route path="automations" element={<AutomationsPage />} />

          {/* Inspections */}
          <Route path="inspections/:id" element={<InspectionPage />} />
          <Route path="inspections" element={<Navigate to="/leads" replace />} />
          <Route path="measurements/:openingId" element={<MeasurementPage />} />

          {/* Product catalog & quoting */}
          <Route path="catalog" element={<ProductCatalogPage />} />
          <Route path="leads/:leadId/quote" element={<QuotePage />} />

          {/* Proposals & Invoices */}
          <Route path="proposals" element={<ProposalsPage />} />
          <Route path="proposals/:id" element={<ProposalDetailPage />} />
          <Route path="invoices" element={<InvoicesPage />} />

          {/* Admin */}
          <Route path="admin" element={<AdminPage />} />
          <Route path="settings" element={<SettingsPage />} />

          {/* Analytics & Silo */}
          <Route path="analytics" element={<AnalyticsPage />} />
          <Route path="silo-coach" element={<SiloCoachPage />} />

          {/* Contacts */}
          <Route path="contacts" element={<ContactsPage />} />

          {/* Notifications */}
          <Route path="notifications" element={<NotificationsPage />} />

          {/* Install Schedule + Post-Install */}
          <Route path="installs" element={<InstallSchedulePage />} />
          <Route path="installs/post-install" element={<PostInstallPage />} />

          {/* /coaching now redirects to Silo AI Coach */}
          <Route path="coaching" element={<Navigate to="/silo-coach" replace />} />

          {/* Quick Quote */}
          <Route path="quick-quote" element={<QuickQuotePage />} />

          {/* Commissions */}
          <Route path="commissions" element={<CommissionPage />} />

          {/* CSV Import */}
          <Route path="leads/import" element={<CsvImportPage />} />

          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Route>
      </Routes>
    </Suspense>
    </DrilldownProvider>
  );
}
