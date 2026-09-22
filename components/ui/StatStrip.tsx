// A few headline numbers, printed as receipt lines: a label, a dotted leader, then the value.
export function StatStrip({ items }: { items: { label: string; value: number | string; alert?: boolean }[] }) {
  return (
    <dl className="surface divide-y-2 divide-line overflow-hidden">
      {items.map((item) => (
        <div key={item.label} className="flex items-baseline gap-3 px-4 py-2.5">
          <dt className="eyebrow shrink-0">{item.label}</dt>
          <span aria-hidden="true" className="-translate-y-1 min-w-4 flex-1 border-b-2 border-dotted border-line-strong/40" />
          <dd className={`shrink-0 font-mono text-lg font-bold tabular-nums ${item.alert ? "text-stamp-red" : "text-ink"}`}>{item.value}</dd>
        </div>
      ))}
    </dl>
  );
}
