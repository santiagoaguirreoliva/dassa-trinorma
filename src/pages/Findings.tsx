import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/integrations/supabase/client'
import { useAuth } from '@/contexts/AuthContext'

type FindingStatus = 'abierto'|'analisis'|'plan_accion'|'en_ejecucion'|'verificacion'|'cerrado'
type FindingType = 'nc_real'|'nc_potencial'|'mejora'

interface Finding {
  id: string
  code: string
  title: string
  description: string
  finding_type: FindingType
  status: FindingStatus
  origin: string
  area: string
  due_date?: string
  immediate_action?: string
  financial_impact?: number
  created_at: string
}

const STATUS_CONFIG: Record<FindingStatus, { label: string; color: string; bg: string }> = {
  abierto:       { label: 'Abierto',        color: '#ef4444', bg: '#fee2e2' },
  analisis:      { label: 'Análisis',       color: '#f59e0b', bg: '#fef3c7' },
  plan_accion:   { label: 'Plan de Acción',color: '#3b82f6', bg: '#dbeafe' },
  en_ejecucion:  { label: 'En Ejecución', color: '#8b5cf6', bg: '#ede9fe' },
  verificacion:  { label: 'Verificación',  color: '#06b6d4', bg: '#cffafe' },
  cerrado:       { label: 'Cerrado',        color: '#10b981', bg: '#d1fae5' },
}

const TYPE_CONFIG: Record<FindingType, { label: string; color: string }> = {
  nc_real:       { label: 'NC Real',        color: '#ef4444' },
  nc_potencial:  { label: 'NC Potencial',   color: '#f59e0b' },
  mejora:        { label: 'Oportunidad',    color: '#10b981' },
}

const STATUSES: FindingStatus[] = ['abierto','analisis','plan_accion','en_ejecucion','verificacion','cerrado']

export default function Findings() {
  const { profile } = useAuth()
  const qc = useQueryClient()
  const [selectedStatus, setSelectedStatus] = useState<FindingStatus|'all'>('all')
  const [showForm, setShowForm] = useState(false)
  const [selectedFinding, setSelectedFinding] = useState<Finding|null>(null)

  const { data: findings = [], isLoading } = useQuery({
    queryKey: ['findings'],
    queryFn: async () => {
      const { data, error } = await supabase.from('findings').select('*').order('created_at', { ascending: false })
      if (error) throw error
      return data as Finding[]
    }
  })

  const createFinding = useMutation({
    mutationFn: async (data: any) => {
      const { error } = await supabase.from('findings').insert({ ...data, reported_by: profile?.id })
      if (error) throw error
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['findings'] }); setShowForm(false) }
  })

  const updateStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: FindingStatus }) => {
      const { error } = await supabase.from('findings').update({ status }).eq('id', id)
      if (error) throw error
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['findings'] })
  })

  const filtered = selectedStatus === 'all' ? findings : findings.filter(f => f.status === selectedStatus)
  const stats = Object.fromEntries(STATUSES.map(s => [s, findings.filter(f => f.status === s).length]))

  return (
    <div style={{ padding: '24px', maxWidth: '1280px', margin: '0 auto' }}>
      {/* HEADER */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: '#111827', margin: 0 }}>Hallazgos</h1>
          <p style={{ fontSize: 13, color: '#64748b', margin: '4px 0 0' }}>No Conformidades y Oportunidades de Mejora</p>
        </div>
        <button onClick={() => setShowForm(true)}
          style={{ padding: '8px 20px', background: '#1d4ed8', color: '#fff', border: 'none', borderRadius: 8, fontWeight: 600, cursor: 'pointer' }}>
          + Nuevo Hallazgo
        </button>
      </div>

      {/* STATS KANBAN COUNTS */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 20, overflowX: 'auto', paddingBottom: 4 }}>
        {[{ key: 'all', label: 'Todos', count: findings.length, color: '#64748b', bg: '#f1f5f9' },
          ...STATUSES.map(s => ({ key: s, label: STATUS_CONFIG[s].label, count: stats[s], color: STATUS_CONFIG[s].color, bg: STATUS_CONFIG[s].bg }))
        ].map(tab => (
          <button key={tab.key} onClick={() => setSelectedStatus(tab.key as any)}
            style={{ padding: '6px 14px', border: 'none', borderRadius: 999, cursor: 'pointer', fontSize: 12, fontWeight: 600, whiteSpace: 'nowrap', background: selectedStatus === tab.key ? tab.color : tab.bg, color: selectedStatus === tab.key ? '#fff' : tab.color }}>
            {tab.label} {tab.count > 0 && <span style={{ marginLeft: 4, opacity: 0.7 }}>({tab.count})</span>}
          </button>
        ))}
      </div>

      {/* KANBAN BOARD */}
      <div style={{ display: 'flex', gap: 12, overflowX: 'auto', paddingBottom: 16 }}>
        {STATUSES.filter(s => selectedStatus === 'all' || s === selectedStatus).map(status => {
          const config = STATUS_CONFIG[status]
          const colCards = filtered.filter(f => f.status === status)
          return (
            <div key={status} style={{ minWidth: 280, flex: 1, background: '#f8fafc', borderRadius: 12, padding: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                <div style={{ width: 10, height: 10, borderRadius: 999, background: config.color }} />
                <span style={{ fontWeight: 600, fontSize: 13 }}>{config.label}</span>
                <span style={{ marginLeft: 'auto', background: config.bg, color: config.color, padding: '2px 8px', borderRadius: 999, fontSize: 11, fontWeight: 700 }}>{colCards.length}</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {colCards.map(f => (
                  <div key={f.id}
                    onClick={() => setSelectedFinding(f)}
                    style={{ background: '#fff', borderRadius: 10, padding: 14, boxShadow: '0 1px 3px rgba(0,0,0,0.08)', cursor: 'pointer', border: '1px solid #e2e8f0' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                      <span style={{ fontSize: 11, color: '#94a3b8', fontWeight: 600 }}>{f.code}</span>
                      <span style={{ fontSize: 11, background: TYPE_CONFIG[f.finding_type]?.color + '20', color: TYPE_CONFIG[f.finding_type]?.color, padding: '2px 7px', borderRadius: 999 }}>{TYPE_CONFIG[f.finding_type]?.label}</span>
                    </div>
                    <p style={{ fontSize: 13, fontWeight: 600, color: '#1e293b', margin: '0 0 6px', lineHeight: 1.4 }}>{f.title}</p>
                    <p style={{ fontSize: 12, color: '#64748b', margin: 0, lineHeight: 1.4 }}>{f.area}</p>
                    {f.due_date && (
                      <p style={{ fontSize: 11, color: new Date(f.due_date) < new Date() ? '#ef4444' : '#94a3b8', margin: '6px 0 0', fontWeight: 600 }}>
                        ⌓ {new Date(f.due_date).toLocaleDateString('es-AR')}
                      </p>
                    )}
                    <select
                      value={f.status}
                      onChange={e => { e.stopPropagation(); updateStatus.mutate({ id: f.id, status: e.target.value as FindingStatus }) }}
                      style={{ marginTop: 8, width: '100%', padding: '4px 8px', border: '1px solid #e2e8f0', borderRadius: 6, fontSize: 11, background: '#f8fafc', cursor: 'pointer' }}
                    >
                      {STATUSES.map(s => <option key={s} value={s}>{STATUS_CONFIG[s].label}</option>)}
                    </select>
                  </div>
                ))}
                <div style={{ textAlign: 'center', padding: 16, color: '#cbd5e1', fontSize: 13 }}>
                  {colCards.length === 0 && 'Sin hallazgos'}
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* MODAL: NEW FINDING */}
      {showForm && <NewFindingModal onClose={() => setShowForm(false)} onSave={createFinding.mutate} isLoading={createFinding.isPending} />}

      {/* DETAIL DRAWER */}
      {selectedFinding && <FindingDetail finding={selectedFinding} onClose={() => setSelectedFinding(null)} />}
    </div>
  )
}

function NewFindingModal({ onClose, onSave, isLoading }: { onClose: () => void; onSave: (d: any) => void; isLoading: boolean }) {
  const [form, setForm] = useState({
    title: '', description: '', finding_type: 'nc_real' as FindingType,
    origin: '', area: '', due_date: '',
  })

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zindex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
      <div style={{ background: '#fff', borderRadius: 16, padding: 32, width: 520, maxHeight: '90vh', overflowY: 'auto' }}>
        <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 24 }}>Nuevo Hallazgo</h2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {[
            { label: 'Título', key: 'title', type: 'text' },
            { label: 'Origen', key: 'origin', type: 'text' },
            { label: 'Área/Proceso', key: 'area', type: 'text' },
            { label: 'Fecha límite', key: 'due_date', type: 'date' },
          ].map(f => (
            <div key={f.key}>
              <label style={{ fontSize: 12, fontWeight: 600, color: '#475569', display: 'block', marginBottom: 6 }}>{f.label}</label>
              <input type={f.type} value={(form as any)[f.key]}
                onChange={e => setForm(p => ({ ...p, [f.key]: e.target.value }))}
                style={{ width: '100%', padding: '8px 12px', border: '1px solid #e2e8f0', borderRadius: 8, fontSize: 14, boxSizing: 'border-box' }} />
            </div>
          ))}
          <div>
            <label style={{ fontSize: 12, fontWeight: 600, color: '#475569', display: 'block', marginBottom: 6 }}>Tipo</label>
            <select value={form.finding_type} onChange={e => setForm(p => ({ ...p, finding_type: e.target.value as FindingType }))}
              style={{ width: '100%', padding: '8px 12px', border: '1px solid #e2e8f0', borderRadius: 8, fontSize: 14 }}>
              {(Object.entries(TYPE_CONFIG) as [FindingType, any][]).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
            </select>
          </div>
          <div>
            <label style={{ fontSize: 12, fontWeight: 600, color: '#475569', display: 'block', marginBottom: 6 }}>Descripción</label>
            <textarea value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))}
              rows={3} style={{ width: '100%', padding: '8px 12px', border: '1px solid #e2e8f0', borderRadius: 8, fontSize: 14, boxSizing: 'border-box', resize: 'vertical' }} />
          </div>
        </div>
        <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end', marginTop: 24 }}>
          <button onClick={onClose} style={{ padding: '8px 18px', border: '1px solid #e2e8f0', borderRadius: 8, background: '#fff', cursor: 'pointer' }}>Cancelar</button>
          <button onClick={() => onSave(form)} disabled={isLoading} style={{ padding: '8px 18px', background: '#1d4ed8', color: '#fff', border: 'none', borderRadius: 8, cursor: isLoading ? 'not-allowed' : 'pointer', fontWeight: 600 }}>
            {isLoading ? 'Guardando...' : 'Guardar'}
          </button>
        </div>
      </div>
    </div>
  )
}

function FindingDetail({ finding, onClose }: { finding: Finding; onClose: () => void }) {
  const config = STATUS_CONFIG[finding.status]
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 1000, display: 'flex', justifyContent: 'flex-end' }}>
      <div style={{ width: 480, height: '100vh', background: '#fff', overflowY: 'auto', padding: 32 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
          <span style={{ fontWeight: 700, fontSize: 18 }}>{finding.code}</span>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer', color: '#64748b' }}>Ô</span>
           </button>
        </div>
        <span style={{ background: config.bg, color: config.color, padding: '4px 12px', borderRadius: 999, fontSize: 12, fontWeight: 600 }}>{config.label}</span>
        <h3 style={{ margin: '20px 4px', fontSize: 16, fontWeight: 600 }}>{finding.title}</h3>
        <p style={{ fontSize: 14, color: '#475569', lineHeight: 1.6 }}>{finding.description}</p>
        <div style={{ marginTop: 20, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
          {[{label:'Origen', value:finding.origin},{label:'Área',value:finding.area}].map(({ label, value }) => (
            <div key={label} style={{ background: '#f8fafc', borderRadius: 8, padding: 12 }}>
              <p style={{ fontSize: 11, color: '#94a3b8', fontWeight: 600, margin: '0 0 4px' }}>{label}</p>
              <p style={{ fontSize: 13, color: '#1e293b', fontWeight: 500, margin: 0 }}>{value}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
