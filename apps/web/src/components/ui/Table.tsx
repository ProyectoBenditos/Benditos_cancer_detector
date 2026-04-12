import React from "react";

export function TableWrapper({ children, className = "" }: { children: React.ReactNode, className?: string }) {
  return (
    <div className={`overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm ${className}`}>
      <table className="w-full text-sm text-left">
        {children}
      </table>
    </div>
  );
}

export function TableHead({ children }: { children: React.ReactNode }) {
  return (
    <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold text-xs tracking-wider uppercase">
      {children}
    </thead>
  );
}

export function TableBody({ children }: { children: React.ReactNode }) {
  return (
    <tbody className="divide-y divide-slate-100">
      {children}
    </tbody>
  );
}

export function TableRow({ children, className = "", ...props }: React.HTMLAttributes<HTMLTableRowElement>) {
  return (
    <tr className={`text-slate-700 hover:bg-slate-50 transition-colors ${className}`} {...props}>
      {children}
    </tr>
  );
}

export function TableCell({ children, className = "", ...props }: React.TdHTMLAttributes<HTMLTableCellElement>) {
  return (
    <td className={`px-6 py-4 ${className}`} {...props}>
      {children}
    </td>
  );
}

export function TableHeaderCell({ children, className = "", ...props }: React.ThHTMLAttributes<HTMLTableCellElement>) {
  return (
    <th className={`px-6 py-4 ${className}`} {...props}>
      {children}
    </th>
  );
}
