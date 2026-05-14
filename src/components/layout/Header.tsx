import { Bell } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface HeaderProps {
  title: string;
  subtitle?: string;
  alerts?: number;
  actions?: React.ReactNode;
  icon?: React.ReactNode;
}

export function Header({ title, subtitle, alerts = 0, actions }: HeaderProps) {
  const navigate = useNavigate();

  return (
    <header className="min-h-12 md:h-14 bg-white border-b border-slate-200 flex items-center
                       px-4 md:px-6 justify-between flex-shrink-0 shadow-sm gap-3 py-2 md:py-0">
      <div className="min-w-0 flex-1">
        {subtitle && (
          <p className="text-[10px] font-bold text-dassa-red uppercase tracking-widest mb-0.5 truncate">
            {subtitle}
          </p>
        )}
        <h1 className="text-[14px] md:text-[15px] font-extrabold text-slate-900 tracking-tight leading-tight">
          {title}
        </h1>
      </div>

      <div className="flex items-center gap-2 flex-shrink-0">
        {actions}
        {alerts > 0 && (
          <button
            onClick={() => navigate('/legal')}
            className="flex items-center gap-1.5 bg-dassa-red-tint text-dassa-red-deep
                       px-2.5 md:px-3 py-1.5 rounded-lg text-[11px] font-semibold
                       hover:bg-dassa-red/10 transition-colors border border-dassa-red/20
                       whitespace-nowrap touch-manipulation"
          >
            <Bell size={13} />
            <span className="hidden xs:inline">{alerts} alertas</span>
            <span className="xs:hidden">{alerts}</span>
          </button>
        )}
      </div>
    </header>
  );
}
