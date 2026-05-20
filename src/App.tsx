import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { lazy, Suspense } from 'react';
import { AuthProvider, useAuth } from '@/contexts/AuthContext';
import AppLayout from '@/components/layout/AppLayout';
import Login from '@/pages/Login';
import { Spinner } from '@/components/ui';

// Login y el shell (AppLayout) se cargan estáticos — son la primera pantalla.
// Todo el resto va lazy: así el bundle inicial no arrastra recharts ni las 40
// páginas internas. Cada página se descarga sólo al navegar a su ruta (H-11).
const Bienvenida          = lazy(() => import('@/pages/Bienvenida'));
const Triny               = lazy(() => import('@/pages/Triny'));
const PactosAdmin         = lazy(() => import('@/pages/PactosAdmin'));
const NovedadesAdmin      = lazy(() => import('@/pages/NovedadesAdmin'));
const AgentSettings       = lazy(() => import('@/pages/AgentSettings'));
const Ciclo2026           = lazy(() => import('@/pages/Ciclo2026'));
const Organigrama         = lazy(() => import('@/pages/Organigrama'));
const Puestos             = lazy(() => import('@/pages/Puestos'));
const PuestoDetalle       = lazy(() => import('@/pages/PuestoDetalle'));
const MiPuesto            = lazy(() => import('@/pages/MiPuesto'));
const Objetivos           = lazy(() => import('@/pages/Objetivos'));
const Cambios             = lazy(() => import('@/pages/Cambios'));
const Procedimientos      = lazy(() => import('@/pages/Procedimientos'));
const RiesgosAMFE         = lazy(() => import('@/pages/RiesgosAMFE'));
const NixaInbox           = lazy(() => import('@/pages/NixaInbox'));
const BIOperativo         = lazy(() => import('@/pages/BIOperativo'));
const CalendarioNixa      = lazy(() => import('@/pages/CalendarioNixa'));
const Register            = lazy(() => import('@/pages/Register'));
const Dashboard           = lazy(() => import('@/pages/Dashboard'));
const Findings            = lazy(() => import('@/pages/Findings'));
const Risks               = lazy(() => import('@/pages/Risks'));
const Legal               = lazy(() => import('@/pages/Legal'));
const Purchases           = lazy(() => import('@/pages/Purchases'));
const Committee           = lazy(() => import('@/pages/Committee'));
const Users               = lazy(() => import('@/pages/Users'));
const Profile             = lazy(() => import('@/pages/Profile'));
const Trainings           = lazy(() => import('@/pages/Trainings'));
const Employees           = lazy(() => import('@/pages/Employees'));
const Incidents           = lazy(() => import('@/pages/Incidents'));
const Environmental       = lazy(() => import('@/pages/Environmental'));
const Documents           = lazy(() => import('@/pages/Documents'));
const CustomerSatisfaction = lazy(() => import('@/pages/CustomerSatisfaction'));
const SistemaGestion      = lazy(() => import('@/pages/SistemaGestion'));
const Suppliers           = lazy(() => import('@/pages/Suppliers'));
const Context             = lazy(() => import('@/pages/Context'));
const Calendar            = lazy(() => import('@/pages/Calendar'));
const PublicNC            = lazy(() => import('@/pages/PublicNC'));
const SignupEmpresa       = lazy(() => import('@/pages/SignupEmpresa'));
const ForgotPassword      = lazy(() => import('@/pages/ForgotPassword'));
const ResetPassword       = lazy(() => import('@/pages/ResetPassword'));
const RequestAccess       = lazy(() => import('@/pages/RequestAccess'));
const Auditor             = lazy(() => import('@/pages/Auditor'));
const MisPendientes       = lazy(() => import('@/pages/MisPendientes'));
const Rondas              = lazy(() => import('@/pages/Rondas'));
const RondaDetalle        = lazy(() => import('@/pages/RondaDetalle'));
const RondasConfig        = lazy(() => import('@/pages/RondasConfig'));
const RondasMaquinaria    = lazy(() => import('@/pages/RondasMaquinaria'));
const PublicChecklist     = lazy(() => import('@/pages/PublicChecklist'));
const ContactosExternos   = lazy(() => import('@/pages/ContactosExternos'));
const Placeholder         = lazy(() => import('@/pages/Placeholder'));

const qc = new QueryClient({
  defaultOptions: { queries: { staleTime: 30_000, retry: 1, refetchOnWindowFocus: false } },
});

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

export default function App() {
  return (
    <QueryClientProvider client={qc}>
      <AuthProvider>
        <BrowserRouter>
          <Suspense fallback={<LoadingScreen />}>
          <Routes>
            <Route path="/login"      element={<Login />} />
            <Route path="/register"   element={<Register />} />
            <Route path="/signup-empresa" element={<SignupEmpresa />} />
            <Route path="/reporte-nc" element={<PublicNC />} />
            <Route path="/checklist-maquina" element={<PublicChecklist />} />
            <Route path="/"           element={<Navigate to="/login" replace />} />
            <Route path="/home"       element={<Navigate to="/bienvenida" replace />} />
            <Route path="/tasks"      element={<Navigate to="/mis-pendientes" replace />} />
            <Route element={<ProtectedRoute><AppLayout /></ProtectedRoute>}>
              <Route path="/bienvenida"     element={<Bienvenida />} />
              <Route path="/triny"          element={<Triny />} />
              <Route path="/admin/pactos"   element={<PactosAdmin />} />
              <Route path="/admin/novedades" element={<NovedadesAdmin />} />
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
              <Route path="/inbox-nixa"     element={<NixaInbox />} />
              <Route path="/bi-operativo"   element={<BIOperativo />} />
              <Route path="/calendario-nixa" element={<CalendarioNixa />} />
              <Route path="/profile"        element={<Profile />} />
              <Route path="/employees"      element={<Employees />} />
              <Route path="/contactos-externos" element={<ContactosExternos />} />
              <Route path="/incidents"      element={<Incidents />} />
              <Route path="/environmental"  element={<Environmental />} />
              <Route path="/documents"      element={<Documents />} />
              <Route path="/satisfaction"   element={<CustomerSatisfaction />} />
              <Route path="/sistema-gestion" element={<SistemaGestion />} />
              <Route path="/suppliers"      element={<Suppliers />} />
              <Route path="/context"        element={<Context />} />
              <Route path="/calendar"       element={<Calendar />} />
              <Route path="/mis-pendientes" element={<MisPendientes />} />
              <Route path="/rondas"            element={<Rondas />} />
              <Route path="/rondas/config"     element={<RondasConfig />} />
              <Route path="/rondas/maquinaria" element={<RondasMaquinaria />} />
              <Route path="/rondas/:id"        element={<RondaDetalle />} />
              <Route path="/auditor"        element={<Auditor />} />
              {/* Catch-all for pages still in development */}
              <Route path="/:slug"          element={<Placeholder />} />
            </Route>
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/reset-password" element={<ResetPassword />} />
            <Route path="/request-access" element={<RequestAccess />} />
          </Routes>
          </Suspense>
        </BrowserRouter>
      </AuthProvider>
    </QueryClientProvider>
  );
}
