import { useState } from 'react';
import { FileSpreadsheet } from 'lucide-react';
import { exportToExcel, type ExcelColumn } from '@/lib/exportExcel';

interface Props<T> {
  filename: string;
  sheetName: string;
  columns: ExcelColumn<T>[];
  rows: T[];
  label?: string;
}

// Botón estándar "Exportar Excel" para las tablas de la app. Exporta las filas
// que la vista está mostrando (ya filtradas), con los mismos encabezados.
export default function ExportExcelButton<T>({ filename, sheetName, columns, rows, label = 'Excel' }: Props<T>) {
  const [busy, setBusy] = useState(false);
  return (
    <button
      onClick={async () => { setBusy(true); try { await exportToExcel(filename, sheetName, columns, rows); } finally { setBusy(false); } }}
      disabled={busy || !rows.length}
      className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-gray-200 text-gray-700 rounded-lg text-xs font-bold hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      title={rows.length ? `Exportar ${rows.length} filas a Excel` : 'Sin filas para exportar'}
    >
      <FileSpreadsheet size={14} className="text-emerald-700" /> {busy ? 'Exportando…' : label}
    </button>
  );
}
