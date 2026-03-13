// --- RISKS -------------------------------------------------------------------
import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/integrations/supabase/client'

const DS = {
  bg: '#f0f4f8', card: '#ffffff', border: '#e2e8f0',
  textPrimary: '#0f172a', textSecondary: '#64748b', textMuted: '#94a3b8',
  primary: '#1d4ed8', primaryLight: '#dbeafe',
  danger: '#ef4444', dangerLight: '#fee2e2',
  warning: '#f59e0b', warningLight: '#fef3c7',
  success: '#10b981', successLight: '#d1fae5',
}

function Badge({ label, bg, text }: any) {
  return <span style={{ display: 'inline-flex', padding: '2px 8px', borderRadius: 999, fontSize: 11, fontWeight: 600, background: bg, color: text }}>{label}</span>
}

function NprBadge({ npr }: { npr: number }) {
  const high = npr > 16, med = npr > 8
  const color = high ? DS.danger : med ? DS.warning : DS.success
  const bg = high ? DS.dangerLight : med ? DS.warningLight : DS.successLight
  const label = high ? 'Significativo' : med ? 'Moderado' : 'Aceptable'
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <span style={{ fontSize: 18, fontWeight: 900, color, minWidth: 28 }}>{npr}</span>
      <Badge label={label} bg={bg} text={color} />
    </div>
  )
}

export function Risks() {
  const { data: risks = [], isLoading } = useQuery({
    queryKey: ['risks'],
    queryFn: async () => {
      const { data, error } = await supabase.from('risks').select('*, profiles!risks_responsible_id_fkey(full_name)').eq('is_active', true).order('created_at')
      if (error) throw error
      return (data || []).map((r: any) => ({ ...r, npr: r.probability * r.severity * r.detection, responsibleName: r.profiles?.full_name || '--' }))
    },
  })

  if (isLoading) return <div style={{ padding: 48, textAlign: 'center', color: DS.textMuted }}>Cargando...</div>

  return (
    <div style={{ padding: 28 }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 20 }}>
        {[
          { label: 'Significativos (NPR>16)', value: risks.filter(r => r.npr > 16).length, color: DS.danger, bg: DS.dangerLight },
          { label: 'Moderados (NPR 9-16)',    value: risks.filter(r => r.npr > 8 && r.npr <= 16).length, color: DS.warning, bg: DS.warningLight },
          { label: 'Aceptables (NPR<=8)',      value: risks.filter(r => r.npr <= 8).length, color: DS.success, bg: DS.successLight },
        ].map(s => (
          <div key={s.label} style={{ background: s.bg, borderRadius: 10, padding: '16px 20px', border: `1px solid ${s.color}30` }}>
            <div style={{ fontSize: 28, fontWeight: 800, color: s.color }}>{s.value}</div>
            <div style={{ fontSize: 12, color: s.color, fontWeight: 600, marginTop: 4 }}>{s.label}</div>
          </div>
        ))}
      </div>
      <div style={{ background: DS.card, borderRadius: 12, border: `1px solid ${DS.border}`, overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: DS.bg }}>
              {['Codigo', 'Peligro / Aspecto', 'Area', 'P', 'S', 'D', 'NPR / Nivel', 'Responsable'].map(h => (
                <th key={h} style={{ padding: '12px 14px', textAlign: 'left', fontSize: 10, fontWeight: 700, color: DS.textSecondary, textTransform: 'uppercase', letterSpacing: '0.07em', borderBottom: `1px solid ${DS.border}` }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {risks.length === 0 && (
              <tr><td colSpan={8} style={{ padding: '32px', textAlign: 'center', color: DS.textMuted, fontSize: 13 }}>Sin riesgos registrados. Carga la matriz desde Supabase.</td></tr>
            )}
            {risks.map((r: any) => (
              <tr key={r.id} style={{ borderBottom: `1px solid ${DS.border}` }}
                onMouseEnter={e => (e.currentTarget.style.background = DS.bg)}
                onMouseLeave={e => (e.currentTarget.style.background = '')}
              >
                <td style={{ padding: '12px 14px' }}><code style={{ fontSize: 11, fontWeight: 700, color: DS.primary }}>{r.code}</code></td>
                <td style={{ padding: '12px 14px', fontSize: 13, fontWeight: 500, color: DS.textPrimary, maxWidth: 220 }}>{r.hazard_aspect}</td>
                <td style={{ padding: '12px 14px', fontSize: 12, color: DS.textSecondary }}>{r.process_area}</td>
                {[r.probability, r.severity, r.detection].map((v: number, i: number) => (
                  <td key={i} style={{ padding: '12px 14px', textAlign: 'center' }}>
                    <span style={{ width: 26, height: 26, borderRadius: 6, background: DS.primaryLight, color: DS.primary, fontSize: 13, fontWeight: 800, display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>{v}</span>
                  </td>
                ))}
                <td style={{ padding: '12px 14px' }}><NprBadge npr={r.npr} /></td>
                <td style={{ padding: '12px 14px', fontSize: 12, color: DS.textSecondary }}>{r.responsibleName}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

// --- LEGAL --------------------------------------------------------------------
export function Legal() {
  const { data: items = [], isLoading } = useQuery({
    queryKey: ['legal'],
    queryFn: async () => {
      const { data, error } = await supabase.from('legal_requirements').select('*').eq('is_active', true).order('expiration_date')
      if (error) throw error
      const today = new Date()
      return (data || []).map((l: any) => {
        const expDate = l.expiration_date ? new Date(l.expiration_date) : null
        const daysLeft = expDate ? Math.floor((expDate.getTime() - today.getTime()) / 86400000) : 9999
        const status = daysLeft < 0 ? 'vencido' : daysLeft <= 30 ? 'critico' : daysLeft <= 60 ? 'por_vencer' : 'vigente'
        return { ...l, daysLeft, status }
      })
    },
  })

  if (isLoading) return <div style={{ padding: 48, textAlign: 'center', color: DS.textMuted }}>Cargando...</div>

  const statusStyles: Record<string, any> = {
    vencido:   { label: 'Vencido',    color: '#fff',     bg: DS.danger },
    critico:   { label: 'Critico',    color: DS.danger,  bg: DS.dangerLight },
    por_vencer:{ label: 'Por vencer', color: DS.warning, bg: DS.warningLight },
    vigente:   { label: 'Vigente',    color: DS.success, bg: DS.successLight },
  }

  return (
    <div style={{ padding: 28 }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 20 }}>
        {[
          { label: 'Total', value: items.length, color: DS.primary },
          { label: 'Vigentes', value: items.filter(l => l.status === 'vigente').length, color: DS.success },
          { label: 'Por vencer', value: items.filter(l => l.status === 'por_vencer' || l.status === 'critico').length, color: DS.warning },
          { label: 'Vencidos', value: items.filter(l => l.status === 'vencido').length, color: DS.danger },
        ].map(s => (
          <div key={s.label} style={{ background: DS.card, borderRadius: 10, padding: '16px 20px', border: `1px solid ${DS.border}` }}>
            <div style={{ fontSize: 28, fontWeight: 800, color: s.color }}>{s.value}</div>
            <div style={{ fontSize: 12, color: DS.textMuted, marginTop: 4 }}>{s.label}</div>
          </div>
        ))}
      </div>
      <div style={{ background: DS.card, borderRadius: 12, border: `1px solid ${DS.border}`, overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: DS.bg }}>
              {['Codigo', 'Requisito Legal', 'Categoria', 'Area Aplicable', 'Vencimiento', 'Dias restantes', 'Estado'].map(h => (
                <th key={h} style={{ padding: '12px 14px', textAlign: 'left', fontSize: 10, fontWeight: 700, color: DS.textSecondary, textTransform: 'uppercase', letterSpacing: '0.07em', borderBottom: `1px solid ${DS.border}` }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {items.length === 0 && (
              <tr><td colSpan={7} style={{ padding: '32px', textAlign: 'center', color: DS.textMuted, fontSize: 13 }}>Sin requisitos legales cargados.</td></tr>
            )}
            {items.map((l: any) => {
              const ss = statusStyles[l.status]
              return (
                <tr key={l.id} style={{ borderBottom: `1px solid ${DS.border}` }}
                  onMouseEnter={e => (e.currentTarget.style.background = DS.bg)}
                  onMouseLeave={e => (e.currentTarget.style.background = '')}
                >
                  <td style={{ padding: '12px 14px' }}><code style={{ fontSize: 11, fontWeight: 700, color: DS.primary }}>{l.code}</code></td>
                  <td style={{ padding: '12px 14px', fontSize: 13, fontWeight: 500, color: DS.textPrimary }}>{l.title}</td>
                  <td style={{ padding: '12px 14px', fontSize: 12, color: DS.textSecondary }}>{l.category}</td>
                  <td style={{ padding: '12px 14px', fontSize: 12, color: DS.textSecondary }}>{l.applicable_area}</td>
                  <td style={{ padding: '12px 14px', fontSize: 12, color: DS.textPrimary }}>{l.expiration_date || '--'}</td>
                  <td style={{ padding: '12px 14px', textAlign: 'center' }}>
                    {l.daysLeft < 9999 && (
                      <span style={{ background: l.daysLeft < 0 ? DS.danger : l.daysLeft < 30 ? DS.dangerLight : DS.warningLight, color: l.daysLeft < 0 ? '#fff' : l.daysLeft < 30 ? DS.danger : DS.warning, padding: '4px 12px', borderRadius: 999, fontSize: 12, fontWeight: 700 }}>
                        {l.daysLeft < 0 ? `${Math.abs(l.daysLeft)}d vencido` : `${l.daysLeft}d`}
                      </span>
                    )}
                  </td>
                  <td style={{ padding: '12px 14px' }}><Badge label={ss.label} bg={ss.bg} text={ss.color} /></td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}

// --- TRAININGS ----------------------------------------------------------------
export function Trainings() {
  const { data: trainings = [], isLoading } = useQuery({
    queryKey: ['trainings'],
    queryFn: async () => {
      const { data, error } = await supabase.from('trainings').select('*').order('scheduled_date')
      if (error) throw error
      return data || []
    },
  })

  if (isLoading) return <div style={{ padding: 48, textAlign: 'center', color: DS.textMuted }}>Cargando...</div>

  const upcoming = trainings.filter((t: any) => !t.is_completed && new Date(t.scheduled_date) >= new Date())
  const completed = trainings.filter((t: any) => t.is_completed)

  return (
    <div style={{ padding: 28 }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 20 }}>
        {[
          { label: 'Total', value: trainings.length, color: DS.primary },
          { label: 'Proximas', value: upcoming.length, color: DS.warning },
          { label: 'Completadas', value: completed.length, color: DS.success },
        ].map(s => (
          <div key={s.label} style={{ background: DS.card, borderRadius: 10, padding: '16px 20px', border: `1px solid ${DS.border}` }}>
            <div style={{ fontSize: 28, fontWeight: 800, color: s.color }}>{s.value}</div>
            <div style={{ fontSize: 12, color: DS.textMuted, marginTop: 4 }}>{s.label}</div>
          </div>
        ))}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 14 }}>
        {trainings.length === 0 && (
          <div style={{ gridColumn: 'span 2', textAlign: 'center', padding: '40px', color: DS.textMuted, fontSize: 13 }}>Sin capacitaciones cargadas.</div>
        )}
        {trainings.map((t: any) => (
          <div key={t.id} style={{
            background: t.is_completed ? DS.successLight : DS.card, borderRadius: 12, padding: 20,
            border: `1px solid ${t.is_completed ? DS.success + '40' : DS.border}`,
            boxShadow: '0 1px 4px rgba(0,0,0,0.05)', display: 'flex', gap: 16,
          }}>
            <div style={{ width: 48, height: 48, borderRadius: 12, background: DS.primaryLight, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24, flexShrink: 0 }}>
              {t.training_type === 'capacitacion' ? '[docs]' : t.training_type === 'reunion' ? '[collab]' : t.training_type === 'examen_medico' ? '[health]' : '[alert]'}
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: DS.textPrimary, marginBottom: 6 }}>{t.title}</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center' }}>
                <span style={{ fontSize: 11, color: DS.textMuted }}>[date] {new Date(t.scheduled_date).toLocaleDateString('es-AR')}</span>
                {t.location && <span style={{ fontSize: 11, color: DS.textMuted }}>[loc] {t.location}</span>}
                {t.is_mandatory && <Badge label="Obligatoria" bg={DS.dangerLight} text={DS.danger} />}
                {t.is_completed && <Badge label="OK Completada" bg={DS.successLight} text={DS.success} />}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

// --- PURCHASES ---------------------------------------------------------------
export function Purchases() {
  const { data: purchases = [], isLoading } = useQuery({
    queryKey: ['purchases'],
    queryFn: async () => {
      const { data, error } = await supabase.from('purchase_requests').select('*, profiles!purchase_requests_requested_by_fkey(full_name)').order('created_at', { ascending: false })
      if (error) throw error
      return (data || []).map((p: any) => ({ ...p, requesterName: p.profiles?.full_name || '--' }))
    },
  })

  const statusStyles: Record<string, any> = {
    borrador:         { label: 'Borrador',         color: DS.textMuted,   bg: '#f1f5f9' },
    pendiente:        { label: 'Pendiente',         color: DS.warning,    bg: DS.warningLight },
    aprobada:         { label: 'Aprobada',          color: DS.success,    bg: DS.successLight },
    aprobada_diferida:{ label: 'Diferida',          color: '#8b5cf6',     bg: '#ede9fe' },
    en_ejecucion:     { label: 'En Ejecucion',      color: DS.primary,    bg: DS.primaryLight },
    completada:       { label: 'Completada',        color: DS.success,    bg: DS.successLight },
    rechazada:        { label: 'Rechazada',         color: DS.danger,     bg: DS.dangerLight },
    cancelada:        { label: 'Cancelada',         color: DS.textMuted,  bg: '#f1f5f9' },
  }

  if (isLoading) return <div style={{ padding: 48, textAlign: 'center', color: DS.textMuted }}>Cargando...</div>

  return (
    <div style={{ padding: 28 }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 20 }}>
        {[
          { label: 'Total', value: purchases.length, color: DS.primary },
          { label: 'Pendientes', value: purchases.filter((p: any) => p.status === 'pendiente').length, color: DS.warning },
          { label: 'Aprobadas', value: purchases.filter((p: any) => ['aprobada', 'en_ejecucion'].includes(p.status)).length, color: DS.success },
          { label: 'Completadas', value: purchases.filter((p: any) => p.status === 'completada').length, color: DS.textSecondary },
        ].map(s => (
          <div key={s.label} style={{ background: DS.card, borderRadius: 10, padding: '16px 20px', border: `1px solid ${DS.border}` }}>
            <div style={{ fontSize: 28, fontWeight: 800, color: s.color }}>{s.value}</div>
            <div style={{ fontSize: 12, color: DS.textMuted, marginTop: 4 }}>{s.label}</div>
          </div>
        ))}
      </div>
      <div style={{ background: DS.card, borderRadius: 12, border: `1px solid ${DS.border}`, overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: DS.bg }}>
              {['Codigo', 'Descripcion', 'Solicitante', 'Presupuesto', 'Fecha requerida', 'Estado'].map(h => (
                <th key={h} style={{ padding: '12px 14px', textAlign: 'left', fontSize: 10, fontWeight: 700, color: DS.textSecondary, textTransform: 'uppercase', letterSpacing: '0.07em', borderBottom: `1px solid ${DS.border}` }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {purchases.length === 0 && (
              <tr><td colSpan={6} style={{ padding: '32px', textAlign: 'center', color: DS.textMuted, fontSize: 13 }}>Sin solicitudes de compra.</td></tr>
            )}
            {purchases.map((p: any) => {
              const ss = statusStyles[p.status] || statusStyles.borrador
              return (
                <tr key={p.id} style={{ borderBottom: `1px solid ${DS.border}` }}
                  onMouseEnter={e => (e.currentTarget.style.background = DS.bg)}
                  onMouseLeave={e => (e.currentTarget.style.background = '')}
                >
                  <td style={{ padding: '12px 14px' }}><code style={{ fontSize: 11, fontWeight: 700, color: DS.primary }}>{p.code}</code></td>
                  <td style={{ padding: '12px 14px', fontSize: 13, color: DS.textPrimary, maxWidth: 240 }}>{p.description}</td>
                  <td style={{ padding: '12px 14px', fontSize: 12, color: DS.textSecondary }}>{p.requesterName}</td>
                  <td style={{ padding: '12px 14px', fontSize: 13, fontWeight: 600, color: DS.textPrimary }}>
                    {p.estimated_budget ? `$${p.estimated_budget.toLocaleString('es-AR')}` : '--'}
                  </td>
                  <td style={{ padding: '12px 14px', fontSize: 12, color: DS.textSecondary }}>{p.required_date}</td>
                  <td style={{ padding: '12px 14px' }}><Badge label={ss.label} bg={ss.bg} text={ss.color} /></td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}

// --- DOCUMENTS ---------------------------------------------------------------
export function Documents() {
  const { data: docs = [], isLoading } = useQuery({
    queryKey: ['documents'],
    queryFn: async () => {
      const { data, error } = await supabase.from('documents').select('*, profiles!documents_responsible_id_fkey(full_name)').order('code')
      if (error) throw error
      return (data || []).map((d: any) => ({ ...d, responsibleName: d.profiles?.full_name || '--' }))
    },
  })

  const typeStyles: Record<string, any> = {
    P: { label: 'Procedimiento', color: DS.primary, bg: DS.primaryLight },
    F: { label: 'Formulario',    color: '#8b5cf6',  bg: '#ede9fe' },
    I: { label: 'Instructivo',   color: DS.warning, bg: DS.warningLight },
    M: { label: 'Manual',        color: DS.success, bg: DS.successLight },
  }
  const statusStyles: Record<string, any> = {
    draft:            { label: 'Borrador',     color: DS.textMuted, bg: '#f1f5f9' },
    pending_approval: { label: 'En Aprobacion',color: DS.warning,  bg: DS.warningLight },
    approved:         { label: 'Aprobado',     color: DS.success,  bg: DS.successLight },
    obsolete:         { label: 'Obsoleto',     color: DS.danger,   bg: DS.dangerLight },
  }

  if (isLoading) return <div style={{ padding: 48, textAlign: 'center', color: DS.textMuted }}>Cargando...</div>

  return (
    <div style={{ padding: 28 }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 20 }}>
        {[
          { label: 'Total', value: docs.length, color: DS.primary },
          { label: 'Aprobados', value: docs.filter((d: any) => d.status === 'approved').length, color: DS.success },
          { label: 'En Aprobacion', value: docs.filter((d: any) => d.status === 'pending_approval').length, color: DS.warning },
          { label: 'Borradores', value: docs.filter((d: any) => d.status === 'draft').length, color: DS.textMuted },
        ].map(s => (
          <div key={s.label} style={{ background: DS.card, borderRadius: 10, padding: '16px 20px', border: `1px solid ${DS.border}` }}>
            <div style={{ fontSize: 28, fontWeight: 800, color: s.color }}>{s.value}</div>
            <div style={{ fontSize: 12, color: DS.textMuted, marginTop: 4 }}>{s.label}</div>
          </div>
        ))}
      </div>
      <div style={{ background: DS.card, borderRadius: 12, border: `1px solid ${DS.border}`, overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: DS.bg }}>
              {['Codigo', 'Titulo', 'Tipo', 'Version', 'Responsable', 'Estado', 'Archivo'].map(h => (
                <th key={h} style={{ padding: '12px 14px', textAlign: 'left', fontSize: 10, fontWeight: 700, color: DS.textSecondary, textTransform: 'uppercase', letterSpacing: '0.07em', borderBottom: `1px solid ${DS.border}` }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {docs.length === 0 && (
              <tr><td colSpan={7} style={{ padding: '32px', textAlign: 'center', color: DS.textMuted, fontSize: 13 }}>Sin documentos cargados.</td></tr>
            )}
            {docs.map((d: any) => {
              const ts = typeStyles[d.document_type] || { label: d.document_type, color: DS.primary, bg: DS.primaryLight }
              const ss = statusStyles[d.status] || statusStyles.draft
              return (
                <tr key={d.id} style={{ borderBottom: `1px solid ${DS.border}` }}
                  onMouseEnter={e => (e.currentTarget.style.background = DS.bg)}
                  onMouseLeave={e => (e.currentTarget.style.background = '')}
                >
                  <td style={{ padding: '12px 14px' }}><code style={{ fontSize: 11, fontWeight: 700, color: DS.primary }}>{d.code}</code></td>
                  <td style={{ padding: '12px 14px', fontSize: 13, fontWeight: 500, color: DS.textPrimary }}>{d.title}</td>
                  <td style={{ padding: '12px 14px' }}><Badge label={ts.label} bg={ts.bg} text={ts.color} /></td>
                  <td style={{ padding: '12px 14px', textAlign: 'center' }}><span style={{ fontWeight: 700, color: DS.textPrimary }}>v{d.version}</span></td>
                  <td style={{ padding: '12px 14px', fontSize: 12, color: DS.textSecondary }}>{d.responsibleName}</td>
                  <td style={{ padding: '12px 14px' }}><Badge label={ss.label} bg={ss.bg} text={ss.color} /></td>
                  <td style={{ padding: '12px 14px' }}>
                    {d.file_url ? (
                      <a href={d.file_url} target="_blank" rel="noopener noreferrer" style={{ fontSize: 11, color: DS.primary, fontWeight: 600, textDecoration: 'none' }}>Ver ^</a>
                    ) : <span style={{ fontSize: 11, color: DS.textMuted }}>--</span>}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
