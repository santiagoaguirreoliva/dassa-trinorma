import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  BarChart3,
  BookOpen,
  AlertTriangle,
  Leaf,
  SmilePlus,
  Users,
  Briefcase,
  LogOut,
  ShoppingCart,
  Settings,
  Zap,
  FileCheck,
} from 'lucide-react';
import { useAuth } from '../lib/auth';

export function Sidebar() {
  const location = useLocation();
  const { logout } = useAuth();

  const isActive = (path: string) => location.pathname === path;

  const menuItems = [
    { label: 'Dashboard', path: '/', icon: BarChart3, section: 'ESTRATEGIA' },
    { label: 'Sistema de Gestión', path: '/sistema-gestion', icon: Settings, section: 'SISTEMA DE GESTIÓN' },
    { label: 'Documentos', path: '/documentos', icon: BookOpen, section: 'SGI TRINORMA' },
    { label: 'Hallazgos y NC', path: '/hallazgos', icon: FileCheck, section: 'SGI TRINORMA' },
    { label: 'Matriz de Riesgos', path: '/matriz-riesgos', icon: AlertTriangle, section: 'SGI TRINORMA' },
    { label: 'Requisitos Legales', path: '/requisitos-legales', icon: Zap, section: 'SGI TRINORMA' },
    { label: 'Incidentes', path: '/incidentes', icon: AlertTriangle, section: 'SGI TRINORMA' },
    { label: 'Aspectos Ambientales', path: '/aspectos-ambientales', icon: Leaf, section: 'SGI TRINORMA' },
    { label: 'Satisfacción Cliente', path: '/satisfaccion-cliente', icon: SmilePlus, section: 'SGI TRINORMA' },
    { label: 'Compras', path: '/compras', icon: ShoppingCart, section: 'OPERACIONES' },
    { label: 'Empleados', path: '/empleados', icon: Users, section: 'CAPITAL HUMANO' },
    { label: 'Capacitaciones', path: '/capacitaciones', icon: Briefcase, section: 'CAPITAL HUMANO' },
  ];

  const sections = Array.from(new Set(menuItems.map(item => item.section)));

  return (
    <div className="w-64 bg-gradient-to-b from-slate-900 to-slate-800 h-screen flex flex-col fixed left-0 top-0 shadow-lg">
      {/* Logo */}
      <div className="p-6 border-b border-slate-700">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center">
            <span className="text-white font-bold text-lg">D</span>
          </div>
          <div>
            <h1 className="text-white font-bold text-sm">DASSA</h1>
            <p className="text-slate-300 text-xs">Trinorma Manager</p>
          </div>
        </div>
      </div>

      {/* Menu */}
      <div className="flex-1 overflow-y-auto py-4">
        {sections.map((section) => (
          <div key={section} className="mb-6">
            <p className="px-6 py-2 text-xs font-semibold text-slate-400 uppercase tracking-wider">{section}</p>
            <nav className="space-y-1">
              {menuItems
                .filter((item) => item.section === section)
                .map((item) => {
                  const Icon = item.icon;
                  const active = isActive(item.path);
                  return (
                    <Link
                      key={item.path}
                      to={item.path}
                      className={`flex items-center gap-3 px-6 py-3 text-sm transition-colors ${
                        active
                          ? 'bg-blue-600 text-white border-r-4 border-blue-400'
                          : 'text-slate-300 hover:bg-slate-700 hover:text-white'
                      }`}
                    >
                      <Icon size={18} />
                      <span>{item.label}</span>
                    </Link>
                  );
                })}
            </nav>
          </div>
        ))}
      </div>

      {/* Footer */}
      <div className="border-t border-slate-700 p-4">
        <button
          onClick={logout}
          className="flex items-center gap-3 w-full px-4 py-2 text-sm text-slate-300 hover:bg-red-600 hover:text-white rounded-lg transition-colors"
        >
          <LogOut size={18} />
          <span>Cerrar sesión</span>
        </button>
      </div>
    </div>
  );
}
