import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider, useAuth } from '@/contexts/AuthContext';
import AppLayout from '@/components/layout/AppLayout';
import Login from '@/pages/Login';
import AgentSettings  from '@/pages/AgentSettings';
import Ciclo2026      from '@/pages/Ciclo2026';
import Organigrama    from '@/pages/Organigrama';
import Puestos        from '@/pages/Puestos';
import PuestoDetalle  from '@/pages/PuestoDetalle';
import MiPuesto       from '@/pages/MiPuesto';
import Objetivos      from '@/pages/Objetivos';
import Cambios        from '@/pages/Cambios';
import Procedimientos from '@/pages/Procedimientos';
import RiesgosAMFE    from '@/pages/RiesgosAMFE';
import Register from '@/pages/Register';
import Dashboard from '@/pages/Dashboard';
import Findings from '@/pages/Findings';
import Risks from '@/pages/Risks';
import Legal from '@/pages/Legal';
import Purchases from '@/pages/Purchases';
import Committee from '@/pages/Committee';
import Users from '@/pages/Users';
import Profile from '@/pages/Profile';
import Trainings from '@/pages/Trainings';
import Employees from '@/pages/Employees';
import Incidents from '@/pages/Incidents';
import Environmental from '@/pages/Environmental';
import Documents from '@/pages/Documents';
import CustomerSatisfaction from '@/pages/CustomerSatisfaction';
import SistemaGestion from '@/pages/SistemaGestion';
import Suppliers from '@/pages/Suppliers';
import Context from '@/pages/Context';
import Calendar from '@/pages/Calendar';
import PublicNC from '@/pages/PublicNC';
import { Spinner } from '@/components/ui';
import { lazy, Suspense } from 'react';
import ForgotPassword from '@/pages/ForgotPassword';
import ResetPassword from '@/pages/ResetPassword';
import RequestAccess from '@/pages/RequestAccess';
import Auditor from '@/pages/Auditor';
import MisPendientes from '@/pages/MisPendientes';

const qc = new QueryClient({
  defaultOptions: { queries: { staleTime: 30_000, retry: 1, refetchOnWindowFocus: false } },
});

// Lazy-load modules that still use the old pattern (to be refactored later)
const Placeholder  = lazy(() => import('@/pages/Placeholder'));

function LoadingScreen() {
  return (
    <div className="min-h-screen bg-slate-100 flex items-center justify-center">
      <div className="flex flex-col items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-600 to-sky-400 flex items-center justify-center text-white font-black text-lg">D</div>
        <Spinner size={22} />
      </div>
    </div>
  );
}

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth();
  if (isLoading) return <LoadingScreen />;
  if (!user) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

function PageFallback() {
  return <div className="flex-1 flex items-center justify-center"><Spinner size={28} /></div>;
}

export default function App() {
  return (
    <QueryClientProvider client={qc}>
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/login"      element={<Login />} />
            <Route path="/register"   element={<Register />} />
            <Route path="/reporte-nc" element={<PublicNC />} />
            <Route path="/"           element={<Navigate to="/dashboard" replace />} />
            <Route element={<ProtectedRoute><AppLayout /></ProtectedRoute>}>
              <Route path="/dashboard"      element={<Dashboard />} />
              <Route path="/findings/*"     element={<Findings />} />
              <Route path="/risks"          element={<Risks />} />
              <Route path="/legal"          element={<Legal />} />
              <Route path="/purchases"      element={<Purchases />} />
              <Route path="/committee"      element={<Committee />} />
              <Route path="/trainings"      element={<Trainings />} />
              <Route path="/users"          element={<Users />} />
              <Route path="/agent-settings"  element={<AgentSettings />} />
              <Route path="/ciclo/2026"     element={<Ciclo2026 />} />
              <Route path="/organigrama"    element={<Organigrama />} />
              <Route path="/puestos"        element={<Puestos />} />
              <Route path="/puestos/:id"    element={<PuestoDetalle />} />
              <Route path="/mi-puesto"      element={<MiPuesto />} />
              <Route path="/objetivos"      element={<Objetivos />} />
              <Route path="/cambios"        element={<Cambios />} />
              <Route path="/procedimientos" element={<Procedimientos />} />
              <Route path="/riesgos-amfe"   element={<RiesgosAMFE />} />
              <Route path="/profile"        element={<Profile />} />
              <Route path="/employees"      element={<Employees />} />
              <Route path="/incidents"      element={<Incidents />} />
              <Route path="/environmental"  element={<Environmental />} />
              <Route path="/documents"      element={<Documents />} />
              <Route path="/satisfaction"   element={<CustomerSatisfaction />} />
              <Route path="/sistema-gestion" element={<SistemaGestion />} />
              <Route path="/suppliers"      element={<Suppliers />} />
              <Route path="/context"        element={<Context />} />
              <Route path="/calendar"       element={<Calendar />} />
              {/* Catch-all for pages still in development */}
              <Route path="/:slug"          element={<Suspense fallback={<PageFallback />}><Placeholder /></Suspense>} />
            </Route>
                  <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset-password" element={<ResetPassword />} />
        <Route path="/request-access" element={<RequestAccess />} />
              <Route path="/auditor" element={<Auditor />} />
        <Route path="/mis-pendientes" element={<MisPendientes />} />
      </Routes>
        </BrowserRouter>
      </AuthProvider>
    </QueryClientProvider>
  );
}
