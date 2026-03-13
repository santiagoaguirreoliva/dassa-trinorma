import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useDashboardStats } from "@/hooks/useDashboardStats";
import { useFindings } from "@/hooks/useFindings";
import { useRisks } from "@/hooks/useRisks";
import { useLegal } from "@/hooks/useLegal";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";

// Design tokens
const C = {
  sidebar: "#080d18", sidebarBorder: "#1a2235", sidebarHover: "#111827",
  sidebarActive: "#1e3a8a", sidebarText: "#94a3b8", sidebarTextActive: "#e2e8f0",
  bg: "#f0f4f8", card: "#ffffff", border: "#e2e8f0",
  text: "#0f172a", muted: "#64748b", faint: "#94a3b8",
  primary: "#1d4ed8", primaryLight: "#dbeafe",
  success: "#10b981", successLight: "#d1fae5",
  warning: "#f59e0b", warningLight: "#fef3c7",
  danger: "#ef4444", dangerLight: "#fee2e2",
  purple: "#8b5cf6", purpleLight: "#ede9fe",
  sky: "#0ea5e9", skyLight: "#e0f2fe",
};

const STATUS_CONFIG: Record<string, { label: string; bg: string; text: string; dot: string }> = {
  abierto:      { label: "Abierto",        bg:"#fee2e2", text:"#dc2626", dot:"#ef4444" },
  analisis:     { label: "En Analisis",    bg:"#fef3c7", text:"#d97706", dot:"#f59e0b" },
  plan_accion:  { label: "Plan de Accion", bg:"#ede9fe", text:"#7c3aed", dot:"#8b5cf6" },
  en_ejecucion: { label: "En Ejecucion",   bg:"#dbeafe", text:"#1d4ed8", dot:"#3b82f6" },
  verificacion: { label: "Verificacion",   bg:"#fce7f3", text:"#db2777", dot:"#ec4899" },
  cerrado:      { label: "Cerrado",        bg:"#d1fae5", text:"#059669", dot:"#10b981" },
};

const TYPE_CONFIG: Record<string, { label: string; bg: string; text: string }> = {
  nc_real:      { label:"NC Real",       bg:"#fee2e2", text:"#dc2626" },
  nc_potencial: { label:"NC Potencial",  bg:"#fef3c7", text:"#d97706" },
  mejora:       { label:"Mejora",        bg:"#d1fae5", text:"#059669" },
};

const NAV_GROUPS = [
  { group:"Estrategia", icon:"*", items:[
    { id:"dashboard",  label:"Dashboard",         icon:"-", badge:null },
    { id:"context",    label:"Analisis Contexto", icon:"o", badge:null },
    { id:"review",     label:"Revision Direccion",icon:"<>", badge:null },
  ]},
  { group:"SGI Trinorma", icon:"#", items:[
    { id:"findings",  label:"Hallazgos / NC",     icon:"!", badge:"findings" },
    { id:"risks",     label:"Matriz de Riesgos",  icon:"*", badge:null },
    { id:"documents", label:"Documentos",         icon:"=", badge:null },
    { id:"legal",     label:"Requisitos Legales", icon:"@", badge:"legal" },
    { id:"scope",     label:"Alcance SGI",        icon:"[]", badge:null },
  ]},
  { group:"Operaciones", icon:"+", items:[
    { id:"gate",      label:"Control Porteria",   icon:"+", badge:null },
    { id:"machinery", label:"Maquinaria",         icon:"X", badge:null },
    { id:"suppliers", label:"Proveedores",        icon:"=", badge:null },
    { id:"purchases", label:"Compras",            icon:"-", badge:null },
  ]},
  { group:"Capital Humano", icon:"o", items:[
    { id:"trainings", label:"Capacitaciones",     icon:"%", badge:null },
    { id:"myteam",    label:"Mi Equipo",          icon:"o", badge:null },
  ]},
];

const PAGE_META: Record<string, [string,string]> = {
  dashboard:  ["Dashboard",           "Resumen ejecutivo del SIG Trinorma"],
  findings:   ["Hallazgos / NC",      "Gestion de no conformidades y oportunidades de mejora"],
  risks:      ["Matriz de Riesgos",   "Evaluacion AMFE -- Probabilidad x Severidad x Deteccion"],
  documents:  ["Documentos",          "Biblioteca documental del SGI"],
  legal:      ["Requisitos Legales",  "Cumplimiento normativo y control de vencimientos"],
  trainings:  ["Capacitaciones",      "Plan anual de formacion y evidencias"],
  context:    ["Analisis de Contexto","FODA y estrategias cruzadas"],
  purchases:  ["Compras",             "Workflow de solicitudes y ejecucion"],
  gate:       ["Control de Porteria", "Registro de ingresos y egresos de vehiculos"],
  machinery:  ["Maquinaria",          "Fichas tecnicas y plan de mantenimiento"],
  suppliers:  ["Proveedores",         "Evaluacion y homologacion de proveedores"],
  myteam:     ["Mi Equipo",           "Personas, roles y responsabilidades"],
  scope:      ["Alcance SGI",         "Definicion y alcance del sistema integrado"],
  review:     ["Revision por la Direccion", "Actas y compromisos de revision gerencial"],
};

// --- Helpers --------------------------------------------------
const Avatar = ({ initials, size=28, bg=C.primary }: { initials:string; size?:number; bg?:string }) => (
  <div style={{ width:size, height:size, borderRadius:"50%", background:bg, color:"#fff",
    fontSize:size*0.35, fontWeight:700, display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
    {initials}
  </div>
);

const Badge = ({ label, bg, text }: { label:string; bg:string; text:string }) => (
  <span style={{ display:"inline-flex", alignItems:"center", gap:4, padding:"2px 8px", borderRadius:999,
    fontSize:11, fontWeight:600, background:bg, color:text, letterSpacing:"0.01em" }}>{label}</span>
);

const KPICard = ({ label, value, sub, color, icon, alert=false }: {
  label:string; value:string|number; sub:string; color:string; icon:string; alert?:boolean
}) => (
  <div style={{ background:C.card, borderRadius:12, padding:"20px 22px",
    border:`1px solid ${alert ? color+"40" : C.border}`,
    boxShadow: alert ? `0 0 0 1px ${color}20, 0 2px 8px ${color}10` : "0 1px 4px rgba(0,0,0,0.06)",
    display:"flex", flexDirection:"column", gap:8, position:"relative", overflow:"hidden" }}>
    {alert && <div style={{ position:"absolute", top:0, left:0, right:0, height:3, background:color }} />}
    <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between" }}>
      <span style={{ fontSize:11, fontWeight:600, color:C.muted, textTransform:"uppercase", letterSpacing:"0.06em" }}>{label}</span>
      <span style={{ fontSize:18, opacity:0.6 }}>{icon}</span>
    </div>
    <div style={{ fontSize:32, fontWeight:800, color:alert ? color : C.text, lineHeight:1 }}>{value}</div>
    <div style={{ fontSize:12, color:alert ? color : C.faint, fontWeight:500 }}>{sub}</div>
  </div>
);

// --- Sidebar --------------------------------------------------
function Sidebar({ current, onNav, findingCount, legalAlerts }: {
  current:string; onNav:(id:string)=>void; findingCount:number; legalAlerts:number;
}) {
  const [exp, setExp] = useState<Record<string,boolean>>({ "Estrategia":true, "SGI Trinorma":true, "Operaciones":false, "Capital Humano":false });
  const { profile, signOut } = useAuth();
  const initials = profile?.full_name?.split(" ").map(w=>w[0]).slice(0,2).join("").toUpperCase() ?? "?";

  return (
    <div style={{ width:240, flexShrink:0, background:C.sidebar, borderRight:`1px solid ${C.sidebarBorder}`,
      display:"flex", flexDirection:"column", height:"100vh", overflowY:"auto" }}>
      {/* Logo */}
      <div style={{ padding:"22px 20px 18px", borderBottom:`1px solid ${C.sidebarBorder}` }}>
        <div style={{ display:"flex", alignItems:"center", gap:10 }}>
          <div style={{ width:32, height:32, borderRadius:8, background:"linear-gradient(135deg,#1d4ed8,#0ea5e9)",
            display:"flex", alignItems:"center", justifyContent:"center", fontSize:16, fontWeight:900, color:"#fff" }}>D</div>
          <div>
            <div style={{ fontSize:13, fontWeight:800, color:"#e2e8f0", letterSpacing:"0.04em" }}>DASSA</div>
            <div style={{ fontSize:10, color:C.sidebarText, letterSpacing:"0.06em" }}>TRINORMA MANAGER</div>
          </div>
        </div>
        <div style={{ marginTop:10, padding:"5px 10px", background:"#0ea5e918", borderRadius:6,
          fontSize:11, color:"#38bdf8", fontWeight:500 }}>ISO 9001 . 14001 . 45001</div>
      </div>

      {/* Nav */}
      <div style={{ flex:1, padding:"10px 10px" }}>
        {NAV_GROUPS.map(g => (
          <div key={g.group} style={{ marginBottom:2 }}>
            <button onClick={() => setExp(e => ({...e,[g.group]:!e[g.group]}))}
              style={{ width:"100%", padding:"7px 10px", display:"flex", alignItems:"center", gap:7,
                background:"none", border:"none", cursor:"pointer", color:C.sidebarText,
                fontSize:11, fontWeight:700, textTransform:"uppercase", letterSpacing:"0.08em" }}>
              <span>{g.icon}</span>
              <span style={{ flex:1, textAlign:"left" }}>{g.group}</span>
              <span style={{ fontSize:9, opacity:0.4 }}>{exp[g.group]?"^":"v"}</span>
            </button>
            {exp[g.group] && g.items.map(item => {
              const active = current === item.id;
              const badgeCount = item.badge === "findings" ? findingCount : item.badge === "legal" ? legalAlerts : 0;
              return (
                <button key={item.id} onClick={() => onNav(item.id)}
                  style={{ width:"100%", padding:"8px 10px 8px 28px", display:"flex", alignItems:"center", gap:8,
                    background:active ? C.sidebarActive : "none", border:"none", cursor:"pointer", borderRadius:7,
                    color:active ? "#fff" : C.sidebarText, fontSize:13, fontWeight:active?600:400,
                    textAlign:"left", marginBottom:1, transition:"all 0.12s" }}
                  onMouseEnter={e => { if(!active) { e.currentTarget.style.background=C.sidebarHover; e.currentTarget.style.color=C.sidebarTextActive; }}}
                  onMouseLeave={e => { if(!active) { e.currentTarget.style.background="none"; e.currentTarget.style.color=C.sidebarText; }}}>
                  <span style={{ fontSize:12, opacity:0.7 }}>{item.icon}</span>
                  <span style={{ flex:1 }}>{item.label}</span>
                  {badgeCount > 0 && (
                    <span style={{ background:item.badge==="legal"?C.warning:C.danger, color:"#fff",
                      borderRadius:999, fontSize:10, fontWeight:700, padding:"1px 6px" }}>{badgeCount}</span>
                  )}
                </button>
              );
            })}
          </div>
        ))}
      </div>

      {/* User */}
      <div style={{ padding:"12px 14px", borderTop:`1px solid ${C.sidebarBorder}`, display:"flex", alignItems:"center", gap:10 }}>
        <Avatar initials={initials} size={32} bg="linear-gradient(135deg,#1d4ed8,#0ea5e9)" />
        <div style={{ flex:1, minWidth:0 }}>
          <div style={{ fontSize:12, fontWeight:600, color:C.sidebarTextActive, whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>{profile?.full_name ?? "Usuario"}</div>
          <div style={{ fontSize:10, color:C.sidebarText }}>SGI DASSA</div>
        </div>
        <button onClick={signOut} title="Cerrar sesion"
          style={{ background:"none", border:"none", color:C.sidebarText, cursor:"pointer", fontSize:14, padding:4, borderRadius:4 }}>X</button>
      </div>
    </div>
  );
}

// --- Dashboard Home --------------------------------------------
function DashboardHome() {
  const { data: stats } = useDashboardStats();
  const { findings } = useFindings();
  const { requirements, getStatus, getDaysLeft } = useLegal();

  const monthlyData = [
    { mes:"Oct", abiertas:3, cerradas:2 }, { mes:"Nov", abiertas:5, cerradas:3 },
    { mes:"Dic", abiertas:4, cerradas:5 }, { mes:"Ene", abiertas:6, cerradas:4 },
    { mes:"Feb", abiertas:4, cerradas:6 }, { mes:"Mar", abiertas:stats?.openFindings ?? 0, cerradas:2 },
  ];
  const riskDist = [
    { name:"Significativo", value:stats?.highRisks ?? 0, color:C.danger },
    { name:"Moderado", value:7, color:C.warning },
    { name:"Aceptable", value:12, color:C.success },
  ];

  return (
    <div style={{ padding:28, display:"flex", flexDirection:"column", gap:22 }}>
      {/* KPIs */}
      <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:14 }}>
        <KPICard label="NC Abiertas" value={stats?.openFindings ?? "--"} sub="hallazgos sin cerrar" color={C.danger} icon="!" alert={(stats?.openFindings ?? 0) > 2} />
        <KPICard label="Riesgos Altos" value={stats?.highRisks ?? "--"} sub="NPR > 16 -- requieren accion" color={C.warning} icon="*" alert={(stats?.highRisks ?? 0) > 0} />
        <KPICard label="Legal por Vencer" value={stats?.expiringLegal ?? "--"} sub="proximos 90 dias" color={C.warning} icon="@" alert={(stats?.expiringLegal ?? 0) > 0} />
        <KPICard label="Capacitaciones" value={stats?.upcomingTrainings ?? "--"} sub="proximos 30 dias" color={C.success} icon="%" />
      </div>
      <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:14 }}>
        <KPICard label="Docs Pendientes" value={stats?.pendingDocs ?? "--"} sub="borrador o en aprobacion" color={C.sky} icon="=" />
        <KPICard label="Modulos ISO 9001" value="10/12" sub="procedimientos aprobados" color={C.success} icon="OK" />
        <KPICard label="Modulos ISO 14001" value="6/8" sub="aspectos documentados" color={C.purple} icon="[R]" />
        <KPICard label="Modulos ISO 45001" value="8/10" sub="riesgos identificados" color={C.sky} icon="[H]" />
      </div>

      {/* Charts */}
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:16 }}>
        <div style={{ background:C.card, borderRadius:12, padding:22, border:`1px solid ${C.border}`, boxShadow:"0 1px 4px rgba(0,0,0,0.06)", gridColumn:"span 2" }}>
          <div style={{ fontSize:13, fontWeight:700, color:C.text, marginBottom:3 }}>Evolucion de No Conformidades</div>
          <div style={{ fontSize:12, color:C.faint, marginBottom:18 }}>Ultimos 6 meses -- abiertas vs cerradas</div>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={monthlyData} barGap={4}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="mes" tick={{ fontSize:12, fill:C.muted }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize:12, fill:C.muted }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={{ borderRadius:8, border:"none", boxShadow:"0 4px 12px rgba(0,0,0,0.1)", fontSize:12 }} />
              <Bar dataKey="abiertas" fill={C.danger} radius={[4,4,0,0]} name="Abiertas" />
              <Bar dataKey="cerradas" fill={C.success} radius={[4,4,0,0]} name="Cerradas" />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div style={{ background:C.card, borderRadius:12, padding:22, border:`1px solid ${C.border}`, boxShadow:"0 1px 4px rgba(0,0,0,0.06)" }}>
          <div style={{ fontSize:13, fontWeight:700, color:C.text, marginBottom:3 }}>Distribucion de Riesgos</div>
          <div style={{ fontSize:12, color:C.faint, marginBottom:8 }}>Por nivel de NPR</div>
          <ResponsiveContainer width="100%" height={130}>
            <PieChart><Pie data={riskDist} cx="50%" cy="50%" innerRadius={38} outerRadius={56} paddingAngle={3} dataKey="value">
              {riskDist.map((d,i) => <Cell key={i} fill={d.color} />)}
            </Pie><Tooltip contentStyle={{ borderRadius:8, border:"none", fontSize:12 }} /></PieChart>
          </ResponsiveContainer>
          {riskDist.map(d => (
            <div key={d.name} style={{ display:"flex", alignItems:"center", justifyContent:"space-between", fontSize:12, marginBottom:5 }}>
              <div style={{ display:"flex", alignItems:"center", gap:6 }}>
                <div style={{ width:8, height:8, borderRadius:2, background:d.color }} />
                <span style={{ color:C.muted }}>{d.name}</span>
              </div>
              <span style={{ fontWeight:700, color:C.text }}>{d.value}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Bottom */}
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:16 }}>
        {/* Active findings */}
        <div style={{ background:C.card, borderRadius:12, padding:22, border:`1px solid ${C.border}`, boxShadow:"0 1px 4px rgba(0,0,0,0.06)" }}>
          <div style={{ fontSize:13, fontWeight:700, color:C.text, marginBottom:14 }}>Hallazgos Mas Urgentes</div>
          <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
            {findings.filter(f => f.status !== "cerrado").slice(0,5).map(f => {
              const sc = STATUS_CONFIG[f.status];
              const tc = TYPE_CONFIG[f.type as string] ?? TYPE_CONFIG.mejora;
              const daysOpen = Math.floor((Date.now() - new Date(f.created_at).getTime()) / 86400000);
              const overdue = daysOpen > 15;
              return (
                <div key={f.id} style={{ display:"flex", alignItems:"center", gap:10,
                  padding:"9px 12px", borderRadius:8,
                  background:overdue?"#fff5f5":"#f8fafc",
                  border:`1px solid ${overdue?"#fecaca":C.border}` }}>
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ fontSize:12, fontWeight:600, color:C.text, whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>{f.title}</div>
                    <div style={{ display:"flex", gap:6, marginTop:3, alignItems:"center" }}>
                      <code style={{ background:"#f1f5f9", padding:"1px 5px", borderRadius:3, fontSize:10, color:C.primary, fontWeight:700 }}>{f.code}</code>
                      <span style={{ fontSize:11, color:C.faint }}>{f.area}</span>
                    </div>
                  </div>
                  <div style={{ display:"flex", flexDirection:"column", alignItems:"flex-end", gap:3 }}>
                    <Badge label={sc.label} bg={sc.bg} text={sc.text} />
                    <span style={{ fontSize:10, color:overdue?C.danger:C.faint, fontWeight:overdue?700:400 }}>{daysOpen}d</span>
                  </div>
                </div>
              );
            })}
            {findings.filter(f => f.status !== "cerrado").length === 0 && (
              <div style={{ textAlign:"center", padding:24, color:C.faint, fontSize:13 }}>OK Sin hallazgos activos</div>
            )}
          </div>
        </div>

        {/* Legal alerts */}
        <div style={{ background:C.card, borderRadius:12, padding:22, border:`1px solid ${C.border}`, boxShadow:"0 1px 4px rgba(0,0,0,0.06)" }}>
          <div style={{ fontSize:13, fontWeight:700, color:C.text, marginBottom:14 }}>! Vencimientos Legales</div>
          {requirements.filter(r => {
            const d = getDaysLeft(r.expiration_date);
            return d !== null && d <= 120;
          }).map(r => {
            const s = getStatus(r);
            const days = getDaysLeft(r.expiration_date);
            return (
              <div key={r.id} style={{ display:"flex", alignItems:"center", justifyContent:"space-between",
                padding:"9px 0", borderBottom:`1px solid ${C.border}` }}>
                <div>
                  <div style={{ fontSize:12, fontWeight:600, color:C.text }}>{r.title}</div>
                  <div style={{ fontSize:11, color:C.faint, marginTop:2 }}>{r.applicable_area} . {r.expiration_date}</div>
                </div>
                <div style={{ background:s.bg, color:s.color, padding:"4px 10px", borderRadius:999, fontSize:11, fontWeight:700, flexShrink:0, marginLeft:12 }}>
                  {days}d
                </div>
              </div>
            );
          })}
          {requirements.filter(r => { const d = getDaysLeft(r.expiration_date); return d !== null && d <= 120; }).length === 0 && (
            <div style={{ textAlign:"center", padding:24, color:C.faint, fontSize:13 }}>OK Sin vencimientos proximos</div>
          )}
        </div>
      </div>
    </div>
  );
}

// --- Findings Kanban ------------------------------------------
function FindingsPage() {
  const { findings, stats, createFinding, updateStatus } = useFindings();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ title:"", description:"", finding_type:"nc_real" as any, origin:"desvio_operativo", area:"" });

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    await createFinding.mutateAsync({ ...form, status:"abierto", efficacy_verified:false, finding_type:form.finding_type });
    setShowForm(false);
    setForm({ title:"", description:"", finding_type:"nc_real", origin:"desvio_operativo", area:"" });
  }

  return (
    <div style={{ padding:28, display:"flex", flexDirection:"column", gap:18, height:"calc(100vh - 64px)", overflow:"hidden" }}>
      {/* Stats + controls */}
      <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", flexShrink:0 }}>
        <div style={{ display:"flex", gap:10 }}>
          {[["Total activas", stats.open, C.danger], ["NC Reales", findings.filter(f=>f.finding_type==="nc_real").length, C.warning], ["Vencidas", stats.overdue, C.danger], ["Cerradas", stats.closed, C.success]].map(([l,v,c]) => (
            <div key={String(l)} style={{ background:C.card, border:`1px solid ${C.border}`, borderRadius:8, padding:"8px 16px", textAlign:"center" }}>
              <div style={{ fontSize:20, fontWeight:800, color:c as string }}>{v as number}</div>
              <div style={{ fontSize:11, color:C.faint }}>{l as string}</div>
            </div>
          ))}
        </div>
        <button onClick={() => setShowForm(true)}
          style={{ background:C.primary, color:"#fff", border:"none", borderRadius:8, padding:"10px 18px", fontSize:13, fontWeight:700, cursor:"pointer" }}>
          + Nueva NC / Hallazgo
        </button>
      </div>

      {/* Kanban */}
      <div style={{ display:"grid", gridTemplateColumns:"repeat(6,1fr)", gap:10, flex:1, overflow:"hidden" }}>
        {Object.entries(STATUS_CONFIG).map(([status, cfg]) => {
          const cards = findings.filter(f => f.status === status);
          return (
            <div key={status} style={{ display:"flex", flexDirection:"column", gap:8, overflow:"hidden" }}>
              <div style={{ padding:"7px 12px", borderRadius:8, background:cfg.bg, flexShrink:0,
                display:"flex", alignItems:"center", justifyContent:"space-between" }}>
                <div style={{ display:"flex", alignItems:"center", gap:5 }}>
                  <div style={{ width:7, height:7, borderRadius:"50%", background:cfg.dot }} />
                  <span style={{ fontSize:11, fontWeight:700, color:cfg.text }}>{cfg.label}</span>
                </div>
                <span style={{ fontSize:11, fontWeight:800, color:cfg.text }}>{cards.length}</span>
              </div>
              <div style={{ display:"flex", flexDirection:"column", gap:7, overflowY:"auto", flex:1 }}>
                {cards.map(f => {
                  const tc = TYPE_CONFIG[f.finding_type as string] ?? TYPE_CONFIG.mejora;
                  const daysOpen = Math.floor((Date.now() - new Date(f.created_at).getTime()) / 86400000);
                  const overdue = daysOpen > 15;
                  return (
                    <div key={f.id} style={{ background:overdue?"#fff8f8":C.card,
                      border:`1px solid ${overdue?"#fecaca":C.border}`,
                      borderRadius:9, padding:"11px 13px", cursor:"pointer",
                      boxShadow:"0 1px 3px rgba(0,0,0,0.05)" }}>
                      <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:7 }}>
                        <code style={{ background:C.primaryLight, color:C.primary, padding:"2px 6px", borderRadius:4, fontSize:10, fontWeight:800 }}>{f.code}</code>
                        <Badge label={tc.label} bg={tc.bg} text={tc.text} />
                      </div>
                      <div style={{ fontSize:12, fontWeight:600, color:C.text, lineHeight:1.4, marginBottom:8 }}>{f.title}</div>
                      <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between" }}>
                        <span style={{ fontSize:11, color:C.faint }}>{f.area}</span>
                        <span style={{ fontSize:10, fontWeight:700, color:overdue?C.danger:C.faint,
                          background:overdue?C.dangerLight:"#f8fafc", padding:"2px 7px", borderRadius:999 }}>
                          {daysOpen}d
                        </span>
                      </div>
                    </div>
                  );
                })}
                {cards.length === 0 && (
                  <div style={{ border:`2px dashed ${C.border}`, borderRadius:9, padding:18, textAlign:"center", color:C.faint, fontSize:12 }}>
                    Sin hallazgos
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Create Modal */}
      {showForm && (
        <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.5)", display:"flex", alignItems:"center", justifyContent:"center", zIndex:1000 }}>
          <div style={{ background:C.card, borderRadius:14, padding:28, width:520, boxShadow:"0 20px 60px rgba(0,0,0,0.3)" }}>
            <div style={{ fontSize:16, fontWeight:800, color:C.text, marginBottom:20 }}>Nueva NC / Hallazgo</div>
            <form onSubmit={handleCreate} style={{ display:"flex", flexDirection:"column", gap:14 }}>
              <div>
                <label style={{ fontSize:11, fontWeight:600, color:C.muted, display:"block", marginBottom:5, textTransform:"uppercase", letterSpacing:"0.05em" }}>Titulo *</label>
                <input value={form.title} onChange={e => setForm(p => ({...p, title:e.target.value}))} required
                  style={{ width:"100%", padding:"9px 12px", border:`1px solid ${C.border}`, borderRadius:7, fontSize:13, outline:"none", boxSizing:"border-box" }} />
              </div>
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
                <div>
                  <label style={{ fontSize:11, fontWeight:600, color:C.muted, display:"block", marginBottom:5, textTransform:"uppercase", letterSpacing:"0.05em" }}>Tipo *</label>
                  <select value={form.finding_type} onChange={e => setForm(p => ({...p, finding_type:e.target.value as any}))}
                    style={{ width:"100%", padding:"9px 12px", border:`1px solid ${C.border}`, borderRadius:7, fontSize:13, background:C.card, boxSizing:"border-box" }}>
                    <option value="nc_real">NC Real</option>
                    <option value="nc_potencial">NC Potencial</option>
                    <option value="mejora">Oportunidad de Mejora</option>
                  </select>
                </div>
                <div>
                  <label style={{ fontSize:11, fontWeight:600, color:C.muted, display:"block", marginBottom:5, textTransform:"uppercase", letterSpacing:"0.05em" }}>Area</label>
                  <input value={form.area} onChange={e => setForm(p => ({...p, area:e.target.value}))}
                    placeholder="Ej: Operaciones"
                    style={{ width:"100%", padding:"9px 12px", border:`1px solid ${C.border}`, borderRadius:7, fontSize:13, outline:"none", boxSizing:"border-box" }} />
                </div>
              </div>
              <div>
                <label style={{ fontSize:11, fontWeight:600, color:C.muted, display:"block", marginBottom:5, textTransform:"uppercase", letterSpacing:"0.05em" }}>Descripcion *</label>
                <textarea value={form.description} onChange={e => setForm(p => ({...p, description:e.target.value}))} required rows={3}
                  style={{ width:"100%", padding:"9px 12px", border:`1px solid ${C.border}`, borderRadius:7, fontSize:13, outline:"none", resize:"vertical", boxSizing:"border-box" }} />
              </div>
              <div style={{ display:"flex", gap:10, justifyContent:"flex-end" }}>
                <button type="button" onClick={() => setShowForm(false)}
                  style={{ padding:"9px 18px", border:`1px solid ${C.border}`, borderRadius:7, background:"none", cursor:"pointer", fontSize:13, color:C.muted }}>
                  Cancelar
                </button>
                <button type="submit" disabled={createFinding.isPending}
                  style={{ padding:"9px 20px", background:C.primary, border:"none", borderRadius:7, color:"#fff", fontSize:13, fontWeight:700, cursor:"pointer" }}>
                  {createFinding.isPending ? "Creando..." : "Crear hallazgo"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

// --- Risks Page ------------------------------------------------
function RisksPage() {
  const { risks, isLoading, riskLevel, stats } = useRisks();
  return (
    <div style={{ padding:28 }}>
      <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:14, marginBottom:20 }}>
        <KPICard label="Riesgos Significativos" value={stats.significant} sub="NPR > 16 -- requieren control" color={C.danger} icon="[!]" alert={stats.significant > 0} />
        <KPICard label="Riesgos Moderados" value={stats.moderate} sub="NPR 9-16 -- monitorear" color={C.warning} icon="[?]" />
        <KPICard label="Riesgos Aceptables" value={stats.acceptable} sub="NPR <= 8 -- bajo control" color={C.success} icon="[OK]" />
      </div>
      {isLoading ? <div style={{ textAlign:"center", padding:40, color:C.faint }}>Cargando riesgos...</div> : (
        <div style={{ background:C.card, borderRadius:12, border:`1px solid ${C.border}`, overflow:"hidden" }}>
          <table style={{ width:"100%", borderCollapse:"collapse" }}>
            <thead><tr style={{ background:C.bg }}>
              {["Codigo","Peligro / Aspecto","Area","P","S","D","NPR","Nivel"].map(h => (
                <th key={h} style={{ padding:"11px 16px", textAlign:"left", fontSize:11, fontWeight:700,
                  color:C.muted, textTransform:"uppercase", letterSpacing:"0.06em", borderBottom:`1px solid ${C.border}` }}>{h}</th>
              ))}
            </tr></thead>
            <tbody>
              {risks.map(r => {
                const lv = riskLevel(r.npr);
                return (
                  <tr key={r.id} style={{ borderBottom:`1px solid ${C.border}`, transition:"background 0.1s" }}
                    onMouseEnter={e => e.currentTarget.style.background=C.bg}
                    onMouseLeave={e => e.currentTarget.style.background=""}>
                    <td style={{ padding:"11px 16px" }}><code style={{ fontSize:11, fontWeight:700, color:C.primary }}>{r.code}</code></td>
                    <td style={{ padding:"11px 16px", fontSize:13, fontWeight:500, color:C.text, maxWidth:220 }}>{r.hazard_aspect}</td>
                    <td style={{ padding:"11px 16px", fontSize:12, color:C.muted }}>{r.process_area}</td>
                    {[r.probability, r.severity, r.detection].map((v,i) => (
                      <td key={i} style={{ padding:"11px 16px", textAlign:"center" }}>
                        <span style={{ width:26, height:26, borderRadius:6, background:C.primaryLight, color:C.primary, fontSize:12, fontWeight:800, display:"inline-flex", alignItems:"center", justifyContent:"center" }}>{v}</span>
                      </td>
                    ))}
                    <td style={{ padding:"11px 16px", textAlign:"center" }}>
                      <span style={{ fontSize:16, fontWeight:900, color:lv.color }}>{r.npr}</span>
                    </td>
                    <td style={{ padding:"11px 16px" }}><Badge label={lv.label} bg={lv.bg} text={lv.color} /></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// --- Legal Page ------------------------------------------------
function LegalPage() {
  const { requirements, isLoading, getDaysLeft, getStatus } = useLegal();
  return (
    <div style={{ padding:28 }}>
      <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:14, marginBottom:20 }}>
        {[
          ["Total", requirements.length, C.primary],
          ["Vigentes", requirements.filter(r => (getDaysLeft(r.expiration_date) ?? 999) > 90).length, C.success],
          ["Por vencer", requirements.filter(r => { const d=getDaysLeft(r.expiration_date); return d!==null && d>=0 && d<=90; }).length, C.warning],
          ["Vencidos", requirements.filter(r => (getDaysLeft(r.expiration_date) ?? 1) < 0).length, C.danger],
        ].map(([l,v,c]) => (
          <div key={String(l)} style={{ background:C.card, borderRadius:10, padding:"16px 20px", border:`1px solid ${C.border}` }}>
            <div style={{ fontSize:24, fontWeight:800, color:c as string }}>{v}</div>
            <div style={{ fontSize:12, color:C.faint, marginTop:4 }}>{l as string}</div>
          </div>
        ))}
      </div>
      {isLoading ? <div style={{ textAlign:"center", padding:40, color:C.faint }}>Cargando...</div> : (
        <div style={{ background:C.card, borderRadius:12, border:`1px solid ${C.border}`, overflow:"hidden" }}>
          <table style={{ width:"100%", borderCollapse:"collapse" }}>
            <thead><tr style={{ background:C.bg }}>
              {["Codigo","Requisito Legal","Categoria","Area","Vencimiento","Dias restantes","Estado"].map(h => (
                <th key={h} style={{ padding:"11px 16px", textAlign:"left", fontSize:11, fontWeight:700,
                  color:C.muted, textTransform:"uppercase", letterSpacing:"0.06em", borderBottom:`1px solid ${C.border}` }}>{h}</th>
              ))}
            </tr></thead>
            <tbody>
              {requirements.map(r => {
                const s = getStatus(r);
                const days = getDaysLeft(r.expiration_date);
                return (
                  <tr key={r.id} style={{ borderBottom:`1px solid ${C.border}` }}
                    onMouseEnter={e => e.currentTarget.style.background=C.bg}
                    onMouseLeave={e => e.currentTarget.style.background=""}>
                    <td style={{ padding:"11px 16px" }}><code style={{ fontSize:11, fontWeight:700, color:C.primary }}>{r.code}</code></td>
                    <td style={{ padding:"11px 16px", fontSize:13, fontWeight:500, color:C.text }}>{r.title}</td>
                    <td style={{ padding:"11px 16px", fontSize:12, color:C.muted }}>{r.category}</td>
                    <td style={{ padding:"11px 16px", fontSize:12, color:C.muted }}>{r.applicable_area}</td>
                    <td style={{ padding:"11px 16px", fontSize:12, color:C.text }}>{r.expiration_date ?? "--"}</td>
                    <td style={{ padding:"11px 16px", textAlign:"center" }}>
                      {days !== null ? <span style={{ background:s.bg, color:s.color, padding:"3px 10px", borderRadius:999, fontSize:12, fontWeight:700 }}>{days}d</span> : <span style={{ color:C.faint }}>--</span>}
                    </td>
                    <td style={{ padding:"11px 16px" }}><Badge label={s.label} bg={s.bg} text={s.color} /></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

const StubPage = ({ title }: { title:string }) => (
  <div style={{ padding:60, display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", gap:14, color:C.faint }}>
    <div style={{ fontSize:52 }}>#</div>
    <div style={{ fontSize:16, fontWeight:700, color:C.muted }}>Modulo en desarrollo</div>
    <div style={{ fontSize:13 }}>{title} -- proximamente disponible</div>
  </div>
);

// --- MAIN DASHBOARD CONTAINER ----------------------------------
export default function Dashboard() {
  const [page, setPage] = useState("dashboard");
  const { findings } = useFindings();
  const { requirements, getDaysLeft } = useLegal();

  const findingCount = findings.filter(f => f.status !== "cerrado").length;
  const legalAlerts = requirements.filter(r => { const d = getDaysLeft(r.expiration_date); return d !== null && d <= 90; }).length;
  const [title, sub] = PAGE_META[page] ?? [page, ""];

  const now = new Date().toLocaleDateString("es-AR", { weekday:"long", year:"numeric", month:"long", day:"numeric" });

  function renderPage() {
    switch(page) {
      case "dashboard": return <DashboardHome />;
      case "findings":  return <FindingsPage />;
      case "risks":     return <RisksPage />;
      case "legal":     return <LegalPage />;
      default: return <StubPage title={title} />;
    }
  }

  return (
    <div style={{ display:"flex", height:"100vh", background:C.bg, fontFamily:"'Manrope',system-ui,sans-serif", fontSize:14 }}>
      <style>{`* { box-sizing:border-box; margin:0; padding:0; } ::-webkit-scrollbar { width:5px; } ::-webkit-scrollbar-thumb { background:#cbd5e1; border-radius:99px; }`}</style>
      <Sidebar current={page} onNav={setPage} findingCount={findingCount} legalAlerts={legalAlerts} />
      <div style={{ flex:1, display:"flex", flexDirection:"column", overflow:"hidden" }}>
        {/* Header */}
        <div style={{ height:64, background:C.card, borderBottom:`1px solid ${C.border}`, display:"flex", alignItems:"center",
          padding:"0 28px", justifyContent:"space-between", flexShrink:0 }}>
          <div>
            <div style={{ fontSize:17, fontWeight:800, color:C.text, letterSpacing:"-0.01em" }}>{title}</div>
            <div style={{ fontSize:12, color:C.faint }}>{sub}</div>
          </div>
          <div style={{ display:"flex", alignItems:"center", gap:14 }}>
            <div style={{ fontSize:12, color:C.faint, textTransform:"capitalize" }}>{now}</div>
            {(findingCount + legalAlerts) > 0 && (
              <div style={{ padding:"6px 12px", borderRadius:8, background:C.dangerLight, color:C.danger, fontSize:12, fontWeight:600 }}>
                [!] {findingCount + legalAlerts} alertas
              </div>
            )}
          </div>
        </div>
        <div style={{ flex:1, overflowY:"auto" }}>{renderPage()}</div>
      </div>
    </div>
  );
}
