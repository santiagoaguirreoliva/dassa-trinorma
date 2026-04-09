import { useNavigate } from 'react-router-dom';
import { Bell } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

interface HeaderProps {
  title: string;
  subtitle?: string;
  alerts?: number;
  actions?: React.ReactNode;
}

export function Header({ title, subtitle, alerts = 0, actions }: HeaderProps) {
  const navigate = useNavigate();
  const today = new Date().toLocaleDateString('es-AR', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
  });

  return (
    <header className="h-14 bg-white border-b border-slate-200 flex items-center px-6 justify-between flex-shrink-0">
      <div>
        <h1 className="text-[15px] font-extrabold text-slate-900 tracking-tight leading-none">{title}</h1>
        {subtitle && <p className="text-[11px] text-slate-400 mt-0.5">{subtitle}</p>}
      </div>
      <div className="flex items-center gap-3">
        <span className="text-[11px] text-slate-400 capitalize hidden md:block">{today}</span>
        {actions}
        {alerts > 0 && (
          <button
            onClick={() => navigate('/notifications')}
            className="relative flex items-center gap-1.5 bg-red-50 text-red-600 px-3 py-1.5 rounded-lg text-[11px] font-semibold hover:bg-red-100 transition-colors"
          >
            <Bell size={13} />
            {alerts} alertas
          </button>
        )}
      </div>
    </header>
  );
}
