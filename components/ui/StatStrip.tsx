// A few headline numbers in one row.
export function StatStrip({ items }: { items: { label: string; value: number | string; alert?: boolean }[] }) {
  return (
    <dl className="surface grid grid-cols-2 sm:grid-cols-4">
      {items.map((item, i) => (
        <div key={item.label} className={`px-4 py-3 ${i % 2 === 1 ? "border-l border-line" : ""} ${i >= 2 ? "border-t border-line sm:border-t-0" : ""} ${i > 0 ? "sm:border-l sm:border-line" : ""}`}>
          <dt className="eyebrow">{item.label}</dt>
          <dd className={`mt-1 font-mono text-2xl font-semibold ${item.alert ? "text-stamp-red" : "text-ink"}`}>{item.value}</dd>
        </div>
      ))}
    </dl>
  );
}
