import { useNavigate, useLocation } from "react-router-dom";
import { AlertTriangle, ShoppingCart, ListChecks, Menu } from "lucide-react";
import { useLayout } from "./LayoutContext";

type Tab =
  | { kind: "nav"; path: string; label: string; icon: typeof AlertTriangle }
  | { kind: "menu"; label: string; icon: typeof Menu };

const TABS: Tab[] = [
  { kind: "nav", path: "/findings",       label: "NCs",     icon: AlertTriangle },
  { kind: "nav", path: "/purchases",      label: "Compras", icon: ShoppingCart },
  { kind: "nav", path: "/mis-pendientes", label: "Tareas",  icon: ListChecks },
  { kind: "menu", label: "Menú", icon: Menu },
];

export default function BottomNav() {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const { openSidebar, isSidebarOpen } = useLayout();

  return (
    <nav
      className="md:hidden fixed bottom-0 left-0 right-0 z-30 bg-white/95 backdrop-blur-md border-t border-slate-200 shadow-[0_-2px_12px_rgba(0,0,0,0.08)] flex"
      style={{
        height: "calc(3.75rem + env(safe-area-inset-bottom, 0px))",
        paddingBottom: "env(safe-area-inset-bottom, 0px)",
      }}
      aria-label="Navegación principal"
    >
      {TABS.map((t) => {
        const Icon = t.icon;
        const active =
          t.kind === "menu"
            ? isSidebarOpen
            : pathname === t.path || pathname.startsWith(t.path + "/");
        return (
          <button
            key={t.kind === "menu" ? "menu" : t.path}
            onClick={() => (t.kind === "menu" ? openSidebar() : navigate(t.path))}
            className={`flex-1 flex flex-col items-center justify-center gap-0.5 h-full touch-manipulation transition-colors ${
              active ? "text-dassa-red" : "text-slate-500 active:text-dassa-red"
            }`}
            aria-label={t.label}
            aria-current={active ? "page" : undefined}
          >
            <Icon size={22} strokeWidth={active ? 2.4 : 1.8} />
            <span className={`text-[10px] font-bold leading-none tracking-wide ${active ? "text-dassa-red" : ""}`}>
              {t.label}
            </span>
          </button>
        );
      })}
    </nav>
  );
}
