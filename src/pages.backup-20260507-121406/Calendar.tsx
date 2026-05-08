import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  ChevronLeft, ChevronRight, GraduationCap, Scale,
  Users as UsersIcon, CheckSquare, Calendar as CalIcon
} from 'lucide-react';
import { api } from '@/lib/api';
import { Header } from '@/components/layout/Header';
import { Spinner, KPICard, PageContent, Badge } from '@/components/ui';

// ─── Types ──────────────────────────────────────────────────
interface CalTraining { id: string; title: string; scheduled_date: string; training_type: string; is_mandatory: boolean; }
interface CalLegal { id: string; code: string; title: string; expiration_date: string; applicable_area: string; }
interface CalCommittee { id: string; meeting_date: string; status: string; }
interface CalTask { id: string; title: string; due_date: string; priority: string; status: string; }
interface CalendarData { trainings: CalTraining[]; legal: CalLegal[]; committee: CalCommittee[]; tasks: CalTask[]; }

interface DayEvent {
  date: string;
  type: 'training' | 'legal' | 'committee' | 'task';
  label: string;
  sub?: string;
  color: string;
  icon: typeof GraduationCap;
}

const EVENT_CONFIG = {
  training:  { color: 'bg-purple-100 text-purple-700 border-purple-200', dot: 'bg-purple-500', icon: GraduationCap, label: 'Capacitación' },
  legal:     { color: 'bg-amber-100 text-amber-700 border-amber-200',   dot: 'bg-amber-500',  icon: Scale, label: 'Req. Legal' },
  committee: { color: 'bg-blue-100 text-blue-700 border-blue-200',      dot: 'bg-blue-500',   icon: UsersIcon, label: 'Comité' },
  task:      { color: 'bg-emerald-100 text-emerald-700 border-emerald-200', dot: 'bg-emerald-500', icon: CheckSquare, label: 'Tarea' },
} as const;

const PRIORITY_COLORS: Record<string, string> = {
  urgente: 'text-red-600', alta: 'text-orange-500', media: 'text-amber-500', baja: 'text-slate-400',
};

const DAYS = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
const MONTHS = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];

// ─── Helpers ────────────────────────────────────────────────
function toDateStr(d: string) { return d?.slice(0, 10) || ''; }

function getDaysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate();
}
function getFirstDayOfWeek(year: number, month: number) {
  return new Date(year, month, 1).getDay();
}

// ─── Component ──────────────────────────────────────────────
export default function Calendar() {
  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth());
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [view, setView] = useState<'calendar' | 'list'>('calendar');

  const { data, isLoading } = useQuery<CalendarData>({
    queryKey: ['calendar'],
    queryFn: () => api.get('/dashboard/calendar'),
  });

  // Build events map
  const events = useMemo(() => {
    if (!data) return new Map<string, DayEvent[]>();
    const map = new Map<string, DayEvent[]>();
    const add = (date: string, ev: DayEvent) => {
      const d = toDateStr(date);
      if (!d) return;
      if (!map.has(d)) map.set(d, []);
      map.get(d)!.push(ev);
    };

    data.trainings.forEach((t) => add(t.scheduled_date, {
      date: toDateStr(t.scheduled_date), type: 'training',
      label: t.title, sub: t.is_mandatory ? 'Obligatoria' : 'Opcional',
      color: EVENT_CONFIG.training.color, icon: EVENT_CONFIG.training.icon,
    }));
    data.legal.forEach((l) => add(l.expiration_date, {
      date: toDateStr(l.expiration_date), type: 'legal',
      label: `${l.code} — ${l.title}`, sub: l.applicable_area,
      color: EVENT_CONFIG.legal.color, icon: EVENT_CONFIG.legal.icon,
    }));
    data.committee.forEach((c) => add(c.meeting_date, {
      date: toDateStr(c.meeting_date), type: 'committee',
      label: 'Reunión de Comité', sub: c.status,
      color: EVENT_CONFIG.committee.color, icon: EVENT_CONFIG.committee.icon,
    }));
    data.tasks.forEach((t) => add(t.due_date, {
      date: toDateStr(t.due_date), type: 'task',
      label: t.title, sub: t.priority,
      color: EVENT_CONFIG.task.color, icon: EVENT_CONFIG.task.icon,
    }));

    return map;
  }, [data]);

  const allEvents = useMemo(() => {
    return Array.from(events.values()).flat().sort((a, b) => a.date.localeCompare(b.date));
  }, [events]);

  const selectedEvents = selectedDate ? (events.get(selectedDate) || []) : [];

  // Calendar nav
  const prevMonth = () => { if (month === 0) { setMonth(11); setYear(year - 1); } else setMonth(month - 1); };
  const nextMonth = () => { if (month === 11) { setMonth(0); setYear(year + 1); } else setMonth(month + 1); };
  const goToday = () => { setYear(today.getFullYear()); setMonth(today.getMonth()); };

  const daysInMonth = getDaysInMonth(year, month);
  const firstDay = getFirstDayOfWeek(year, month);
  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

  if (isLoading) return <><Header title="Calendario Global" subtitle="Vencimientos, capacitaciones, comités y tareas" /><PageContent><div className="flex justify-center py-20"><Spinner size={28} /></div></PageContent></>;

  return (
    <>
      <Header title="Calendario Global" subtitle="Próximos 60 días — vencimientos, capacitaciones, comités y tareas" />
      <PageContent>
        {/* KPIs */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
          <KPICard label="Capacitaciones" value={data?.trainings.length || 0} icon={<GraduationCap size={18} />} />
          <KPICard label="Venc. Legales" value={data?.legal.length || 0} icon={<Scale size={18} />} alert={data && data.legal.length > 0} alertColor="amber" />
          <KPICard label="Comités" value={data?.committee.length || 0} icon={<UsersIcon size={18} />} />
          <KPICard label="Mis Tareas" value={data?.tasks.length || 0} icon={<CheckSquare size={18} />} />
        </div>

        {/* View toggle */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex gap-1 bg-slate-100 rounded-lg p-1">
            <button onClick={() => setView('calendar')} className={`px-3 py-1.5 rounded-md text-[13px] font-semibold ${view === 'calendar' ? 'bg-white text-blue-700 shadow-sm' : 'text-slate-500'}`}>
              Calendario
            </button>
            <button onClick={() => setView('list')} className={`px-3 py-1.5 rounded-md text-[13px] font-semibold ${view === 'list' ? 'bg-white text-blue-700 shadow-sm' : 'text-slate-500'}`}>
              Lista
            </button>
          </div>
          {view === 'calendar' && (
            <div className="flex items-center gap-2">
              <button onClick={prevMonth} className="p-1.5 hover:bg-slate-100 rounded-lg"><ChevronLeft size={16} /></button>
              <span className="text-sm font-bold text-slate-700 min-w-[140px] text-center">{MONTHS[month]} {year}</span>
              <button onClick={nextMonth} className="p-1.5 hover:bg-slate-100 rounded-lg"><ChevronRight size={16} /></button>
              <button onClick={goToday} className="ml-2 px-2.5 py-1 text-[12px] font-semibold text-blue-600 hover:bg-blue-50 rounded-lg">Hoy</button>
            </div>
          )}
        </div>

        {view === 'calendar' ? (
          <div className="flex gap-4">
            {/* Calendar Grid */}
            <div className="flex-1">
              <div className="grid grid-cols-7 gap-px bg-slate-200 rounded-xl overflow-hidden border border-slate-200">
                {/* Header */}
                {DAYS.map((d) => (
                  <div key={d} className="bg-slate-50 text-center py-2 text-[11px] font-bold text-slate-500 uppercase">{d}</div>
                ))}
                {/* Blanks */}
                {Array.from({ length: firstDay }).map((_, i) => (
                  <div key={`b-${i}`} className="bg-white min-h-[80px]" />
                ))}
                {/* Days */}
                {Array.from({ length: daysInMonth }).map((_, i) => {
                  const day = i + 1;
                  const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                  const dayEvents = events.get(dateStr) || [];
                  const isToday = dateStr === todayStr;
                  const isSelected = dateStr === selectedDate;
                  return (
                    <div
                      key={day}
                      onClick={() => setSelectedDate(dateStr === selectedDate ? null : dateStr)}
                      className={`bg-white min-h-[80px] p-1.5 cursor-pointer hover:bg-blue-50/50 transition-colors ${isSelected ? 'ring-2 ring-blue-500 ring-inset' : ''}`}
                    >
                      <span className={`text-[12px] font-semibold inline-flex items-center justify-center w-6 h-6 rounded-full ${isToday ? 'bg-blue-600 text-white' : 'text-slate-600'}`}>
                        {day}
                      </span>
                      <div className="mt-0.5 space-y-0.5">
                        {dayEvents.slice(0, 3).map((ev, idx) => {
                          const cfg = EVENT_CONFIG[ev.type];
                          return (
                            <div key={idx} className={`flex items-center gap-1 px-1 py-0.5 rounded text-[10px] font-medium truncate ${cfg.color}`}>
                              <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot} flex-shrink-0`} />
                              <span className="truncate">{ev.label}</span>
                            </div>
                          );
                        })}
                        {dayEvents.length > 3 && (
                          <span className="text-[10px] text-slate-400 pl-1">+{dayEvents.length - 3} más</span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Side Panel */}
            <div className="w-72 flex-shrink-0">
              <div className="bg-white border border-slate-200 rounded-xl p-4 sticky top-4">
                <h3 className="font-bold text-sm text-slate-700 mb-3">
                  {selectedDate
                    ? new Date(selectedDate + 'T12:00:00').toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long' })
                    : 'Seleccioná un día'}
                </h3>
                {!selectedDate && <p className="text-[12px] text-slate-400">Hacé clic en un día del calendario para ver sus eventos.</p>}
                {selectedDate && selectedEvents.length === 0 && <p className="text-[12px] text-slate-400">Sin eventos este día.</p>}
                <div className="space-y-2 mt-2">
                  {selectedEvents.map((ev, i) => {
                    const cfg = EVENT_CONFIG[ev.type];
                    const Icon = cfg.icon;
                    return (
                      <div key={i} className={`border rounded-lg p-2.5 ${cfg.color}`}>
                        <div className="flex items-center gap-1.5 mb-1">
                          <Icon size={13} />
                          <span className="text-[11px] font-bold uppercase">{cfg.label}</span>
                        </div>
                        <p className="text-[12px] font-semibold">{ev.label}</p>
                        {ev.sub && <p className="text-[11px] opacity-75">{ev.sub}</p>}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        ) : (
          /* List View */
          <div className="space-y-2">
            {allEvents.length === 0 && <p className="text-center text-slate-400 text-[13px] py-10">No hay eventos en los próximos 60 días.</p>}
            {allEvents.map((ev, i) => {
              const cfg = EVENT_CONFIG[ev.type];
              const Icon = cfg.icon;
              return (
                <div key={i} className="bg-white border border-slate-200 rounded-lg p-3 flex items-center gap-3">
                  <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${cfg.color}`}>
                    <Icon size={16} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] font-semibold text-slate-700 truncate">{ev.label}</p>
                    <div className="flex items-center gap-2 text-[11px] text-slate-400">
                      <span>{cfg.label}</span>
                      {ev.sub && <><span>·</span><span>{ev.sub}</span></>}
                    </div>
                  </div>
                  <span className="text-[12px] font-medium text-slate-500 flex-shrink-0">
                    {new Date(ev.date + 'T12:00:00').toLocaleDateString('es-AR', { day: '2-digit', month: 'short' })}
                  </span>
                </div>
              );
            })}
          </div>
        )}

        {/* Legend */}
        <div className="flex items-center gap-4 mt-5 pt-4 border-t">
          {Object.entries(EVENT_CONFIG).map(([key, cfg]) => (
            <div key={key} className="flex items-center gap-1.5 text-[11px] text-slate-500">
              <span className={`w-2.5 h-2.5 rounded-full ${cfg.dot}`} />
              {cfg.label}
            </div>
          ))}
        </div>
      </PageContent>
    </>
  );
}
