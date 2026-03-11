import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AuthProvider } from "./contexts/AuthContext";
import { AppLayout } from "./components/layout/AppLayout";
import { LoadingScreen } from "./components/common/LoadingScreen";
import { useAuth } from "./contexts/AuthContext";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Dashboard from "./pages/Dashboard";
import Findings from "./pages/Findings";
import Risks from "./pages/Risks";
import Legal from "./pages/Legal";
import Trainings from "./pages/Trainings";
import Purchases from "./pages/Purchases";
import Documents from "./pages/Documents";
import OtherPages from "./pages/OtherPages";

const queryClient = new QueryClient({
  defaultOptions: { queries: { staleTime: 60_000, retry: 1 } },
});

function AppRoutes() {
  const { user, loading } = useAuth();
  if (loading) return <LoadingScreen />;
  if (!user) return <Routes><Route path="/register" element={<Register />} /><Route path="*" element={<Login />} /></Routes>;
  return (
    <AppLayout>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/findings" element={<Findings />} />
        <Route path="/risks" element={<Risks />} />
        <Route path="/legal" element={<Legal />} />
        <Route path="/trainings" element={<Trainings />} />
        <Route path="/purchases" element={<Purchases />} />
        <Route path="/documents" element={<Documents />} />
        <Route path="*" element={<OtherPages />} />
      </Routes>
    </AppLayout>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <PagesRouter>
        <AuthProvider>
          <AppRouter />
        </AuthProvider>
      </PagesRouter>
    </QueryClientProvider>
  );
}