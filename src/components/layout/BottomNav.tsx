import { useNavigate, useLocation } from 'react-router-dom';
import { LayoutDashboard, Zap, Scale, AlertTriangle, FileText } from 'lucide-react';

const TABS = [
  { path: '/dashboard',  label: 'Dashboard',  icon: LayoutDashboard },
  { path: '/findings',   label: 'Hallazgos',  icon: Zap },
  { path: '/risks',      label: 'Riesgos',    icon: AlertTriangle },
  { path: '/legal',      label: 'Legal',      icon: Scale },
  { path: '/documents',  label: 'Docs',       icon: FileText },
] as const;

export default function BottomNav() {
  const navigate = useNavigate();
  const { pathname } = useLocation();

  return (
    <nav
      className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 shadow-[0_-2px_12px_rgba(0,0,0,0.08)] z-30 flex"
      style={{ height: 'calc(3.5rem + env(safe-area-inset-bottom, 0px))', paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
    >
      {TABS.map(({ path, label, icon: Icon }) => {
        const active = pathname === path || pathname.startsWith(path + '/');
        return (
          <button
            key={path}
            onClick={() => navigate(path)}
            className={[
              'flex-1 flex flex-col items-center justify-center gap-0.5 h-full',
              'transition-colors touch-manipulation',
              active ? 'text-dassa-red' : 'text-slate-400 hover:text-slate-600',
            ].join(' ')}
            aria-label={label}
          >
            <Icon size={21} strokeWidth={active ? 2.2 : 1.8} />
            <span className={`text-[10px] font-semibold leading-none ${active ? 'text-dassa-red' : ''}`}>
              {label}
            </span>
          </button>
        );
      })}
    </nav>
  );
}
