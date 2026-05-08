import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import TopNav from './TopNav';
import BottomNav from './BottomNav';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';

interface DashStats {
  openFindings: number;
  expiredLegal: number;
  expiringLegal: number;
}

export default function AppLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const { data: stats } = useQuery<DashStats>({
    queryKey: ['dashboard-stats-nav'],
    queryFn: () => api.get('/dashboard/stats'),
    refetchInterval: 60_000,
  });

  const legalAlerts = (stats?.expiredLegal ?? 0) + (stats?.expiringLegal ?? 0);

  return (
    <div className="flex flex-col h-[100dvh] overflow-hidden bg-slate-100">
      {/* Top navigation */}
      <TopNav onMenuClick={() => setSidebarOpen(true)} />

      <div className="flex flex-1 overflow-hidden min-w-0 relative">
        {/* Mobile overlay — tap outside to close sidebar */}
        {sidebarOpen && (
          <div
            className="fixed inset-0 bg-black/50 z-40 md:hidden"
            onClick={() => setSidebarOpen(false)}
            aria-hidden="true"
          />
        )}

        <Sidebar
          openFindings={stats?.openFindings ?? 0}
          legalAlerts={legalAlerts}
          isOpen={sidebarOpen}
          onClose={() => setSidebarOpen(false)}
        />

        {/* Main content — shifted right on md+ to accommodate fixed sidebar */}
        <div className="flex flex-col flex-1 overflow-hidden min-w-0 md:ml-[220px]">
          <Outlet />
        </div>
      </div>

      {/* Bottom nav — only on mobile */}
      <BottomNav />
    </div>
  );
}
