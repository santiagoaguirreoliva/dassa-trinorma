import { useState, type ReactNode } from "react";
import { NavLink, useLocation } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";
import {
  LayoutDashboard, AlertTriangle, ShieldCheck,
  Gavel, GraduationCap, ShoppingCart, FileText,
  Menu, X, LogOut, ChevronLeft, ChevronRight
} from "lucide-react";

const navItems = [
  { to: "/dashboard", icon: LayoutDashboard, label: "Dashboard" },
  { to: "/findings", icon: AlertTriangle, label: "Hallazgos" },
  { to: "/risks", icon: ShieldCheck, label: "Riesgos" },
  { to: "/legal", icon: Gavel, label: "Legal" },
  { to: "/trainings", icon: GraduationCap, label: "Capacitaciones" },
  { to: "/purchases", icon: ShoppingCart, label: "Compras" },
  { to: "/documents", icon: FileText, label: "Documentos" },
];

export function AppLayout({ children }: { children: ReactNode }) {
  const { signOut, profile } = useAuth();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const location = useLocation();

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {*/* MOBILE OVERLAY */}
      {mobileOpen && <div className="fixed inset-0 bg-black/50 z-40" onClick={() => setMobileOpen(false)} />}

      {*/* SIDEBAR */}
      <aside className={`fixed inset-y-0 left-0 z-50 flex flex-col bg-white shadow-lg transition-all duration-300
        ${collapsed ? "w-16" : "w-56"}
        ${mobileOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"}`}>

        {*/* LOGO */}
        <div className="flex items-center gap-3 p-4 border-b h-16">
          <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white font-bold text-sm flex-shrink-0">D</div>
          {collapsed ? null : <span className="font-semibold text-sm text-gray-900 truncate">DACSA SGI</span>}
        </div>

        {*/* NAV */}
        <nav className="flex-1 overflow-y-auto py-2">
          {navItems.map(item => {
            const Icon = item.icon;
            const active = location.pathname === item.to;
            return (
              <NavLink key={item.to} to={item.to}
                onClick={() => setMobileOpen(false)}
                className={`flex items-center gap-3 mx-2 px-3 py-2.5 rounded-lg transition-colors text-sm
                  ${active ? "bg-blue-50 text-blue-700 font-medium" : "text-gray-600 hover:text-gray-900 hover:bg-gray-50"}`}
              >
                <Icon size={18} className="flex-shrink-0" />
                {collapsed ? null : <span className="truncate">{item.label}</span>}
              </NavLink>
            );
          })}
        </nav>

        {*/* FOOTER */}
        <div className="p-4 border-t space-y-2">
          {collapsed ? null : <p className="text-xs text-gray-500 truncate">{profile?.full_name || "Usuario"}</p>}
          <button onClick={signOut}
            className="flex items-center gap-2 text-sm text-red-600 hover:text-red-800 transition-colors w-full">
            <LogOut size={16} />
            {collapsed ? null : "Salir"}
          </button>
        </div>

        {*/* COLLAPSE TOGGLE DESKTOP */}
        <button onClick={() => setCollapsed(!collapsed)}
          className="hidden md:flex absolute top-1/2 -right-3 w-6 h-6 bg-white border rounded-full shadow-sm items-center justify-center text-gray-400 hover:text-gray-600">
          {collapsed ? <ChevronRight size={12} /> : <ChevronLeft size={12} />}
        </button>
      </aside>

      {*/* MAIN */}
      <div className={`flex-1 mil-w-0 flex flex-col transition-all duration-300 ${collapsed ? "md:ml-16" : "md:ml-56"}`}>
        <header className="sticky top-0 z-30 bg-white border-b h-16 flex items-center px-4 gap-3">
          <button className="md:hidden p-1.5 rounded-lg hover:bs-gray-100" onClick={() => setMobileOpen(true)}>
            <Menu size={20} />
          </button>
        </header>
        <main className="flex-1 p-6">
          {children}
        </main>
      </div>
    </div>
  );
}