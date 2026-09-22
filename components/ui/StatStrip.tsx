import { Receipt } from "./Receipt";
import { ReceiptRow } from "./ReceiptRow";

// A few headline numbers, printed as receipt lines under a centered "— TITLE —" label.
export function StatStrip({ title, items }: { title: string; items: { label: string; value: number | string; alert?: boolean }[] }) {
  return (
    <Receipt className="px-5 pb-1.5 pt-3.5 sm:px-6">
      <p className="text-center font-mono text-[10.5px] tracking-[.14em] text-muted">— {title} —</p>
      <div className="mt-1.5 flex flex-col gap-0.5">
        {items.map((item) => (
          <ReceiptRow
            key={item.label}
            label={item.label}
            value={item.value}
            valueClassName={item.alert ? "text-stamp-red" : undefined}
          />
        ))}
      </div>
    </Receipt>
  );
}
