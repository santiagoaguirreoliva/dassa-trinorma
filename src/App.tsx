import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider, useAuth } from '@/contexts/AuthContext';
import AppLayout from '@/components/layout/AppLayout';
import Login from '@/pages/Login';
import Register from '@/pages/Register';
import Dashboard from '@/pages/Dashboard';
import Findings from '@/pages/Findings';
import Risks from '@/pages/Risks';
import Purchases from '@/pages/Purchases';
import Committee from '@/pages/Committee';
import Users from '@/pages/Users';
import Profile from '@/pages/Profile';
import PublicNC from '@/pages/PublicNC';
import { Spinner } from '@/components/ui';
import { lazy, Suspense } from 'react';

const qc = new QueryClient({
  defaultOptions: { queries: { staleTime: 30_000, retry: 1, refetchOnWindowFocus: false } },
});

const Legal        = lazy(() => import('@/pages/Placeholder').then(m => ({ default: m.Legal })));
const Trainings    = lazy(() => import('@/pages/Placeholder').then(m => ({ default: m.Trainings })));
const Employees    = lazy(() => import('@/pages/Placeholder').then(m => ({ default: m.Employees })));
const Incidents    = lazy(() => import('@/pages/Placeholder').then(m => ({ default: m.Incidents })));
const Environmental= lazy(() => import('@/pages/Placeholder').then(m => ({ default: m.Environmental })));
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
            {/* Públicas */}
            <Route path="/login"      element={<Login />} />
            <Route path="/register"   element={<Register />} />
            <Route path="/reporte-nc" element={<PublicNC />} />
            <Route path="/"           element={<Navigate to="/dashboard" replace />} />

            {/* Privadas */}
            <Route element={<ProtectedRoute><AppLayout /></ProtectedRoute>}>
              <Route path="/dashboard"     element={<Dashboard />} />
              <Route path="/findings/*"    element={<Findings />} />
              <Route path="/risks"         element={<Risks />} />
              <Route path="/purchases"     element={<Purchases />} />
              <Route path="/committee"     element={<Committee />} />
              <Route path="/users"         element={<Users />} />
              <Route path="/profile"       element={<Profile />} />
              <Route path="/legal"         element={<Suspense fallback={<PageFallback />}><Legal /></Suspense>} />
              <Route path="/trainings"     element={<Suspense fallback={<PageFallback />}><Trainings /></Suspense>} />
              <Route path="/employees/*"   element={<Suspense fallback={<PageFallback />}><Employees /></Suspense>} />
              <Route path="/incidents"     element={<Suspense fallback={<PageFallback />}><Incidents /></Suspense>} />
              <Route path="/environmental" element={<Suspense fallback={<PageFallback />}><Environmental /></Suspense>} />
              <Route path="/:slug"         element={<Suspense fallback={<PageFallback />}><Placeholder /></Suspense>} />
            </Route>
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </QueryClientProvider>
  );
}
