import { useState, useEffect } from "react";
import { Outlet, useLocation } from "react-router-dom";
import Sidebar from "./Sidebar";
import TopNav from "./TopNav";
import BottomNav from "./BottomNav";
import { LayoutContext } from "./LayoutContext";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Breadcrumbs } from "@/components/ui/Breadcrumbs";
import { useKeyboardShortcuts } from "@/hooks/useKeyboardShortcuts";

interface DashStats {
  openFindings: number;
  expiredLegal: number;
  expiringLegal: number;
}

export default function AppLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const location = useLocation();
  useKeyboardShortcuts();

  // Auto-cerrar drawer mobile al navegar
  useEffect(() => { setSidebarOpen(false); }, [location.pathname]);

  const { data: stats } = useQuery<DashStats>({
    queryKey: ["dashboard-stats-nav"],
    queryFn: () => api.get("/dashboard/stats"),
    refetchInterval: 60_000,
  });

  const legalAlerts = (stats?.expiredLegal ?? 0) + (stats?.expiringLegal ?? 0);

  return (
    <LayoutContext.Provider
      value={{
        openSidebar: () => setSidebarOpen(true),
        closeSidebar: () => setSidebarOpen(false),
        isSidebarOpen: sidebarOpen,
      }}
    >
      <div className="flex flex-col h-[100dvh] overflow-hidden bg-slate-50">
        <TopNav onMenuClick={() => setSidebarOpen(true)} />

        {/* Backdrop drawer mobile */}
        <div
          className={`md:hidden fixed inset-0 bg-slate-900/60 backdrop-blur-[1px] z-30 transition-opacity duration-200 ${
            sidebarOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
          }`}
          onClick={() => setSidebarOpen(false)}
          aria-hidden="true"
        />

        <Sidebar
          openFindings={stats?.openFindings ?? 0}
          legalAlerts={legalAlerts}
          isOpen={sidebarOpen}
          onClose={() => setSidebarOpen(false)}
        />

        {/* Main content area: padded for fixed sidebar on md+ y bottomnav on mobile */}
        <main
          className="flex-1 overflow-y-auto overflow-x-hidden md:ml-[220px]"
          style={{ paddingBottom: "calc(3.75rem + env(safe-area-inset-bottom, 0px))" }}
        >
          <Breadcrumbs />
          <Outlet />
        </main>

        <BottomNav />
      </div>
    </LayoutContext.Provider>
  );
}
