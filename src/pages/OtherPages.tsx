// ─── RISKS ───────────────────────────────────────────────────────────────────
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
      return (data || []).map((r: any) => ({ ...r, npr: r.probability * r.severity * r.detection, responsibleName: r.profiles?.full_name || '—' }))
    },
  })

  if (isLoading) return <div style={{ padding: 48, textAlign: 'center', color: DS.textMuted }}>Cargando...</div>

  return (
    <div style={{ padding: 28 }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 20 }}>
        {[
          { label: 'Significativos (NPR>16)', value: risks.filter(r => r.npr > 16).length, color: DS.danger, bg: DS.dangerLight },
          { label: 'Moderados (NPR 9-16)',    value: risks.filter(r => r.npr > 8 && r.npr <= 16).length, color: DS.warning, bg: DS.warningLight },
          { label: 'Aceptables (NPR≤8)',      value: risks.filter(r => r.npr <= 8).length, color: DS.success, bg: DS.successLight },
        ].map(s => (
          <div key={s.label} style={{ background: s.bg, borderRadius: 10, padding: '16px 20px', border: `1px solid ${s.color}30` }}>
            <div style={{ fontSize: 28, fontWeight: 800, color: s.color }}>{s.value}</div>
            <div style={{ fontSize: 12, color: s.color, fontWeight: 600, marginTop: 4 }}>{s.label}</div>
          </div>
        ))}
      </div>.�ן�w�