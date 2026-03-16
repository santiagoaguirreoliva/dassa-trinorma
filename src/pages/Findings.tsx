import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/integrations/supabase/client'
import { useAuth } from '@/contexts/AuthContext'

const STATUS_CONFIG: Record<string, { label: string; bg: string; text: string; dot: string; next?: string }> = {
  abierto:      { label: 'Abierto',       bg: '#fee2e2', text: '#dc2626', dot: '#ef4444', next: 'analisis' },
  analisis:     { label: 'En Analisis',   bg: '#fef3c7', text: '#d97706', dot: '#f59e0b', next: 'plan_accion' },
  plan_accion:  { label: 'Plan de Accion',bg: '#ede9fe', text: '#7c3aed', dot: '#8b5cf6', next: 'en_ejecucion' },
  en_ejecucion: { label: 'En Ejecucion',  bg: '#dbeafe', text: '#1d4ed8', dot: '#3b82f6', next: 'verificacion' },
  verificacion: { label: 'Verificacion',  bg: '#fce7f3', text: '#db2777', dot: '#ec4899', next: 'cerrado' },
  cerrado:      { label: 'Cerrado',       bg: '#d1fae5', text: '#059669', dot: '#10b981' },
}
const TYPE_CONFIG: Record<string, { label: string; bg: string; text: string }> = {
  nc_real:      { label: 'NC Real',     bg: '#fee2e2', text: '#dc2626' },
  nc_potencial: { label: 'NC Potencial',bg: '#fef3c7', text: '#d97706' },
  mejora:       { label: 'Mejora',      bg: '#d1fae5', text: '#059669' },
}
const DS = {
  bg: '#f0f4f8', card: '#ffffff', border: '#e2e8f0',
  textPrimary: '#0f172a', textSecondary: '#64748b', textMuted: '#94a3b8',
  primary: '#1d4ed8', primaryLight: '#dbeafe',
  danger: '#ef4444', dangerLight: '#fee2e2',
  success: '#10b981',
}

function Badge({ label, bg, text }: any) {
  return <span style={{ display: 'inline-flex', padding: '2px 8px', borderRadius: 999, fontSize: 11, fontWeight: 600, background: bg, color: text }}>{label}</span>
}

// -- Modal Nueva NC ----------------------------------------------------------
function NewFindingModal({ onClose, onSaved }: { onClose: () => void; onSaved: () => void }) {
  const { profile } = useAuth()
  const [form, setForm] = useState({ title: '', description: '', finding_type: 'nc_real', area: '', origin: 'desvio_operativo' })
  const [loading, setLoading] = useState(false)

  const save = async () => {
    if (!form.title.trim()) return
    setLoading(true)
    const { error } = await supabase.from('findings').insert({
      ...form,
      status: 'abierto',
      reported_by: profile?.id,
    })
    setLoading(false)
    if (!error) { onSaved(); onClose() }
  }

  const overlay: React.CSSProperties = { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }
  const modal: React.CSSProperties = { background: DS.card, borderRadius: 16, padding: 28, width: 520, maxWidth: '95vw', boxShadow: '0 24px 48px rgba(0,0,0,0.2)' }
  const label: React.CSSProperties = { display: 'block', fontSize: 11, fontWeight: 700, color: DS.textSecondary, marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.06em' }
  const input: React.CSSProperties = { width: '100%', padding: '9px 12px', border: `1px solid ${DS.border}`, borderRadius: 8, fontSize: 13, color: DS.textPrimary, outline: 'none', background: '#f8fafc', boxSizing: 'border-box' }
  const select: React.CSSProperties = { ...input, cursor: 'pointer' }

  return (
    <div style={overlay} onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div style={modal}>
        <div style={{ fontSize: 16, fontWeight: 800, color: DS.textPrimary, marginBottom: 20 }}>+ Nuevo Hallazgo / NC</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div>
            <label style={label}>Titulo *</label>
            <input style={input} value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="Descripcion breve del hallazgo" />
          </div>
          <div>
            <label style={label}>Descripcion</label>
            <textarea style={{ ...input, minHeight: 80, resize: 'vertical' }} value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="Detalle del problema detectado..." />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <label style={label}>Tipo</label>
              <select style={select} value={form.finding_type} onChange={e => setForm(f => ({ ...f, finding_type: e.target.value }))}>
                <option value="nc_real">NC Real</option>
                <option value="nc_potencial">NC Potencial</option>
                <option value="mejora">Oportunidad de Mejora</option>
              </select>
            </div>
            <div>
              <label style={label}>Area</label>
              <select style={select} value={form.area} onChange={e => setForm(f => ({ ...f, area: e.target.value }))}>
                <option value="">Seleccionar...</option>
                <option value="Operaciones">Operaciones</option>
                <option value="Seguridad">Seguridad</option>
                <option value="Ambiente">Ambiente</option>
                <option value="Calidad">Calidad</option>
                <option value="RRHH">RRHH</option>
                <option value="Sistemas">Sistemas</option>
                <option value="Comercial">Comercial</option>
              </select>
            </div>
          </div>
          <div>
            <label style={label}>Origen</label>
            <select style={select} value={form.origin} onChange={e => setForm(f => ({ ...f, origin: e.target.value }))}>
              <option value="desvio_operativo">Desvio operativo</option>
              <option value="auditoria_interna">Auditoria interna</option>
              <option value="auditoria_externa">Auditoria externa</option>
              <option value="reclamo_cliente">Reclamo de cliente</option>
              <option value="accidente">Accidente / Incidente</option>
              <option value="inspeccion">Inspeccion</option>
              <option value="revision_direccion">Revision por la direccion</option>
            </select>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 10, marginTop: 24, justifyContent: 'flex-end' }}>
          <button onClick={onClose} style={{ padding: '9px 18px', borderRadius: 8, border: `1px solid ${DS.border}`, background: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 600, color: DS.textSecondary }}>Cancelar</button>
          <button onClick={save} disabled={loading || !form.title.trim()} style={{ padding: '9px 18px', borderRadius: 8, border: 'none', background: DS.primary, color: '#fff', cursor: 'pointer', fontSize: 13, fontWeight: 700, opacity: loading ? 0.7 : 1 }}>
            {loading ? 'Guardando...' : 'Crear Hallazgo'}
          </button>
        </div>
      </div>
    </div>
  )
}

// -- Finding Card ------------------------------------------------------------
function FindingCard({ finding, onAdvance }: { finding: any; onAdvance: (id: string, nextStatus: string) => void }) {
  const s = STATUS_CONFIG[finding.status] || STATUS_CONFIG.abierto
  const t = TYPE_CONFIG[finding.finding_type] || TYPE_CONFIG.nc_real
  const overdue = finding.daysOpen > 15
  const initials = finding.assignedName ? finding.assignedName.split(' ').map((w: string) => w[0]).join('').slice(0, 2) : '?'

  return (
    <div style={{
      background: overdue ? '#fff8f8' : DS.card,
      border: `1px solid ${overdue ? '#fecaca' : DS.border}`,
      borderRadius: 10, padding: '12px 14px', cursor: 'pointer',
      boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
        <code style={{ background: DS.primaryLight, color: DS.primary, padding: '2px 6px', borderRadius: 4, fontSize: 10, fontWeight: 800 }}>{finding.code}</code>
        <Badge {...t} />
      </div>
      <div style={{ fontSize: 12, fontWeight: 600, color: DS.textPrimary, lineHeight: 1.4, marginBottom: 10 }}>{finding.title}</div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: s.next ? 10 : 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <div style={{ width: 22, height: 22, borderRadius: '50%', background: overdue ? DS.danger : DS.primary, color: '#fff', fontSize: 8, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{initials}</div>
          <span style={{ fontSize: 11, color: DS.textMuted }}>{finding.area || '--'}</span>
        </div>
        <span style={{ fontSize: 10, fontWeight: 700, color: overdue ? DS.danger : DS.textMuted, background: overdue ? DS.dangerLight : '#f8fafc', padding: '2px 7px', borderRadius: 999 }}>
          {finding.daysOpen}d
        </span>
      </div>
      {s.next && (
        <button
          onClick={() => onAdvance(finding.id, s.next!)}
          style={{
            width: '100%', marginTop: 8, padding: '5px', borderRadius: 6,
            border: `1px solid ${DS.border}`, background: '#f8fafc',
            fontSize: 10, fontWeight: 600, color: DS.textSecondary, cursor: 'pointer',
          }}
        > Avanzar a {STATUS_CONFIG[s.next]?.label}</button>
      )}
    </div>
  )
}

// -- Page --------------------------------------------------------------------
export default function Findings() {
  const queryClient = useQueryClient()
  const [showModal, setShowModal] = useState(false)

  const { data: findings = [], isLoading } = useQuery({
    queryKey: ['findings'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('findings')
        .select('*, profiles!findings_assigned_to_fkey(full_name)')
        .order('created_at', { ascending: false })
      if (error) throw error
      const now = new Date()
      return (data || []).map((f: any) => ({
        ...f,
        daysOpen: f.status !== 'cerrado' ? Math.floor((now.getTime() - new Date(f.created_at).getTime()) / 86400000) : 0,
        assignedName: f.profiles?.full_name || '',
      }))
    },
  })

  const advanceMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { error } = await supabase.from('findings').update({ status }).eq('id', id)
      if (error) throw error
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['findings'] }),
  })

  const statuses = Object.keys(STATUS_CONFIG)

  if (isLoading) return (
    <div style={{ padding: 48, textAlign: 'center', color: DS.textMuted }}>Cargando hallazgos...</div>
  )

  return (
    <div style={{ padding: 28, display: 'flex', flexDirection: 'column', gap: 20, height: 'calc(100vh - 64px)', overflow: 'hidden' }}>
      {/* Top bar */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
        <div style={{ display: 'flex', gap: 10 }}>
          {[
            { label: 'Activas', value: findings.filter(f => f.status !== 'cerrado').length, color: DS.danger },
            { label: 'Vencidas', value: findings.filter(f => f.daysOpen > 15 && f.status !== 'cerrado').length, color: '#f97316' },
            { label: 'Cerradas', value: findings.filter(f => f.status === 'cerrado').length, color: DS.success },
          ].map(s => (
            <div key={s.label} style={{ background: DS.card, border: `1px solid ${DS.border}`, borderRadius: 8, padding: '8px 16px', textAlign: 'center' }}>
              <div style={{ fontSize: 20, fontWeight: 800, color: s.color }}>{s.value}</div>
              <div style={{ fontSize: 11, color: DS.textMuted }}>{s.label}</div>
            </div>
          ))}
        </div>
        <button
          onClick={() => setShowModal(true)}
          style={{ background: DS.primary, color: '#fff', border: 'none', borderRadius: 8, padding: '10px 18px', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}
        >+ Nuevo Hallazgo</button>
      </div>

      {/* Kanban */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 10, flex: 1, overflow: 'hidden' }}>
        {statuses.map(status => {
          const config = STATUS_CONFIG[status]
          const cards = findings.filter(f => f.status === status)
          return (
            <div key={status} style={{ display: 'flex', flexDirection: 'column', gap: 8, overflow: 'hidden' }}>
              <div style={{ padding: '8px 12px', borderRadius: 8, background: config.bg, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                  <div style={{ width: 7, height: 7, borderRadius: '50%', background: config.dot }} />
                  <span style={{ fontSize: 10, fontWeight: 700, color: config.text }}>{config.label}</span>
                </div>
                <span style={{ fontSize: 11, fontWeight: 800, color: config.text }}>{cards.length}</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 7, overflowY: 'auto', flex: 1, paddingBottom: 8 }}>
                {cards.map(f => (
                  <FindingCard
                    key={f.id}
                    finding={f}
                    onAdvance={(id, next) => advanceMutation.mutate({ id, status: next })}
                  />
                ))}
                {cards.length === 0 && (
                  <div style={{ border: `2px dashed ${DS.border}`, borderRadius: 10, padding: 16, textAlign: 'center', color: DS.textMuted, fontSize: 11 }}>
                    Sin hallazgos
                  </div>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {showModal && <NewFindingModal onClose={() => setShowModal(false)} onSaved={() => queryClient.invalidateQueries({ queryKey: ['findings'] })} />}
    </div>
  )
}
