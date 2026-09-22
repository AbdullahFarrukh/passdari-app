import type { ReactNode } from "react";

// A line on a printed receipt: a label, a dotted leader, a value — "Stamps ⋯⋯⋯ 7 / 10".
export function ReceiptRow({ label, value, className = "", valueClassName = "text-ink" }:
  { label: ReactNode; value: ReactNode; className?: string; valueClassName?: string }) {
  return (
    <div className={`flex items-baseline gap-2 font-mono text-xs uppercase ${className}`}>
      <span className="font-bold text-ink">{label}</span>
      <span className="min-w-3 flex-1 -translate-y-1 border-b-2 border-dotted border-line-strong/40" />
      <span className={`font-bold ${valueClassName}`}>{value}</span>
    </div>
  );
}
