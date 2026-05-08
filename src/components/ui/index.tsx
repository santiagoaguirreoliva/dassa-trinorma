import { ReactNode } from 'react';

// ─── Badge ───────────────────────────────────────────────────
interface BadgeProps {
  label: string;
  variant?: 'default' | 'red' | 'amber' | 'green' | 'blue' | 'purple' | 'pink' | 'gray';
  size?: 'sm' | 'md';
}

const VARIANTS = {
  default: 'bg-slate-100 text-slate-600',
  red:     'bg-red-100 text-red-700',
  amber:   'bg-amber-100 text-amber-700',
  green:   'bg-emerald-100 text-emerald-700',
  blue:    'bg-blue-100 text-blue-700',
  purple:  'bg-violet-100 text-violet-700',
  pink:    'bg-pink-100 text-pink-700',
  gray:    'bg-slate-100 text-slate-500',
};

export function Badge({ label, variant = 'default', size = 'md' }: BadgeProps) {
  return (
    <span className={`inline-flex items-center rounded-full font-semibold leading-none
      ${size === 'sm' ? 'text-[10px] px-1.5 py-0.5' : 'text-[11px] px-2 py-1'}
      ${VARIANTS[variant]}`}>
      {label}
    </span>
  );
}

// ─── Finding Status Badge ────────────────────────────────────
export const FINDING_STATUS: Record<string, { label: string; variant: BadgeProps['variant'] }> = {
  abierto:      { label: 'Abierto',         variant: 'red' },
  analisis:     { label: 'En Análisis',     variant: 'amber' },
  plan_accion:  { label: 'Plan de Acción',  variant: 'purple' },
  en_ejecucion: { label: 'En Ejecución',    variant: 'blue' },
  verificacion: { label: 'Verificación',    variant: 'pink' },
  cerrado:      { label: 'Cerrado',         variant: 'green' },
};

export const FINDING_TYPE: Record<string, { label: string; variant: BadgeProps['variant'] }> = {
  nc_real:        { label: 'NC Real',        variant: 'red' },
  nc_potencial:   { label: 'NC Potencial',   variant: 'amber' },
  mejora:         { label: 'Mejora',         variant: 'green' },
  desvio_cliente: { label: 'Desvío Cliente', variant: 'blue' },
};

export const RISK_LEVEL: Record<string, { label: string; variant: BadgeProps['variant'] }> = {
  alto:  { label: 'Alto',  variant: 'red' },
  medio: { label: 'Medio', variant: 'amber' },
  bajo:  { label: 'Bajo',  variant: 'green' },
};

export const TASK_STATUS: Record<string, { label: string; variant: BadgeProps['variant'] }> = {
  pendiente:  { label: 'Pendiente',  variant: 'amber' },
  en_curso:   { label: 'En Curso',   variant: 'blue' },
  completada: { label: 'Completada', variant: 'green' },
  cancelada:  { label: 'Cancelada',  variant: 'gray' },
};

// ─── KPI Card ────────────────────────────────────────────────
interface KPIProps {
  label: string;
  value: string | number;
  sub?: string;
  icon?: ReactNode;
  alert?: boolean;
  alertColor?: string;
  onClick?: () => void;
}

export function KPICard({ label, value, sub, icon, alert, alertColor = '#ef4444', onClick }: KPIProps) {
  return (
    <div
      onClick={onClick}
      className={[
        'relative bg-white rounded-xl border overflow-hidden transition-all',
        'p-3 md:p-4 min-h-[100px]',
        alert ? 'border-red-200' : 'border-slate-200',
        onClick ? 'cursor-pointer hover:shadow-md active:scale-[0.98] touch-manipulation' : '',
      ].join(' ')}
    >
      {alert && (
        <div className="absolute top-0 left-0 right-0 h-0.5" style={{ background: alertColor }} />
      )}
      {/* Label row — NO truncate, wraps to 2 lines */}
      <div className="flex items-start justify-between gap-2 mb-2">
        <span className="text-[9px] md:text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-snug">
          {label}
        </span>
        {icon && <span className="text-slate-300 flex-shrink-0 mt-0.5">{icon}</span>}
      </div>
      {/* Big number */}
      <div className={`text-2xl md:text-3xl font-black leading-none mb-1 ${alert ? 'text-dassa-red' : 'text-slate-900'}`}>
        {value}
      </div>
      {/* Subtitle — wraps, no truncation */}
      {sub && (
        <div className="text-[10px] md:text-[11px] text-slate-400 leading-snug">
          {sub}
        </div>
      )}
    </div>
  );
}

// ─── Spinner ─────────────────────────────────────────────────
export function Spinner({ size = 20 }: { size?: number }) {
  return (
    <svg
      className="animate-spin text-dassa-red"
      style={{ width: size, height: size }}
      xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"
    >
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
    </svg>
  );
}

// ─── Empty State ──────────────────────────────────────────────
export function EmptyState({ icon, title, sub }: { icon: string; title: string; sub?: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-slate-400 gap-3">
      <span className="text-5xl opacity-30">{icon}</span>
      <p className="font-semibold text-slate-500">{title}</p>
      {sub && <p className="text-sm">{sub}</p>}
    </div>
  );
}

// ─── Page Container ──────────────────────────────────────────
// Extra bottom padding on mobile so content isn't hidden behind BottomNav
export function PageContent({ children }: { children: ReactNode }) {
  return (
    <div className="flex-1 overflow-y-auto p-3 md:p-6 pb-[calc(4.5rem+env(safe-area-inset-bottom,0px))] md:pb-6">
      {children}
    </div>
  );
}

// ─── Avatar ──────────────────────────────────────────────────
export function Avatar({ name, size = 28 }: { name?: string; size?: number }) {
  const initials = (name ?? '?').split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase();
  return (
    <div
      className="rounded-full bg-gradient-to-br from-blue-600 to-sky-400 flex items-center justify-center text-white font-bold flex-shrink-0"
      style={{ width: size, height: size, fontSize: size * 0.35 }}
    >
      {initials}
    </div>
  );
}

// ─── Priority Dot ────────────────────────────────────────────
export function PriorityDot({ priority }: { priority: string }) {
  const colors: Record<string, string> = {
    urgente: 'bg-red-500',
    alta:    'bg-orange-400',
    media:   'bg-amber-400',
    baja:    'bg-slate-300',
  };
  return <span className={`inline-block w-2 h-2 rounded-full flex-shrink-0 ${colors[priority] ?? 'bg-slate-300'}`} />;
}
