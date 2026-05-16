import { useNavigate } from 'react-router-dom';
import { Bell, LogOut, Menu } from 'lucide-react';
import { useAuth, ROLE_LABELS } from '@/contexts/AuthContext';

interface Props {
  onMenuClick?: () => void;
}

export default function TopNav({ onMenuClick }: Props) {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();

  const initials = user?.full_name
    ?.split(' ').map((w: string) => w[0]).slice(0, 2).join('').toUpperCase() ?? 'U';

  return (
    <header className="h-14 md:h-16 flex-shrink-0 bg-dassa-red flex items-center justify-between px-2 md:px-4 shadow-lg z-50">

      {/* Left: hamburger (mobile only) + brand */}
      <div className="flex items-center gap-1 md:gap-3">
        {/* Hamburger button — 48×48 touch target, mobile only */}
        <button
          onClick={onMenuClick}
          className="md:hidden w-12 h-12 flex items-center justify-center rounded-xl text-white
                     hover:bg-white/10 active:bg-white/20 transition-colors flex-shrink-0 touch-manipulation"
          aria-label="Abrir menú de navegación"
        >
          <Menu size={22} />
        </button>

        {/* Brand wordmark */}
        <button
          onClick={() => navigate('/dashboard')}
          className="flex items-center gap-2.5 hover:opacity-90 active:opacity-70 transition-opacity touch-manipulation"
          aria-label="DASSA SGI"
        >
          <img
            src="/ds/logos/dassa-isotipo-red.png"
            alt="DASSA"
            className="h-8 md:h-9 w-auto select-none rounded-lg"
            draggable={false}
          />
          <span className="hidden sm:inline text-white/40 text-base font-light leading-none">·</span>
          <span className="hidden sm:inline text-white/80 text-[11px] font-semibold tracking-[0.14em] uppercase">
            SGI
          </span>
        </button>

        {/* ISO pills — hidden on mobile, visible from sm */}
        <div className="hidden sm:flex items-center gap-1.5 ml-1">
          {['ISO 9001', 'ISO 14001', 'ISO 45001'].map(n => (
            <span
              key={n}
              className="text-[10px] font-bold tracking-widest uppercase text-white/80 bg-white/10
                         border border-white/20 px-2 py-0.5 rounded-full"
            >
              {n}
            </span>
          ))}
        </div>
      </div>

      {/* Right: notifications + user */}
      <div className="flex items-center gap-1 md:gap-2">
        {/* Bell — 48×48 touch target */}
        <button
          className="relative w-12 h-12 flex items-center justify-center rounded-xl text-white/70
                     hover:text-white hover:bg-white/10 active:bg-white/20 transition-colors touch-manipulation"
          aria-label="Notificaciones"
        >
          <Bell size={18} />
          <span className="absolute top-2.5 right-2.5 w-2 h-2 bg-dassa-celeste rounded-full border border-dassa-red" />
        </button>

        {/* Divider */}
        <div className="w-px h-7 bg-white/20 mx-1" />

        {/* Avatar + name (name hidden on mobile) */}
        <button
          onClick={() => navigate('/profile')}
          className="flex items-center gap-2 hover:opacity-80 active:opacity-60 transition-opacity touch-manipulation"
        >
          <div className="w-8 h-8 rounded-full bg-white/20 border border-white/30 flex items-center justify-center text-white text-[11px] font-bold flex-shrink-0">
            {initials}
          </div>
          <div className="hidden sm:flex flex-col text-left">
            <span className="text-white text-[12px] font-semibold leading-none">
              {user?.full_name?.split(' ')[0]}
            </span>
            <span className="text-white/60 text-[10px] leading-none mt-0.5">
              {user?.role ? ROLE_LABELS[user.role] : ''}
            </span>
          </div>
        </button>

        {/* Logout — 44×44 */}
        <button
          onClick={signOut}
          title="Cerrar sesión"
          className="w-11 h-11 flex items-center justify-center text-white/50 hover:text-white
                     hover:bg-white/10 rounded-xl transition-colors touch-manipulation"
        >
          <LogOut size={16} />
        </button>
      </div>
    </header>
  );
}
