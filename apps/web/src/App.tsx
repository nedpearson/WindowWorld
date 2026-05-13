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

export default function App() {
  const user = useAuthStore((s) => s.user);

  if (!user) return <LoginPage />;

  return (
    <Layout>
      <Routes>
        <Route path="/" element={<DashboardPage />} />
        <Route path="/appointments" element={<AppointmentsPage />} />
        <Route path="/appointments/:id" element={<AppointmentDetailPage />} />
        <Route path="/pricing" element={<PricingAdminPage />} />
        <Route path="/pricing-import" element={<PricingImportPage />} />
        <Route path="/office" element={<OfficeQueuePage />} />
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </Layout>
  );
}
