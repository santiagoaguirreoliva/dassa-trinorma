import React from 'react';

interface TableProps extends React.TableHTMLAttributes<HTMLTableElement> {}

interface TableHeadProps extends React.HTMLAttributes<HTMLTableSectionElement> {}

interface TableBodyProps extends React.HTMLAttributes<HTMLTableSectionElement> {}

interface TableRowProps extends React.HTMLAttributes<HTMLTableRowElement> {}

interface TableCellProps extends React.TdHTMLAttributes<HTMLTableCellElement> {}

interface TableHeaderCellProps extends React.ThHTMLAttributes<HTMLTableCellElement> {}

export function Table({ className = '', ...props }: TableProps) {
  return <table className={`w-full border-collapse ${className}`} {...props} />;
}

export function TableHead({ className = '', ...props }: TableHeadProps) {
  return <thead className={`bg-gray-50 border-b border-gray-200 ${className}`} {...props} />;
}

export function TableBody({ className = '', ...props }: TableBodyProps) {
  return <tbody className={className} {...props} />;
}

export function TableRow({ className = '', ...props }: TableRowProps) {
  return <tr className={`border-b border-gray-200 hover:bg-gray-50 transition-colors ${className}`} {...props} />;
}

export function TableCell({ className = '', ...props }: TableCellProps) {
  return <td className={`px-6 py-4 text-sm text-gray-700 ${className}`} {...props} />;
}

export function TableHeaderCell({ className = '', ...props }: TableHeaderCellProps) {
  return <th className={`px-6 py-3 text-left text-sm font-semibold text-gray-900 ${className}`} {...props} />;
}
