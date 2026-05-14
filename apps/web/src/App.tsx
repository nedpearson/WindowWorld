import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from './store';
import { Layout } from './components/Layout';
import { LoginPage } from './pages/LoginPage';
import { DashboardPage } from './pages/DashboardPage';
import { AppointmentsPage } from './pages/AppointmentsPage';
import { AppointmentDetailPage } from './pages/AppointmentDetailPage';
import { PricingAdminPage } from './pages/PricingAdminPage';
import { PricingImportPage } from './pages/PricingImportPage';
import { OfficeQueuePage } from './pages/OfficeQueuePage';
import { FormsDashboard } from './pages/FormsDashboard';
import { SigningPage } from './pages/SigningPage';
import { MobileFieldPage } from './pages/MobileFieldPage';
import { WalkthroughPage } from './pages/WalkthroughPage';
import { OrderFormPage } from './pages/OrderFormPage';
import { MobileOrderFormPage } from './pages/MobileOrderFormPage';
import { RuleEngineAdminPage } from './pages/RuleEngineAdminPage';
import { MeasurementRulesAdminPage } from './pages/MeasurementRulesAdminPage';
import { useEffect, useState } from 'react';

export default function App() {
  const user = useAuthStore((s) => s.user);
  const [hydrated, setHydrated] = useState(false);

  // Wait for Zustand persist to rehydrate from localStorage before rendering.
  // Without this, the app flashes a blank black screen on direct URL navigation.
  useEffect(() => {
    const unsub = useAuthStore.persist.onFinishHydration(() => setHydrated(true));
    // If already hydrated (synchronous storage), mark immediately
    if (useAuthStore.persist.hasHydrated()) setHydrated(true);
    return unsub;
  }, []);

  if (!hydrated) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', background: 'var(--bg-primary, #0d1117)', flexDirection: 'column', gap: '1rem' }}>
      <div style={{ fontSize: '2.5rem' }}>🪟</div>
      <div style={{ fontSize: '0.9rem', color: 'var(--text-muted, #6b7280)', fontFamily: 'system-ui, sans-serif' }}>Loading…</div>
    </div>
  );

  if (!user) return <LoginPage />;

  return (
    <Routes>
      {/* Isolated pages — no Layout */}
      <Route path="/sign/:token" element={<SigningPage />} />
      <Route path="/mobile" element={<MobileFieldPage />} />
      <Route path="/mobile/order/:appointmentId" element={<MobileOrderFormPage />} />

      {/* Main app with sidebar */}
      <Route path="/*" element={
        <Layout>
      <Routes>
        <Route path="/" element={<DashboardPage />} />
        <Route path="/appointments" element={<AppointmentsPage />} />
        <Route path="/appointments/:id" element={<AppointmentDetailPage />} />
        <Route path="/appointments/:appointmentId/walkthrough" element={<WalkthroughPage />} />
        <Route path="/pricing" element={<PricingAdminPage />} />
        <Route path="/pricing-import" element={<PricingImportPage />} />
        <Route path="/rules" element={<RuleEngineAdminPage />} />
        <Route path="/measurement-rules" element={<MeasurementRulesAdminPage />} />
        <Route path="/office" element={<OfficeQueuePage />} />
          <Route path="/forms" element={<FormsDashboard />} />
          <Route path="/forms/order/:appointmentId" element={<OrderFormPage />} />
          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      </Layout>
    } />
  </Routes>
  );
}
