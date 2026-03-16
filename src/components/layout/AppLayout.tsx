import { useState } from 'react'
import { Outlet, useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'

const DS = {
  sidebar: '#080d18', sidebarBorder: '#1a2235', sidebarHover: '#111827',
  sidebarActive: '#1e3a8a', sidebarText: '#94a3b8', sidebarTextActive: '#e2e8f0',
  bg: '#f0f4f8', card: '#ffffff', border: '#e2e8f0',
  textPrimary: '#0f172a', textSecondary: '#64748b', textMuted: '#94a3b8',
  primary: '#1d4ed8', danger: '#ef4444', dangerLight: '#fee2e2',
  warning: '#f59e0b', success: '#10b981',
}

const NAV = [
  { group: 'Estrategia', icon: '*', items: [
    { path: '/dashboard', label: 'Dashboard', icon: '-' },
  ]},
  { group: 'SGI Trinorma', icon: '#', items: [
    { path: '/findings', label: 'Hallazgos / NC', icon: '!', badge: 4, badgeColor: DS.danger },
    { path: '/risks', label: 'Matriz de Riesgos', icon: '~' },
    { path: '/documents', label: 'Documentos', icon: '=' },
    { path: '/legal', label: 'Requisitos Legales', icon: '@', badge: 2, badgeColor: DS.warning },
  ]},
  { group: 'Operaciones', icon: '+', items: [
    { path: '/purchases', label: 'Compras', icon: '$' },
  ]},
  { group: 'Capital Humano', icon: '&', items: [
    { path: '/trainings', label: 'Capacitaciones', icon: '%' },
  ]},
]

const PAGE_META: Record<string, [string, string]> = {
  '/dashboard': ['Dashboard', 'Resumen ejecutivo del SIG'],
  '/findings': ['Hallazgos / NC', 'Gestion de no conformidades y mejoras'],
  '/risks': ['Matriz de Riesgos', 'Evaluacion AMFE - NPR = Prob x Sev x Det'],
  '/documents': ['Documentos', 'Biblioteca documental del SGI'],
  '/legal': ['Requisitos Legales', 'Cumplimiento normativo y vencimientos'],
  '/trainings': ['Capacitaciones', 'Plan de formacion y evidencias'],
  '/purchases': ['Compras', 'Workflow de solicitudes y ejecucion'],
}

function Avatar({ initials, size = 28 }: { initials: string; size?: number }) {
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%',
      background: 'linear-gradient(135deg, #1d4ed8, #0ea5e9)',
      color: '#fff', fontSize: size * 0.36, fontWeight: 700,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      flexShrink: 0, letterSpacing: '0.02em',
    }}>{initials}</div>
  )
}

export default function AppLayout() {
  const navigate = useNavigate()
  const location = useLocation()
  const { profile, signOut } = useAuth()
  const [expanded, setExpanded] = useState<Record<string, boolean>>({
    'Estrategia': true, 'SGI Trinorma': true, 'Operaciones': false, 'Capital Humano': false,
  })
  const currentPath = '/' + location.pathname.split('/')[1]
  const [title, sub] = PAGE_META[currentPath] || ['DASSA', '']
  const initials = profile?.full_name
    ? profile.full_name.split(' ').map((w: string) => w[0]).join('').slice(0, 2).toUpperCase() : 'SA'
  const now = new Date().toLocaleDateString('es-AR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })

  return (
    <div style={{ display: 'flex', height: '100vh', background: DS.bg, overflow: 'hidden' }}>
      <div style={{ width: 240, flexShrink: 0, background: DS.sidebar, borderRight: '1px solid ' + DS.sidebarBorder, display: 'flex', flexDirection: 'column', height: '100vh', overflowY: 'auto' }}>
        <div style={{ padding: '22px 20px 18px', borderBottom: '1px solid ' + DS.sidebarBorder }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 32, height: 32, borderRadius: 8, background: 'linear-gradient(135deg, #1d4ed8 0%, #0ea5e9 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, fontWeight: 900, color: '#fff' }}>D</div>
            <div>
              <div style={{ fontSize: 13, fontWeight: 800, color: '#e2e8f0', letterSpacing: '0.04em' }}>DASSA</div>
              <div style={{ fontSize: 10, color: DS.sidebarText, letterSpacing: '0.06em', marginTop: 1 }}>TRINORMA MANAGER</div>
            </div>
          </div>
          <div style={{ marginTop: 12, padding: '5px 10px', background: '#0ea5e915', borderRadius: 6, fontSize: 10, color: '#38bdf8', fontWeight: 600, letterSpacing: '0.04em' }}>ISO 9001 - 14001 - 45001</div>
        </div>
        <div style={{ flex: 1, padding: '12px 10px' }}>
          {NAV.map(group => (
            <div key={group.group} style={{ marginBottom: 4 }}>
              <button onClick={() => setExpanded(e => ({ ...e, [group.group]: !e[group.group] }))} style={{ width: '100%', padding: '7px 10px', display: 'flex', alignItems: 'center', gap: 8, background: 'none', border: 'none', cursor: 'pointer', color: DS.sidebarText, fontSize: 10, fontWeight: 700, textTransform: 'uppercase' as const, letterSpacing: '0.1em' }}>
                <span>{group.icon}</span>
                <span style={{ flex: 1, textAlign: 'left' as const }}>{group.group}</span>
                <span style={{ fontSize: 8, opacity: 0.5 }}>{expanded[group.group] ? '^' : 'v'}</span>
              </button>
              {expanded[group.group] && group.items.map(item => {
                const active = currentPath === item.path
                return (
                  <button key={item.path} onClick={() => navigate(item.path)} style={{ width: '100%', padding: '8px 10px 8px 26px', display: 'flex', alignItems: 'center', gap: 8, background: active ? DS.sidebarActive : 'none', border: 'none', cursor: 'pointer', borderRadius: 7, color: active ? '#fff' : DS.sidebarText, fontSize: 13, fontWeight: active ? 600 : 400, textAlign: 'left' as const, marginBottom: 1 }}>
                    <span style={{ fontSize: 11, opacity: 0.7 }}>{item.icon}</span>
                    <span style={{ flex: 1 }}>{item.label}</span>
                    {item.badge && (<span style={{ background: item.badgeColor, color: '#fff', borderRadius: 999, fontSize: 10, fontWeight: 700, padding: '1px 6px', minWidth: 18, textAlign: 'center' as const }}>{item.badge}</span>)}
                  </button>
                )
              })}
            </div>
          ))}
        </div>
        <div style={{ padding: '14px', borderTop: '1px solid ' + DS.sidebarBorder, display: 'flex', alignItems: 'center', gap: 10 }}>
          <Avatar initials={initials} size={32} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: DS.sidebarTextActive, whiteSpace: 'nowrap' as const, overflow: 'hidden', textOverflow: 'ellipsis' }}>{profile?.full_name || 'Usuario'}</div>
            <div style={{ fontSize: 10, color: DS.sidebarText }}>Master Admin</div>
          </div>
          <button onClick={signOut} title="Cerrar sesion" style={{ background: 'none', border: 'none', cursor: 'pointer', color: DS.sidebarText, fontSize: 14, padding: 4, borderRadius: 4 }}>X</button>
        </div>
      </div>
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <div style={{ height: 64, background: DS.card, borderBottom: '1px solid ' + DS.border, display: 'flex', alignItems: 'center', padding: '0 28px', justifyContent: 'space-between', flexShrink: 0 }}>
          <div>
            <div style={{ fontSize: 17, fontWeight: 800, color: DS.textPrimary, letterSpacing: '-0.01em' }}>{title}</div>
            <div style={{ fontSize: 12, color: DS.textMuted }}>{sub}</div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ fontSize: 11, color: DS.textMuted, textTransform: 'capitalize' as const }}>{now}</div>
            <div style={{ padding: '6px 12px', borderRadius: 8, background: DS.dangerLight, color: DS.danger, fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>[!] 3 alertas</div>
          </div>
        </div>
        <div style={{ flex: 1, overflowY: 'auto' }}><Outlet /></div>
      </div>
    </div>
  )
}
