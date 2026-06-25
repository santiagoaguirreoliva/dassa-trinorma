import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';

// Vista PÚBLICA (sin login) del árbol de procedimientos del SGI.
// Solo lectura, solo procedimientos aprobados. Fuente: GET /api/public/procedimientos.

interface Doc {
  id: string; code: string | null; title: string; content_md: string | null;
  proceso: string | null; norma: string | null; parent_document_id: string | null;
  needs_source: boolean; keywords: string[] | null;
}

const CATEGORIAS: { key: string; procesos: string[] }[] = [
  { key: 'Estratégicos / Dirección', procesos: ['CONTEXTO', 'RIESGOS', 'GESTIÓN GERENCIAL', 'ANÁLISIS Y EVALUACIÓN DE LA GESTIÓN'] },
  { key: 'Comercial', procesos: ['COMERCIAL', 'RETROALIMENTACIÓN CLIENTES'] },
  { key: 'Operación', procesos: ['OPERACIÓN'] },
  { key: 'Soporte', procesos: ['COMPRAS', 'RECURSOS HUMANOS', 'MANTENIMIENTO', 'GESTIÓN AMBIENTAL', 'EVALUACIÓN RIESGOS Y PELIGROS', 'PARTICIPACIÓN Y CONSULTA', 'INCIDENTES Y ACCIDENTES', 'EMERGENCIAS'] },
];

const NORMA_COLOR: Record<string, string> = {
  'TRINORMA': '#0F1A4A', 'ISO 9001': '#9A1825', 'ISO 14001': '#1E7A4D', 'ISO 45001': '#B26A00',
};

function renderMarkdown(md: string) {
  const lines = md.split('\n');
  const out: React.ReactNode[] = [];
  let list: string[] = [];
  const inline = (t: string) => t.split(/(\*\*[^*]+\*\*)/g).map((pp, i) =>
    pp.startsWith('**') && pp.endsWith('**') ? <strong key={i}>{pp.slice(2, -2)}</strong> : <span key={i}>{pp}</span>);
  const flush = (k: number) => {
    if (list.length) { const items = list.slice(); out.push(<ul key={`u${k}`} style={{ margin: '8px 0', paddingLeft: 20 }}>{items.map((li, i) => <li key={i} style={{ marginBottom: 4 }}>{inline(li)}</li>)}</ul>); list = []; }
  };
  lines.forEach((raw, idx) => {
    const l = raw.trim();
    if (/^##\s+/.test(l)) { flush(idx); out.push(<h3 key={idx} style={{ fontSize: 15, fontWeight: 800, color: '#0F1A4A', margin: '20px 0 6px', textTransform: 'uppercase', letterSpacing: '.02em' }}>{l.replace(/^##\s+/, '')}</h3>); }
    else if (/^#\s+/.test(l)) { flush(idx); out.push(<h2 key={idx} style={{ fontSize: 17, fontWeight: 800, color: '#0F1A4A', margin: '20px 0 8px' }}>{l.replace(/^#\s+/, '')}</h2>); }
    else if (/^[-*]\s+/.test(l)) { list.push(l.replace(/^[-*]\s+/, '')); }
    else if (/^\d+\.\s+/.test(l)) { flush(idx); out.push(<div key={idx} style={{ display: 'flex', gap: 8, margin: '4px 0' }}><span style={{ fontWeight: 700, color: '#2E96A4' }}>{(l.match(/^\d+/) || ['•'])[0]}.</span><span>{inline(l.replace(/^\d+\.\s+/, ''))}</span></div>); }
    else if (l === '') { flush(idx); }
    else { flush(idx); out.push(<p key={idx} style={{ margin: '6px 0', lineHeight: 1.6 }}>{inline(l)}</p>); }
  });
  flush(9999);
  return out;
}

export default function ProcedimientosPublico() {
  const [params, setParams] = useSearchParams();
  const [docs, setDocs] = useState<Doc[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState('');
  const [q, setQ] = useState('');
  const [selId, setSelId] = useState<string | null>(null);
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});

  useEffect(() => {
    document.title = 'Procedimientos del SGI · DASSA';
    const m = document.createElement('meta'); m.name = 'robots'; m.content = 'noindex,nofollow';
    document.head.appendChild(m);
    fetch('/api/public/procedimientos').then(r => r.json())
      .then((d: Doc[]) => { setDocs(Array.isArray(d) ? d : []); setLoading(false); })
      .catch(() => { setErr('No se pudieron cargar los procedimientos.'); setLoading(false); });
    return () => { document.head.removeChild(m); };
  }, []);

  useEffect(() => {
    const code = params.get('code');
    if (code && docs.length) { const d = docs.find(x => x.code === code); if (d) setSelId(d.id); }
  }, [params, docs]);

  const sel = docs.find(d => d.id === selId) || null;

  const tree = useMemo(() => {
    const t = q.trim().toLowerCase();
    const matches = (d: Doc) => !t || [d.code, d.title, d.proceso, d.norma, ...(d.keywords || [])].filter(Boolean).some(s => (s as string).toLowerCase().includes(t));
    const childrenOf = (pid: string) => docs.filter(d => d.parent_document_id === pid);
    const visible = new Set<string>();
    docs.forEach(d => { if (matches(d)) { visible.add(d.id); if (d.parent_document_id) visible.add(d.parent_document_id); } });
    const cats = CATEGORIAS.map(cat => {
      const secciones = cat.procesos.map(proc => ({ proceso: proc, tops: docs.filter(d => d.proceso === proc && !d.parent_document_id && (visible.has(d.id) || childrenOf(d.id).some(c => visible.has(c.id)))) })).filter(s => s.tops.length);
      return { key: cat.key, secciones, total: secciones.reduce((n, s) => n + s.tops.length, 0) };
    }).filter(c => c.total);
    const known = new Set(CATEGORIAS.flatMap(c => c.procesos));
    const otros = Array.from(new Set(docs.map(d => d.proceso).filter(pr => pr && !known.has(pr)) as string[]))
      .map(proc => ({ proceso: proc, tops: docs.filter(d => d.proceso === proc && !d.parent_document_id && visible.has(d.id)) })).filter(s => s.tops.length);
    if (otros.length) cats.push({ key: 'Otros', secciones: otros, total: otros.reduce((n, s) => n + s.tops.length, 0) });
    return { cats, childrenOf, visible };
  }, [docs, q]);

  const select = (d: Doc) => { setSelId(d.id); if (d.code) setParams({ code: d.code }, { replace: true }); };

  const Row = ({ d, child }: { d: Doc; child?: boolean }) => (
    <button onClick={() => select(d)} style={{
      width: '100%', textAlign: 'left', display: 'flex', alignItems: 'center', gap: 6, padding: '7px 8px',
      marginLeft: child ? 16 : 0, borderRadius: 6, border: 'none', cursor: 'pointer',
      background: selId === d.id ? '#E2F4F7' : 'transparent', color: selId === d.id ? '#2E96A4' : '#3F3F3F',
    }}>
      <span style={{ color: '#B2B2B2', flexShrink: 0 }}>{child ? '└' : '▪'}</span>
      <span style={{ fontSize: 12.5, fontWeight: 500, lineHeight: 1.25 }}>{d.title}</span>
      {d.code && <span style={{ marginLeft: 'auto', fontSize: 9, fontFamily: 'monospace', color: '#B2B2B2', flexShrink: 0 }}>{d.code}</span>}
    </button>
  );

  return (
    <div style={{ fontFamily: 'Montserrat, system-ui, sans-serif', color: '#262626', background: '#F2F2F2', minHeight: '100vh' }}>
      <header style={{ background: '#BF1E2E', color: '#fff', padding: '20px 24px' }}>
        <div style={{ maxWidth: 1120, margin: '0 auto' }}>
          <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '.08em', textTransform: 'uppercase', opacity: .9 }}>Sistema de Gestión Integrado · TRINORMA · ISO 9001 · 14001 · 45001</div>
          <div style={{ fontSize: 24, fontWeight: 800, marginTop: 4 }}>Procedimientos del SGI · DASSA</div>
          <div style={{ fontSize: 13, opacity: .92, marginTop: 4, fontFamily: 'Open Sans, sans-serif' }}>Consulta pública de lectura · árbol por proceso del Mapa F-TRI-03</div>
        </div>
      </header>

      <main style={{ maxWidth: 1120, margin: '0 auto', padding: 24 }}>
        <input value={q} onChange={e => setQ(e.target.value)} placeholder="Buscar por código, título, sección, norma o palabra clave…"
          style={{ width: '100%', maxWidth: 520, padding: '11px 14px', borderRadius: 8, border: '1px solid #D5D5D5', fontSize: 14, marginBottom: 16, outline: 'none' }} />

        {loading ? <p style={{ color: '#8A8A8A' }}>Cargando procedimientos…</p>
          : err ? <p style={{ color: '#BF1E2E' }}>{err}</p>
          : (
            <div style={{ display: 'grid', gridTemplateColumns: 'minmax(280px, 360px) 1fr', gap: 16, alignItems: 'start' }}>
              <div style={{ background: '#fff', border: '1px solid #E7E7E7', borderRadius: 14, padding: 12, maxHeight: '74vh', overflowY: 'auto' }}>
                {tree.cats.length === 0 && <p style={{ color: '#8A8A8A', fontSize: 13, padding: 8 }}>Sin resultados.</p>}
                {tree.cats.map(cat => {
                  const ck = `c-${cat.key}`; const open = !collapsed[ck];
                  return (
                    <div key={cat.key} style={{ marginBottom: 6 }}>
                      <button onClick={() => setCollapsed(s => ({ ...s, [ck]: open }))} style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 6, padding: '6px 8px', border: 'none', background: 'transparent', cursor: 'pointer', fontSize: 11, fontWeight: 800, color: '#0F1A4A', textTransform: 'uppercase', letterSpacing: '.03em' }}>
                        <span>{open ? '▾' : '▸'}</span>{cat.key}<span style={{ marginLeft: 'auto', color: '#B2B2B2' }}>{cat.total}</span>
                      </button>
                      {open && cat.secciones.map(s => (
                        <div key={s.proceso} style={{ marginLeft: 8, marginBottom: 4 }}>
                          <div style={{ padding: '4px 8px', fontSize: 10, fontWeight: 700, color: '#B2B2B2', textTransform: 'uppercase' }}>{s.proceso}</div>
                          {s.tops.map(top => (
                            <div key={top.id}>
                              <Row d={top} />
                              {tree.childrenOf(top.id).filter(c => tree.visible.has(c.id)).map(ch => <Row key={ch.id} d={ch} child />)}
                            </div>
                          ))}
                        </div>
                      ))}
                    </div>
                  );
                })}
              </div>

              <div style={{ background: '#fff', border: '1px solid #E7E7E7', borderRadius: 14, padding: 24, minHeight: '60vh' }}>
                {!sel ? <p style={{ color: '#8A8A8A' }}>Elegí un procedimiento del árbol para leerlo.</p> : (
                  <div>
                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center', marginBottom: 6 }}>
                      {sel.code && <span style={{ fontSize: 11, fontFamily: 'monospace', fontWeight: 700, background: '#F2F2F2', color: '#5E5E5E', padding: '2px 8px', borderRadius: 5 }}>{sel.code}</span>}
                      {sel.norma && <span style={{ fontSize: 10, fontWeight: 700, color: '#fff', background: NORMA_COLOR[sel.norma] || '#5E5E5E', padding: '2px 8px', borderRadius: 5 }}>{sel.norma}</span>}
                      {sel.needs_source && <span style={{ fontSize: 10, fontWeight: 700, color: '#B26A00', background: '#FBF0DD', padding: '2px 8px', borderRadius: 5 }}>sin documento fuente</span>}
                    </div>
                    <h1 style={{ fontSize: 22, fontWeight: 800, color: '#0F1A4A', margin: '4px 0 2px', lineHeight: 1.15 }}>{sel.title}</h1>
                    {sel.proceso && <div style={{ fontSize: 12, color: '#8A8A8A', marginBottom: 12 }}>Proceso: {sel.proceso}</div>}
                    <div style={{ borderTop: '1px solid #F2F2F2', paddingTop: 12, fontSize: 13.5, color: '#3F3F3F' }}>
                      {sel.content_md ? renderMarkdown(sel.content_md) : <p style={{ color: '#B2B2B2' }}>Este procedimiento todavía no tiene texto cargado.</p>}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        <footer style={{ marginTop: 28, paddingTop: 16, borderTop: '1px solid #E7E7E7', fontSize: 12, color: '#8A8A8A', fontFamily: 'Open Sans, sans-serif' }}>
          DASSA — Depósito Avellaneda Sur S.A. · Documentación del Sistema de Gestión Integrado (lectura). Versión vigente sujeta a la app Trinorma.
        </footer>
      </main>
    </div>
  );
}
