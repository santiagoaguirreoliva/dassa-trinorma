import { useMemo, useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Search, ChevronRight, ChevronDown, FileText, Download, CornerDownRight } from 'lucide-react';
import { api } from '@/lib/api';
import { Header } from '@/components/layout/Header';
import { Spinner, PageContent, EmptyState } from '@/components/ui';

interface Doc {
  id: string; code: string | null; title: string; content_md: string | null;
  proceso: string | null; norma: string | null; doc_type: string; status: string;
  parent_document_id: string | null; keywords: string[] | null;
  needs_source: boolean; file_url: string | null; file_name: string | null;
  responsible_name?: string | null; updated_at?: string;
}

// Macro-categorías del mapa de procesos (orden de arriba hacia abajo)
const CATEGORIAS: { key: string; procesos: string[] }[] = [
  { key: 'Estratégicos / Dirección', procesos: ['CONTEXTO', 'RIESGOS', 'GESTIÓN GERENCIAL', 'ANÁLISIS Y EVALUACIÓN DE LA GESTIÓN'] },
  { key: 'Comercial', procesos: ['COMERCIAL', 'RETROALIMENTACIÓN CLIENTES'] },
  { key: 'Operación', procesos: ['OPERACIÓN'] },
  { key: 'Soporte', procesos: ['COMPRAS', 'RECURSOS HUMANOS', 'MANTENIMIENTO', 'GESTIÓN AMBIENTAL', 'EVALUACIÓN RIESGOS Y PELIGROS', 'PARTICIPACIÓN Y CONSULTA', 'INCIDENTES Y ACCIDENTES', 'EMERGENCIAS'] },
];

const NORMA_COLOR: Record<string, string> = {
  'TRINORMA': 'bg-dassa-navy/10 text-dassa-navy',
  'ISO 9001': 'bg-dassa-red-tint text-dassa-red-deep',
  'ISO 14001': 'bg-emerald-100 text-emerald-700',
  'ISO 45001': 'bg-amber-100 text-amber-700',
};

// Renderer markdown liviano (content_md usa "## " para títulos)
function renderMarkdown(md: string) {
  const lines = md.split('\n');
  const out: React.ReactNode[] = [];
  let list: string[] = [];
  const inline = (t: string) => {
    const parts = t.split(/(\*\*[^*]+\*\*)/g);
    return parts.map((pp, i) => pp.startsWith('**') && pp.endsWith('**')
      ? <strong key={i} className="font-bold text-gray-900">{pp.slice(2, -2)}</strong>
      : <span key={i}>{pp}</span>);
  };
  const flush = (k: number) => {
    if (list.length) {
      const items = list.slice();
      out.push(<ul key={`ul-${k}`} className="list-disc pl-5 my-2 space-y-1 text-[13.5px] text-gray-700">{items.map((li, i) => <li key={i}>{inline(li)}</li>)}</ul>);
      list = [];
    }
  };
  lines.forEach((raw, idx) => {
    const l = raw.trim();
    if (/^##\s+/.test(l)) { flush(idx); out.push(<h3 key={idx} className="text-[14px] font-extrabold text-dassa-navy mt-5 mb-1.5 uppercase tracking-wide">{l.replace(/^##\s+/, '')}</h3>); }
    else if (/^#\s+/.test(l)) { flush(idx); out.push(<h2 key={idx} className="text-[16px] font-extrabold text-dassa-navy mt-5 mb-2">{l.replace(/^#\s+/, '')}</h2>); }
    else if (/^[-*]\s+/.test(l)) { list.push(l.replace(/^[-*]\s+/, '')); }
    else if (/^\d+\.\s+/.test(l)) { flush(idx); out.push(<div key={idx} className="flex gap-2 text-[13.5px] text-gray-700 my-1"><span className="font-bold text-dassa-celeste-deep">{(l.match(/^\d+/) || ['•'])[0]}.</span><span>{inline(l.replace(/^\d+\.\s+/, ''))}</span></div>); }
    else if (l === '') { flush(idx); }
    else { flush(idx); out.push(<p key={idx} className="text-[13.5px] text-gray-700 leading-relaxed my-1.5">{inline(l)}</p>); }
  });
  flush(9999);
  return out;
}

export default function Procedimientos() {
  const [params, setParams] = useSearchParams();
  const [q, setQ] = useState('');
  const [selId, setSelId] = useState<string | null>(null);
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});

  const { data: docs = [], isLoading } = useQuery<Doc[]>({
    queryKey: ['procedimientos-sgi'],
    queryFn: () => api.get('/documents?doc_type=procedimiento'),
  });

  useEffect(() => {
    const code = params.get('code');
    if (code && docs.length) {
      const d = docs.find(x => x.code === code);
      if (d) setSelId(d.id);
    }
  }, [params, docs]);

  const sel = docs.find(d => d.id === selId) || null;

  const tree = useMemo(() => {
    const t = q.trim().toLowerCase();
    const matches = (d: Doc) => !t || [d.code, d.title, d.proceso, d.norma, ...(d.keywords || [])]
      .filter(Boolean).some(s => (s as string).toLowerCase().includes(t));
    const childrenOf = (pid: string) => docs.filter(d => d.parent_document_id === pid);
    const visible = new Set<string>();
    docs.forEach(d => { if (matches(d)) { visible.add(d.id); if (d.parent_document_id) visible.add(d.parent_document_id); } });

    const cats = CATEGORIAS.map(cat => {
      const secciones = cat.procesos.map(proc => ({
        proceso: proc,
        tops: docs.filter(d => d.proceso === proc && !d.parent_document_id && (visible.has(d.id) || childrenOf(d.id).some(c => visible.has(c.id)))),
      })).filter(s => s.tops.length);
      return { key: cat.key, secciones, total: secciones.reduce((n, s) => n + s.tops.length, 0) };
    }).filter(c => c.total);

    const known = new Set(CATEGORIAS.flatMap(c => c.procesos));
    const otrosProc = Array.from(new Set(docs.map(d => d.proceso).filter(pr => pr && !known.has(pr)) as string[]));
    const otrosSec = otrosProc.map(proc => ({ proceso: proc, tops: docs.filter(d => d.proceso === proc && !d.parent_document_id && visible.has(d.id)) })).filter(s => s.tops.length);
    if (otrosSec.length) cats.push({ key: 'Otros', secciones: otrosSec, total: otrosSec.reduce((n, s) => n + s.tops.length, 0) });

    return { cats, childrenOf, visible };
  }, [docs, q]);

  const total = docs.length;
  const reales = docs.filter(d => !d.needs_source).length;

  function select(d: Doc) { setSelId(d.id); if (d.code) setParams({ code: d.code }, { replace: true }); }

  if (isLoading) return <PageContent><Spinner /></PageContent>;

  return (
    <PageContent>
      <Header title="📘 Procedimientos del SGI" subtitle={`${total} procedimientos · ${reales} con texto · árbol por proceso del mapa F-TRI-03`} />

      <div className="mb-4 relative max-w-xl">
        <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <input
          value={q} onChange={e => setQ(e.target.value)}
          placeholder="Buscar por código, título, sección, norma o palabra clave…"
          className="w-full pl-9 pr-3 py-2.5 rounded-lg border border-gray-300 text-sm focus:border-dassa-celeste focus:ring-1 focus:ring-dassa-celeste outline-none"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[380px_1fr] gap-4 items-start">
        <div className="bg-white rounded-dassa shadow-dassa-card border border-gray-200 p-3 max-h-[72vh] overflow-y-auto">
          {tree.cats.length === 0 && <EmptyState icon="🔍" title="Sin resultados" sub="Probá otra palabra clave" />}
          {tree.cats.map(cat => {
            const ck = `cat-${cat.key}`;
            const open = !collapsed[ck];
            return (
              <div key={cat.key} className="mb-1.5">
                <button onClick={() => setCollapsed(s => ({ ...s, [ck]: open }))}
                  className="w-full flex items-center gap-1.5 px-2 py-1.5 text-[11px] font-extrabold uppercase tracking-wide text-dassa-navy hover:bg-gray-50 rounded">
                  {open ? <ChevronDown size={13} /> : <ChevronRight size={13} />}{cat.key}
                  <span className="ml-auto text-[10px] font-bold text-gray-400">{cat.total}</span>
                </button>
                {open && cat.secciones.map(s => (
                  <div key={s.proceso} className="ml-2 mb-1">
                    <div className="px-2 py-1 text-[10px] font-bold text-gray-400 uppercase tracking-wide">{s.proceso}</div>
                    {s.tops.map(top => (
                      <div key={top.id}>
                        <ProcRow d={top} sel={selId} onSel={select} />
                        {tree.childrenOf(top.id).filter(c => tree.visible.has(c.id)).map(child => (
                          <ProcRow key={child.id} d={child} sel={selId} onSel={select} child />
                        ))}
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            );
          })}
        </div>

        <div className="bg-white rounded-dassa shadow-dassa-card border border-gray-200 p-6 min-h-[60vh]">
          {!sel ? (
            <EmptyState icon="📘" title="Elegí un procedimiento" sub="Seleccioná un procedimiento del árbol para verlo acá, sin descargar nada" />
          ) : (
            <div>
              <div className="flex items-start justify-between gap-3 flex-wrap mb-3">
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    {sel.code && <span className="text-[11px] font-mono font-bold bg-gray-100 text-gray-600 px-2 py-0.5 rounded">{sel.code}</span>}
                    {sel.norma && <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${NORMA_COLOR[sel.norma] || 'bg-gray-100 text-gray-600'}`}>{sel.norma}</span>}
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-gray-100 text-gray-500 capitalize">{sel.status}</span>
                    {sel.needs_source && <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-amber-100 text-amber-700">sin documento fuente</span>}
                  </div>
                  <h2 className="text-[22px] font-extrabold text-dassa-navy mt-2 leading-tight">{sel.title}</h2>
                  {sel.proceso && <div className="text-[12px] text-gray-500 mt-1">Proceso: {sel.proceso}</div>}
                </div>
                {sel.file_url && (
                  <a href={sel.file_url} target="_blank" rel="noopener" className="inline-flex items-center gap-1.5 text-[12px] font-bold text-dassa-celeste-deep border border-dassa-celeste/40 rounded-full px-3 py-1.5 hover:bg-dassa-celeste-tint">
                    <Download size={13} /> Documento fuente
                  </a>
                )}
              </div>
              <div className="border-t border-gray-100 pt-4">
                {sel.content_md
                  ? renderMarkdown(sel.content_md)
                  : <div className="text-sm text-gray-400 flex items-center gap-2"><FileText size={16} /> Este procedimiento todavía no tiene texto cargado{sel.file_url ? ' (descargá el documento fuente arriba)' : ''}.</div>}
              </div>
            </div>
          )}
        </div>
      </div>
    </PageContent>
  );
}

function ProcRow({ d, sel, onSel, child }: { d: Doc; sel: string | null; onSel: (d: Doc) => void; child?: boolean }) {
  const active = sel === d.id;
  return (
    <button onClick={() => onSel(d)}
      className={`w-full flex items-center gap-1.5 px-2 py-1.5 rounded text-left transition ${child ? 'ml-4' : ''} ${active ? 'bg-dassa-celeste-tint text-dassa-celeste-deep' : 'hover:bg-gray-50 text-gray-700'}`}>
      {child ? <CornerDownRight size={12} className="text-gray-300 shrink-0" /> : <FileText size={12} className="text-gray-400 shrink-0" />}
      <span className="text-[12px] font-medium leading-tight">{d.title}</span>
      {d.code && <span className="ml-auto text-[9px] font-mono text-gray-400 shrink-0">{d.code}</span>}
    </button>
  );
}
