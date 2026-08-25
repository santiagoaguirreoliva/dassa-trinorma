// Exportación a Excel (.xlsx) de las tablas de la app, tal cual se ven:
// cada página declara sus columnas (encabezado + cómo se lee/formatea el valor)
// y pasa las filas YA filtradas que está mostrando. SheetJS se carga on-demand
// para no engordar el bundle inicial.

export interface ExcelColumn<T> {
  header: string;
  value: (row: T) => unknown;
  /** ancho en caracteres; si falta se calcula del contenido */
  width?: number;
}

function cell(v: unknown): string | number | boolean | Date {
  if (v === null || v === undefined) return '';
  if (typeof v === 'number' || typeof v === 'boolean' || v instanceof Date) return v;
  return String(v);
}

export async function exportToExcel<T>(
  filename: string,
  sheetName: string,
  columns: ExcelColumn<T>[],
  rows: T[],
) {
  const XLSX = await import('xlsx');
  const header = columns.map(c => c.header);
  const data = rows.map(r => columns.map(c => cell(c.value(r))));
  const ws = XLSX.utils.aoa_to_sheet([header, ...data]);
  ws['!cols'] = columns.map((c, i) => ({
    wch: c.width ?? Math.min(60, Math.max(c.header.length, ...data.map(row => String(row[i] ?? '').length), 8)),
  }));
  const wb = XLSX.utils.book_new();
  // El nombre de hoja en Excel no admite : \ / ? * [ ] y corta en 31 chars
  XLSX.utils.book_append_sheet(wb, ws, sheetName.replace(/[:\\/?*[\]]/g, ' ').slice(0, 31));
  const stamp = new Date().toISOString().slice(0, 10);
  XLSX.writeFile(wb, `${filename}-${stamp}.xlsx`);
}
