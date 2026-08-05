// Catálogo único de revisiones de documentos del SGI (ISO 9001 7.5 — información documentada).
// Fuente: F-TRI-09 Listado Maestro (Drive) + fecha de implementación/última actualización del módulo en la app.
// Al modificar un formulario/módulo en la app, actualizar acá su fecha (y rev si corresponde).
import revisions from './doc-revisions.json';

export interface DocRevision {
  title: string;
  rev: string;
  date: string; // ISO yyyy-mm-dd
}

export const DOC_REVISIONS: Record<string, DocRevision> = revisions;

function fmtDate(iso: string): string {
  const [y, m, d] = iso.split('-');
  return `${d}/${m}/${y}`;
}

/** "F-TRI-03 · Rev.02 · 25/06/2026" — leyenda estándar para pantallas e impresos. */
export function docRef(code: string): string {
  const doc = DOC_REVISIONS[code];
  if (!doc) return code;
  return `${code} · Rev.${doc.rev} · ${fmtDate(doc.date)}`;
}

export function docRefs(codes: string | string[]): string {
  const list = Array.isArray(codes) ? codes : [codes];
  return list.map(docRef).join('  |  ');
}
