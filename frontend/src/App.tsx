import { Routes, Route, Navigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { RootState } from './store';
import Layout from './components/Layout';
import Login from './pages/Login';
import ExecutiveDashboard from './pages/ExecutiveDashboard';
import AuditorWorkbench from './pages/AuditorWorkbench';
import DeviceRegistry from './pages/DeviceRegistry';
import DeviceDetail from './pages/DeviceDetail';
import BulkImport from './pages/BulkImport';
import AuditCases from './pages/AuditCases';
import AlertCentre from './pages/AlertCentre';
import Users from './pages/Users';
import Reports from './pages/Reports';
import KYCCheck from './pages/KYCCheck';

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useSelector((state: RootState) => state.auth);
  return isAuthenticated ? <>{children}</> : <Navigate to="/login" replace />;
}

function DashboardRouter() {
  const { user } = useSelector((state: RootState) => state.auth);
  if (!user) return null;
  if (user.role === 'TRADE_AUDITOR' || user.role === 'TDR' || user.role === 'AGENT' || user.role === 'RETAILER') {
    return <KYCCheck />;
  }
  if (user.role === 'ADMIN' || user.role === 'MARKET_MANAGEMENT' || user.role === 'TEAM_LEAD') {
    return <ExecutiveDashboard />;
  }
  return <AuditorWorkbench />;
}

export default function App() {
  const { isAuthenticated } = useSelector((state: RootState) => state.auth);

  return (
    <Routes>
      <Route
        path="/login"
        element={isAuthenticated ? <Navigate to="/" replace /> : <Login />}
      />
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <Layout />
          </ProtectedRoute>
        }
      >
        <Route index element={<DashboardRouter />} />
        <Route path="devices" element={<DeviceRegistry />} />
        <Route path="devices/:id" element={<DeviceDetail />} />
        <Route path="cases" element={<AuditCases />} />
        <Route path="alerts" element={<AlertCentre />} />
        <Route path="bulk-import" element={<BulkImport />} />
        <Route path="users" element={<Users />} />
        <Route path="reports" element={<Reports />} />
        <Route path="kyc" element={<KYCCheck />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
