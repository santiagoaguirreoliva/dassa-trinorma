// Búsqueda multicampo por palabras clave para las tablas de la app.
// Normaliza tildes y mayúsculas; cada palabra del query debe aparecer en
// alguno de los campos (AND entre palabras, OR entre campos).

const norm = (s: unknown) =>
  String(s ?? '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');

export function matchesQuery(query: string, ...fields: unknown[]): boolean {
  const words = norm(query).split(/\s+/).filter(Boolean);
  if (!words.length) return true;
  const hay = fields.map(norm).join(' · ');
  return words.every(w => hay.includes(w));
}
