type Row = Record<string, unknown>;

function escape(v: unknown): string {
  if (v === null || v === undefined) return '';
  const s = String(v);
  if (s.includes(',') || s.includes('"') || s.includes('\n')) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

export function exportToCSV(rows: Row[], filename: string, columns?: Array<{ key: string; header: string }>) {
  if (!rows.length) return;
  const cols = columns ?? Object.keys(rows[0]).map(k => ({ key: k, header: k }));
  const head = cols.map(c => escape(c.header)).join(',');
  const body = rows.map(r => cols.map(c => escape(r[c.key])).join(',')).join('\n');
  const BOM = '﻿';
  const csv = `${BOM}${head}\n${body}`;
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename.endsWith('.csv') ? filename : `${filename}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}
