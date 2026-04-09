import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';

interface DashStats {
  openFindings: number;
  expiredLegal: number;
  expiringLegal: number;
}

export default function AppLayout() {
  const { data: stats } = useQuery<DashStats>({
    queryKey: ['dashboard-stats-nav'],
    queryFn: () => api.get('/dashboard/stats'),
    refetchInterval: 60_000,
  });

  const legalAlerts = (stats?.expiredLegal ?? 0) + (stats?.expiringLegal ?? 0);

  return (
    <div className="flex h-screen overflow-hidden bg-slate-100">
      <Sidebar
        openFindings={stats?.openFindings ?? 0}
        legalAlerts={legalAlerts}
      />
      <div className="flex flex-col flex-1 overflow-hidden min-w-0">
        <Outlet />
      </div>
    </div>
  );
}
