import { SimplePie, SimpleBar } from '@/components/charts';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell
} from 'recharts';
import { Zap, Shield, Scale, BookOpen, ClipboardList,
         AlertTriangle, CheckCircle2, Clock, ChevronRight } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { api } from '@/lib/api';
import { Header } from '@/components/layout/Header';
import { KPICard, Badge, FINDING_STATUS, FINDING_TYPE, TASK_STATUS,
         Avatar, PriorityDot, Spinner, PageContent } from '@/components/ui';

interface Stats {
  openFindings: number; overdueFindings: number; highRisks: number;
  mediumRisks: number; expiringLegal: number; expiredLegal: number;
  upcomingTrainings: number; openIncidents: number;
  myPendingTasks: number; myOverdueTasks: number;
}
interface Task {
  id: string; title: string; status: string; priority: string;
  due_date?: string; source_module: string; finding_code?: string;
}
interface Finding {
  id: string; code: string; title: string; finding_type: string;
  status: string; area: string; created_at: string;
}
interface LegalReq {
  id: string; code: string; title: string; applicable_area: string;
  expiration_date: string; computed_status: string; days_remaining: number;
}

const NC_TREND = [
  { mes: 'Oct', abiertas: 3, cerradas: 2 },
  { mes: 'Nov', abiertas: 5, cerradas: 3 },
  { mes: 'Dic', abiertas: 4, cerradas: 5 },
  { mes: 'Ene', abiertas: 6, cerradas: 4 },
  { mes: 'Feb', abiertas: 4, cerradas: 6 },
  { mes: 'Mar', abiertas: 8, cerradas: 3 },
];

export default function Dashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const { data: stats, isLoading: statsLoading } = useQuery<Stats>({
    queryKey: ['dashboard-stats'],
    queryFn: () => api.get('/dashboard/stats'),
    refetchInterval: 30_000,
  });
  const { data: myTasks = [] } = useQuery<Task[]>({
    queryKey: ['my-tasks'],
    queryFn: () => api.get('/dashboard/my-tasks'),
  });
  const { data: findings = [] } = useQuery<Finding[]>({
    queryKey: ['findings-top'],
    queryFn: () => api.get('/findings?status=abierto'),
  });
  const { data: legal = [] } = useQuery<LegalReq[]>({
    queryKey: ['legal-alerts'],
    queryFn: () => api.get('/legal'),
    select: (data) => data.filter(l =>
      l.computed_status === 'vencido' || l.computed_status === 'por_vencer'
    ),
  });

  const totalAlerts = (stats?.expiredLegal ?? 0) + (stats?.expiringLegal ?? 0);
  const riskDist = [
    { name: 'Alto',  value: stats?.highRisks ?? 0,   color: '#ef4444' },
    { name: 'Medio', value: stats?.mediumRisks ?? 0, color: '#f59e0b' },
  ];
  const daysOpen = (createdAt: string) =>
    Math.floor((Date.now() - new Date(createdAt).getTime()) / 86_400_000);

  return (
    <>
      <Header
        title="Dashboard"
        subtitle={`Bienvenido, ${user?.full_name?.split(' ')[0]} · ${new Date().toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long' })}`}
        alerts={totalAlerts}
      />
      <PageContent>
        {statsLoading ? (
          <div className="flex items-center justify-center h-64"><Spinner size={32} /></div>
        ) : (
          <div className="space-y-4 md:space-y-5">

            {/* KPI Row 1 — 2 cols mobile / 4 cols desktop */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5 md:gap-3">
              <KPICard label="NC Abiertas" value={stats?.openFindings ?? 0}
                sub={stats?.overdueFindings ? `${stats.overdueFindings} vencidas` : 'Sin vencidas'}
                icon={<Zap size={16} />} alert={(stats?.overdueFindings ?? 0) > 0}
                onClick={() => navigate('/findings')} />
              <KPICard label="Riesgos Altos" value={stats?.highRisks ?? 0}
                sub="NPR significativo" icon={<Shield size={16} />}
                alert={(stats?.highRisks ?? 0) > 0} alertColor="#f59e0b"
                onClick={() => navigate('/risks')} />
              <KPICard label="Legal / Venc."
                value={(stats?.expiredLegal ?? 0) + (stats?.expiringLegal ?? 0)}
                sub={`${stats?.expiredLegal ?? 0} venc. · ${stats?.expiringLegal ?? 0} próx.`}
                icon={<Scale size={16} />} alert={(stats?.expiredLegal ?? 0) > 0}
                onClick={() => navigate('/legal')} />
              <KPICard label="Capacitaciones" value={stats?.upcomingTrainings ?? 0}
                sub="Próximos 30 días" icon={<BookOpen size={16} />}
                onClick={() => navigate('/trainings')} />
            </div>

            {/* KPI Row 2 */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5 md:gap-3">
              <KPICard label="Mis Tareas" value={stats?.myPendingTasks ?? 0}
                sub={stats?.myOverdueTasks ? `${stats.myOverdueTasks} vencidas` : 'Al día'}
                icon={<ClipboardList size={16} />} alert={(stats?.myOverdueTasks ?? 0) > 0} />
              <KPICard label="Incidentes" value={stats?.openIncidents ?? 0}
                sub="Sin cerrar" icon={<AlertTriangle size={16} />}
                alert={(stats?.openIncidents ?? 0) > 0}
                onClick={() => navigate('/incidents')} />
              <KPICard label="ISO 9001" value="12/14"
                sub="Procedimientos aprobados" icon={<CheckCircle2 size={16} />} />
              <KPICard label="ISO 45001" value="8/10"
                sub="Riesgos documentados" icon={<Shield size={16} />} />
            </div>

            {/* Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 md:gap-4">
              <div className="lg:col-span-2 bg-white rounded-xl border border-gray-200 p-4 md:p-5">
                <p className="text-[13px] font-bold text-gray-800 mb-0.5">Evolución de No Conformidades</p>
                <p className="text-[11px] text-gray-400 mb-4">Últimos 6 meses — abiertas vs cerradas</p>
                <ResponsiveContainer width="100%" height={160}>
                  <BarChart data={NC_TREND} barGap={4} barCategoryGap="30%">
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                    <XAxis dataKey="mes" tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                    <Tooltip contentStyle={{ borderRadius: 8, border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,.1)', fontSize: 12 }} />
                    <Bar dataKey="abiertas" fill="#BF1E2E" radius={[4,4,0,0]} name="Abiertas" />
                    <Bar dataKey="cerradas"  fill="#10b981" radius={[4,4,0,0]} name="Cerradas" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <div className="bg-white rounded-xl border border-gray-200 p-4 md:p-5">
                <p className="text-[13px] font-bold text-gray-800 mb-0.5">Distribución Riesgos</p>
                <p className="text-[11px] text-gray-400 mb-3">Por nivel de IR (P×S)</p>
                <ResponsiveContainer width="100%" height={110}>
                  <PieChart>
                    <Pie data={riskDist} cx="50%" cy="50%" innerRadius={32} outerRadius={48} paddingAngle={3} dataKey="value">
                      {riskDist.map((d, i) => <Cell key={i} fill={d.color} />)}
                    </Pie>
                    <Tooltip contentStyle={{ borderRadius: 8, border: 'none', fontSize: 12 }} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="space-y-1.5 mt-2">
                  {riskDist.map(d => (
                    <div key={d.name} className="flex items-center justify-between text-[11px]">
                      <div className="flex items-center gap-1.5">
                        <div className="w-2 h-2 rounded-sm flex-shrink-0" style={{ background: d.color }} />
                        <span className="text-gray-500">{d.name}</span>
                      </div>
                      <span className="font-bold text-gray-800">{d.value}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Bottom row */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 md:gap-4">
              {/* My tasks */}
              <div className="bg-white rounded-xl border border-gray-200 p-4 md:p-5">
                <div className="flex items-center justify-between mb-3">
                  <p className="text-[13px] font-bold text-gray-800">Mis Tareas</p>
                  <button onClick={() => navigate('/tasks')}
                    className="text-[11px] text-dassa-red hover:underline flex items-center gap-0.5 touch-manipulation">
                    Ver todas <ChevronRight size={12} />
                  </button>
                </div>
                <div className="space-y-2">
                  {myTasks.slice(0, 6).map(t => {
                    const ts = TASK_STATUS[t.status];
                    const overdue = t.due_date && new Date(t.due_date) < new Date();
                    return (
                      <div key={t.id} className={[
                        'flex items-center gap-2.5 p-2.5 rounded-lg border text-[12px] min-h-[52px]',
                        overdue ? 'border-red-100 bg-red-50' : 'border-gray-100 bg-gray-50',
                      ].join(' ')}>
                        <PriorityDot priority={t.priority} />
                        <span className="flex-1 min-w-0 font-medium text-gray-700 leading-snug line-clamp-2">
                          {t.title}
                        </span>
                        {t.finding_code && (
                          <code className="text-[9px] font-bold text-dassa-red bg-dassa-red-tint px-1.5 py-0.5 rounded flex-shrink-0">
                            {t.finding_code}
                          </code>
                        )}
                        <div className="flex flex-col items-end gap-1 flex-shrink-0">
                          {t.due_date && (
                            <span className={`text-[10px] font-semibold flex items-center gap-0.5
                              ${overdue ? 'text-red-500' : 'text-gray-400'}`}>
                              <Clock size={9} />
                              {new Date(t.due_date).toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit' })}
                            </span>
                          )}
                          {ts && <Badge label={ts.label} variant={ts.variant} size="sm" />}
                        </div>
                      </div>
                    );
                  })}
                  {myTasks.length === 0 && (
                    <div className="text-center py-8 text-gray-400">
                      <CheckCircle2 size={28} className="mx-auto mb-2 text-emerald-300" />
                      <p className="text-[12px] font-medium">Sin tareas pendientes</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Findings + Legal */}
              <div className="space-y-3 md:space-y-4">
                <div className="bg-white rounded-xl border border-gray-200 p-4 md:p-5">
                  <div className="flex items-center justify-between mb-3">
                    <p className="text-[13px] font-bold text-gray-800">Hallazgos Activos</p>
                    <button onClick={() => navigate('/findings')}
                      className="text-[11px] text-dassa-red hover:underline flex items-center gap-0.5 touch-manipulation">
                      Kanban <ChevronRight size={12} />
                    </button>
                  </div>
                  <div className="space-y-2">
                    {findings.slice(0, 4).map(f => {
                      const sc = FINDING_STATUS[f.status];
                      const d = daysOpen(f.created_at);
                      return (
                        <div key={f.id}
                          onClick={() => navigate(`/findings/${f.id}`)}
                          className={[
                            'flex items-center gap-2 p-2.5 rounded-lg border cursor-pointer',
                            'transition-colors touch-manipulation min-h-[44px]',
                            d > 15 ? 'border-red-100 bg-red-50 hover:bg-red-100' : 'border-gray-100 hover:bg-gray-50',
                          ].join(' ')}>
                          <code className="text-[9px] font-extrabold text-dassa-red-deep bg-dassa-red-tint px-1.5 py-0.5 rounded flex-shrink-0">
                            {f.code}
                          </code>
                          <span className="flex-1 min-w-0 text-[11px] font-medium text-gray-700 line-clamp-1">{f.title}</span>
                          {sc && <Badge label={sc.label} variant={sc.variant} size="sm" />}
                          <span className={`text-[10px] font-bold flex-shrink-0 ${d > 15 ? 'text-red-500' : 'text-gray-400'}`}>{d}d</span>
                        </div>
                      );
                    })}
                    {findings.length === 0 && (
                      <p className="text-center text-[12px] text-gray-400 py-4">✓ Sin hallazgos abiertos</p>
                    )}
                  </div>
                </div>

                {legal.length > 0 && (
                  <div className="bg-white rounded-xl border border-gray-200 p-4 md:p-5">
                    <div className="flex items-center justify-between mb-3">
                      <p className="text-[13px] font-bold text-gray-800">⚠ Vencimientos Legales</p>
                      <button onClick={() => navigate('/legal')}
                        className="text-[11px] text-dassa-red hover:underline flex items-center gap-0.5 touch-manipulation">
                        Ver todos <ChevronRight size={12} />
                      </button>
                    </div>
                    <div className="space-y-2">
                      {legal.slice(0, 3).map(l => (
                        <div key={l.id} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0 gap-3">
                          <div className="min-w-0 flex-1">
                            <p className="text-[12px] font-semibold text-gray-700 truncate">{l.title}</p>
                            <p className="text-[10px] text-gray-400">{l.applicable_area} · {l.expiration_date}</p>
                          </div>
                          <span className={`text-[11px] font-bold px-2.5 py-1 rounded-full flex-shrink-0
                            ${l.computed_status === 'vencido' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'}`}>
                            {l.computed_status === 'vencido' ? 'VENCIDO' : `${l.days_remaining}d`}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

          </div>
        )}
      <DashboardCharts/>
    </PageContent>
    </>
  );
}


import { useQuery as useQ2 } from '@tanstack/react-query';
import { api as api2 } from '@/lib/api';

function DashboardCharts() {
  const { data, isLoading } = useQ2<any>({
    queryKey: ['dashboard-charts'],
    queryFn: () => api2.get('/dashboard/charts'),
  });
  if (isLoading || !data) return null;
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 mt-6">
      <SimplePie title="🥧 Riesgos AMFE por nivel" data={data.risks_by_level || []}/>
      <SimplePie title="👥 Empleados por sector" data={data.employees_by_sector || []}/>
      <SimpleBar title="📋 NCs por estado" data={data.findings_by_status || []}/>
      <SimpleBar title="🛒 Compras por estado" data={data.purchases_by_status || []}/>
      <SimpleBar title="⚠ Incidentes último año" data={data.incidents_by_severity || []}/>
      <SimplePie title="🎓 Capacitaciones por estado" data={data.trainings_by_status || []}/>
    </div>
  );
}
