import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Save, Loader2, Target, Compass, Edit3, X, ScrollText,
  Award, Handshake, GraduationCap, Sparkles, HeartPulse, Leaf, Users,
  Lock, Puzzle, Cpu, Truck, Eye, CheckCircle2, type LucideIcon,
} from 'lucide-react';
import { api } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import { Header } from '@/components/layout/Header';
import { Spinner, PageContent } from '@/components/ui';

// ─── Tipos ──────────────────────────────────────────────────
type SGData = { [key: string]: string };
interface Item { title: string; body: string; }

// ─── Resolución de íconos por palabra clave del título ───────
const ICON_RULES: [RegExp, LucideIcon][] = [
  [/transparencia|claridad/i, Eye],
  [/aprendizaje/i, GraduationCap],
  [/confianza/i, Handshake],
  [/sinergia/i, Users],
  [/pasi[oó]n|log[ií]stica/i, Truck],
  [/salud/i, HeartPulse],
  [/ambiental|sustentab/i, Leaf],
  [/seguridad/i, Lock],
  [/calidad/i, Award],
  [/adaptab/i, Puzzle],
  [/innovaci|mejora/i, Sparkles],
  [/tecnolog|eficiencia/i, Cpu],
];
function iconFor(title: string): LucideIcon {
  for (const [re, icon] of ICON_RULES) if (re.test(title)) return icon;
  return CheckCircle2;
}

// ─── Parser: líneas "Título: cuerpo" → items; el resto → párrafos ──
function parseContent(content: string): { paras: string[]; items: Item[] } {
  const paras: string[] = [];
  const items: Item[] = [];
  (content || '').split('\n').map((l) => l.trim()).filter(Boolean).forEach((line) => {
    const m = line.match(/^([^:]{2,45}):\s*(.+)$/);
    if (m) items.push({ title: m[1].trim(), body: m[2].trim() });
    else paras.push(line);
  });
  return { paras, items };
}

// ─── Editor inline por sección (admin) ──────────────────────
function SectionEdit({ section, content, onDone }: { section: string; content: string; onDone: () => void }) {
  const [text, setText] = useState(content);
  const mutation = useMutation({
    mutationFn: () => api.put(`/sistema-gestion/${section}`, { content: text }),
    onSuccess: onDone,
  });
  const structured = section === 'valores' || section === 'politica_gestion';
  return (
    <div className="space-y-3">
      {structured && (
        <p className="text-[11px] text-gray-400">
          Un ítem por línea, con el formato <b className="text-gray-500">Título: descripción</b>. Las líneas sin dos puntos se muestran como párrafo.
        </p>
      )}
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        rows={structured ? 10 : 5}
        className="w-full border border-gray-300 rounded-xl px-3.5 py-2.5 text-[13px] leading-relaxed resize-y focus:outline-none focus:ring-2 focus:ring-dassa-red/30"
      />
      <div className="flex items-center gap-2 justify-end">
        <button onClick={onDone} className="px-3 py-1.5 text-xs font-semibold text-gray-500 hover:bg-gray-100 rounded-lg">Cancelar</button>
        <button
          onClick={() => mutation.mutate()}
          disabled={mutation.isPending || text === content}
          className="flex items-center gap-1.5 px-4 py-1.5 bg-dassa-red-deep text-white font-bold text-xs rounded-lg hover:bg-dassa-red disabled:opacity-50"
        >
          {mutation.isPending ? <Loader2 size={12} className="animate-spin" /> : <Save size={12} />} Guardar
        </button>
      </div>
    </div>
  );
}

// ─── Botón editar (solo admin) ──────────────────────────────
function EditToggle({ editing, onToggle }: { editing: boolean; onToggle: () => void }) {
  const { isAdmin } = useAuth();
  if (!isAdmin) return null;
  return (
    <button
      onClick={onToggle}
      className="flex items-center gap-1 px-2.5 py-1 text-[11px] font-bold text-dassa-red hover:bg-dassa-red-tint rounded-lg transition-colors shrink-0"
    >
      {editing ? <><X size={12} /> Cerrar</> : <><Edit3 size={12} /> Editar</>}
    </button>
  );
}

// ─── MAIN PAGE ───────────────────────────────────────────────
export default function SistemaGestion() {
  const qc = useQueryClient();
  const [editSection, setEditSection] = useState<string | null>(null);
  const { data, isLoading } = useQuery<SGData>({
    queryKey: ['sistema-gestion'],
    queryFn: () => api.get('/sistema-gestion'),
    refetchInterval: 60_000,
  });

  const onSaved = () => { qc.invalidateQueries({ queryKey: ['sistema-gestion'] }); setEditSection(null); };
  const toggle = (s: string) => setEditSection((cur) => (cur === s ? null : s));

  const mision = data?.mision ?? '';
  const vision = data?.vision ?? '';
  const valores = parseContent(data?.valores ?? '');
  const politica = parseContent(data?.politica_gestion ?? '');

  return (
    <>
      <Header title="Sistema de Gestión Integrado" subtitle="Misión, Visión, Valores y Política de Gestión Integrada — TRINORMA" />
      <PageContent>
        {isLoading ? (
          <div className="flex items-center justify-center h-64"><Spinner size={32} /></div>
        ) : (
          <div className="space-y-6">
            {/* ── Hero de marca ── */}
            <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-dassa-red to-dassa-red-bordo px-6 py-7 sm:px-9 sm:py-9 shadow-sm">
              <div className="absolute -right-8 -top-10 opacity-10 pointer-events-none">
                <ScrollText size={190} className="text-white" />
              </div>
              <img src="/brand/dassa-logo-white.svg" alt="DASSA" className="h-9 sm:h-10 mb-4" />
              <h2 className="text-white text-xl sm:text-2xl font-extrabold leading-tight max-w-2xl">
                Nuestro Sistema de Gestión Integrado
              </h2>
              <p className="text-white/85 text-[13px] sm:text-sm mt-2 max-w-2xl leading-relaxed">
                La base de nuestra cultura de calidad, seguridad y ambiente. Certificados bajo la TRINORMA
                ISO 9001, ISO 14001 e ISO 45001.
              </p>
              <div className="flex flex-wrap gap-2 mt-4">
                {['ISO 9001 · Calidad', 'ISO 14001 · Ambiente', 'ISO 45001 · SST'].map((n) => (
                  <span key={n} className="text-[11px] font-bold text-white bg-white/15 backdrop-blur rounded-full px-3 py-1">{n}</span>
                ))}
              </div>
            </div>

            {/* ── Misión + Visión ── */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {([
                { key: 'mision', label: 'Misión', tag: 'Nuestra razón de ser', icon: Target, ring: 'border-dassa-red/25', chip: 'bg-dassa-red-tint text-dassa-red-deep', content: mision },
                { key: 'vision', label: 'Visión', tag: 'Hacia dónde vamos', icon: Compass, ring: 'border-dassa-celeste/40', chip: 'bg-dassa-celeste-tint text-dassa-celeste-deep', content: vision },
              ] as const).map((s) => {
                const Icon = s.icon;
                const editing = editSection === s.key;
                return (
                  <div key={s.key} className={`bg-white rounded-2xl border ${s.ring} p-6 shadow-sm`}>
                    <div className="flex items-start justify-between gap-3 mb-4">
                      <div className="flex items-center gap-3">
                        <span className={`w-11 h-11 rounded-xl ${s.chip} flex items-center justify-center`}><Icon size={20} /></span>
                        <div>
                          <h3 className="text-lg font-extrabold text-gray-800 leading-none">{s.label}</h3>
                          <p className="text-[11px] font-semibold text-gray-400 mt-1">{s.tag}</p>
                        </div>
                      </div>
                      <EditToggle editing={editing} onToggle={() => toggle(s.key)} />
                    </div>
                    {editing ? (
                      <SectionEdit section={s.key} content={s.content} onDone={onSaved} />
                    ) : (
                      <p className="text-[14px] text-gray-600 leading-relaxed">
                        {s.content || <span className="text-gray-300 italic">Sin contenido.</span>}
                      </p>
                    )}
                  </div>
                );
              })}
            </div>

            {/* ── Valores ── */}
            <section className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm">
              <div className="flex items-center justify-between gap-3 mb-5">
                <div className="flex items-center gap-3">
                  <span className="w-11 h-11 rounded-xl bg-dassa-red-tint text-dassa-red-deep flex items-center justify-center"><Sparkles size={20} /></span>
                  <div>
                    <h3 className="text-lg font-extrabold text-gray-800 leading-none">Valores</h3>
                    <p className="text-[11px] font-semibold text-gray-400 mt-1">Los principios que nos guían</p>
                  </div>
                </div>
                <EditToggle editing={editSection === 'valores'} onToggle={() => toggle('valores')} />
              </div>
              {editSection === 'valores' ? (
                <SectionEdit section="valores" content={data?.valores ?? ''} onDone={onSaved} />
              ) : (
                <>
                  {valores.paras.map((p, i) => <p key={i} className="text-[13.5px] text-gray-600 leading-relaxed mb-4">{p}</p>)}
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {valores.items.map((v) => {
                      const Icon = iconFor(v.title);
                      return (
                        <div key={v.title} className="rounded-xl border border-gray-100 bg-gray-50/70 p-4 hover:border-dassa-red/30 hover:bg-white transition-colors">
                          <span className="w-9 h-9 rounded-lg bg-dassa-red text-white flex items-center justify-center mb-3"><Icon size={17} /></span>
                          <h4 className="font-bold text-[13.5px] text-gray-800 mb-1">{v.title}</h4>
                          <p className="text-[12px] text-gray-500 leading-relaxed">{v.body}</p>
                        </div>
                      );
                    })}
                  </div>
                </>
              )}
            </section>

            {/* ── Política de Gestión Integrada ── */}
            <section className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm">
              <div className="flex items-center justify-between gap-3 mb-5">
                <div className="flex items-center gap-3">
                  <span className="w-11 h-11 rounded-xl bg-dassa-navy/10 text-dassa-navy flex items-center justify-center"><ScrollText size={20} /></span>
                  <div>
                    <h3 className="text-lg font-extrabold text-gray-800 leading-none">Política de Gestión Integrada</h3>
                    <p className="text-[11px] font-semibold text-gray-400 mt-1">Nuestro compromiso TRINORMA</p>
                  </div>
                </div>
                <EditToggle editing={editSection === 'politica_gestion'} onToggle={() => toggle('politica_gestion')} />
              </div>
              {editSection === 'politica_gestion' ? (
                <SectionEdit section="politica_gestion" content={data?.politica_gestion ?? ''} onDone={onSaved} />
              ) : (
                <>
                  {politica.paras[0] && (
                    <p className="text-[14px] text-gray-600 leading-relaxed mb-5 pl-4 border-l-4 border-dassa-red">{politica.paras[0]}</p>
                  )}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {politica.items.map((p) => {
                      const Icon = iconFor(p.title);
                      return (
                        <div key={p.title} className="flex gap-3 rounded-xl border border-gray-100 bg-gray-50/70 p-4">
                          <span className="w-9 h-9 shrink-0 rounded-lg bg-dassa-navy text-white flex items-center justify-center"><Icon size={17} /></span>
                          <div>
                            <h4 className="font-bold text-[13.5px] text-gray-800 mb-0.5">{p.title}</h4>
                            <p className="text-[12px] text-gray-500 leading-relaxed">{p.body}</p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  {politica.paras.slice(1).map((p, i) => (
                    <p key={i} className="text-[12.5px] text-gray-500 italic leading-relaxed mt-5 text-center">{p}</p>
                  ))}
                </>
              )}
            </section>
          </div>
        )}
      </PageContent>
    </>
  );
}
