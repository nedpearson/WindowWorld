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

export default function App() {
  const user = useAuthStore((s) => s.user);

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
