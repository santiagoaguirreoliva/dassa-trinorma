import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { FileText, Loader2, X, Sparkles, Mail } from 'lucide-react';
import { api } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';

const TYPE_LABEL: Record<string, string> = {
  nc_real: 'NC Reales', nc_potencial: 'NC Potenciales',
  mejora: 'Oportunidades de Mejora', desvio_cliente: 'Desvíos de Cliente',
};

const EMAIL_BADGE: Record<string, { label: string; cls: string }> = {
  enviado:           { label: 'Enviado',        cls: 'bg-emerald-100 text-emerald-700' },
  no_enviado:        { label: 'Sin enviar',     cls: 'bg-gray-100 text-gray-500' },
  omitido_sin_smtp:  { label: 'SMTP off',       cls: 'bg-amber-100 text-amber-700' },
  error:             { label: 'Error de envío', cls: 'bg-red-100 text-red-600' },
};

function fmtDateTime(d: string) {
  return new Date(d).toLocaleString('es-AR', { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' });
}

export default function FindingsReports() {
  const { isAdmin } = useAuth();
  const qc = useQueryClient();
  const [openId, setOpenId] = useState<string | null>(null);

  const { data: reports = [], isLoading } = useQuery<any[]>({
    queryKey: ['findings-reports'],
    queryFn: () => api.get('/findings/reports'),
  });

  const generate = useMutation({
    mutationFn: () => api.post('/findings/report/monthly?dry_run=1', {}),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['findings-reports'] }),
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h3 className="text-sm font-extrabold text-gray-900">Informes mensuales de NC y desvíos</h3>
          <p className="text-xs text-gray-500">Generados por Triny · el día 1 de cada mes se envían a calidad por correo</p>
        </div>
        {isAdmin && (
          <button
            onClick={() => generate.mutate()}
            disabled={generate.isPending}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-violet-600 text-white rounded-lg text-xs font-bold hover:bg-violet-700 disabled:opacity-50 flex-shrink-0"
          >
            {generate.isPending ? <Loader2 size={13} className="animate-spin" /> : <Sparkles size={13} />}
            Generar informe del mes
          </button>
        )}
      </div>

      {generate.isError && (
        <p className="text-xs text-red-500">No se pudo generar el informe. Reintentá en unos segundos.</p>
      )}

      {isLoading ? (
        <div className="flex items-center justify-center h-40"><Loader2 size={28} className="animate-spin text-gray-300" /></div>
      ) : reports.length === 0 ? (
        <div className="text-center py-12 text-gray-400 bg-white rounded-xl border border-gray-200">
          <FileText size={28} className="mx-auto mb-2 opacity-30" />
          <p className="font-medium">Todavía no hay informes</p>
          <p className="text-sm mt-1">{isAdmin ? 'Generá el primero con el botón de arriba.' : 'El informe se genera automáticamente el día 1.'}</p>
        </div>
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {reports.map(r => {
            const res = r.resumen || {};
            const badge = EMAIL_BADGE[r.email_status] || EMAIL_BADGE.no_enviado;
            return (
              <button
                key={r.id}
                onClick={() => setOpenId(r.id)}
                className="text-left bg-white rounded-xl border border-gray-200 p-4 hover:shadow-md transition-all"
              >
                <div className="flex items-center justify-between gap-2 mb-2">
                  <span className="text-sm font-extrabold text-gray-900 capitalize flex items-center gap-1.5">
                    <FileText size={14} className="text-violet-500" /> {r.period_label}
                  </span>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${badge.cls}`}>{badge.label}</span>
                </div>
                <div className="grid grid-cols-4 gap-2 mb-2">
                  <Mini label="Creadas" value={res.creadas} />
                  <Mini label="Cerradas" value={res.cerradas} />
                  <Mini label="Abiertas" value={res.abiertas_actual} />
                  <Mini label="Vencidas" value={res.vencidas_actual} tone={res.vencidas_actual > 0 ? 'red' : ''} />
                </div>
                <p className="text-[10px] text-gray-400">Generado {fmtDateTime(r.generated_at)}</p>
              </button>
            );
          })}
        </div>
      )}

      {openId && <ReportModal id={openId} onClose={() => setOpenId(null)} />}
    </div>
  );
}

function Mini({ label, value, tone }: { label: string; value: number; tone?: string }) {
  return (
    <div>
      <p className={`text-lg font-extrabold ${tone === 'red' ? 'text-red-600' : 'text-gray-800'}`}>{value ?? 0}</p>
      <p className="text-[9px] font-bold text-gray-400 uppercase tracking-wider">{label}</p>
    </div>
  );
}

function ReportModal({ id, onClose }: { id: string; onClose: () => void }) {
  const { data: report, isLoading } = useQuery<any>({
    queryKey: ['findings-report', id],
    queryFn: () => api.get(`/findings/reports/${id}`),
  });

  const data = report?.data;
  const narrative = report?.narrative;

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-start justify-center p-4 overflow-y-auto" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl my-8" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 sticky top-0 bg-white rounded-t-2xl">
          <h3 className="text-[15px] font-extrabold text-gray-900 capitalize">
            Informe de NC · {report?.period_label || '…'}
          </h3>
          <button onClick={onClose} aria-label="Cerrar"><X size={18} className="text-gray-400" /></button>
        </div>

        {isLoading || !data ? (
          <div className="flex items-center justify-center h-48"><Loader2 size={28} className="animate-spin text-gray-300" /></div>
        ) : (
          <div className="p-6 space-y-5">
            {/* KPIs */}
            <div className="grid grid-cols-4 gap-3">
              <KpiBox label="Creadas" value={data.resumen?.creadas} tone="blue" />
              <KpiBox label="Cerradas" value={data.resumen?.cerradas} tone="emerald" />
              <KpiBox label="Abiertas hoy" value={data.resumen?.abiertas_actual} tone="amber" />
              <KpiBox label="Vencidas hoy" value={data.resumen?.vencidas_actual} tone={data.resumen?.vencidas_actual > 0 ? 'red' : 'gray'} />
            </div>
            <p className="text-xs text-gray-500">
              Tiempo promedio de cierre: <strong>{data.diasPromCierre != null ? `${data.diasPromCierre} días` : 'sin datos'}</strong>
            </p>

            {/* Distribución */}
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Por tipo</p>
                <div className="space-y-1">
                  {(data.porTipo ?? []).length === 0 && <p className="text-xs text-gray-400">Sin NC nuevas</p>}
                  {(data.porTipo ?? []).map((t: any) => (
                    <div key={t.finding_type} className="flex justify-between text-sm border-b border-gray-100 py-1">
                      <span className="text-gray-700">{TYPE_LABEL[t.finding_type] || t.finding_type}</span>
                      <span className="font-bold text-gray-900">{t.n}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div>
                <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Por sector</p>
                <div className="space-y-1">
                  {(data.porSector ?? []).length === 0 && <p className="text-xs text-gray-400">—</p>}
                  {(data.porSector ?? []).map((s: any) => (
                    <div key={s.area} className="flex justify-between text-sm border-b border-gray-100 py-1">
                      <span className="text-gray-700 truncate">{s.area}</span>
                      <span className="font-bold text-gray-900">{s.n}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Análisis de Triny */}
            {narrative && (
              <div className="bg-violet-50 rounded-xl p-4 border border-violet-200 space-y-2">
                <p className="text-xs font-bold text-violet-700 uppercase tracking-wider flex items-center gap-1.5">
                  <Sparkles size={13} /> Análisis de Triny
                </p>
                {narrative.tendencia && <p className="text-sm text-slate-700">{narrative.tendencia}</p>}
                {(narrative.focos ?? []).length > 0 && (
                  <div>
                    <p className="text-xs font-bold text-violet-600 mt-2">Focos de atención</p>
                    <ul className="list-disc pl-5 text-sm text-slate-700">
                      {narrative.focos.map((f: string, i: number) => <li key={i}>{f}</li>)}
                    </ul>
                  </div>
                )}
                {(narrative.recomendaciones ?? []).length > 0 && (
                  <div>
                    <p className="text-xs font-bold text-violet-600 mt-2">Recomendaciones</p>
                    <ul className="list-disc pl-5 text-sm text-slate-700">
                      {narrative.recomendaciones.map((r: string, i: number) => <li key={i}>{r}</li>)}
                    </ul>
                  </div>
                )}
              </div>
            )}

            <p className="text-[11px] text-gray-400 flex items-center gap-1.5 pt-1">
              <Mail size={11} />
              {report.recipients ? `Destinatarios: ${report.recipients}` : 'Sin destinatarios registrados'}
              {report.generated_by_name ? ` · generado por ${report.generated_by_name}` : ''}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

function KpiBox({ label, value, tone }: { label: string; value: number; tone: string }) {
  const tones: Record<string, string> = {
    red: 'text-red-600', amber: 'text-amber-600', emerald: 'text-emerald-600',
    blue: 'text-blue-700', gray: 'text-gray-500',
  };
  return (
    <div className="bg-gray-50 rounded-xl px-3 py-2.5 text-center">
      <p className={`text-xl font-extrabold ${tones[tone] || 'text-gray-700'}`}>{value ?? 0}</p>
      <p className="text-[9px] font-bold text-gray-400 uppercase tracking-wider">{label}</p>
    </div>
  );
}
