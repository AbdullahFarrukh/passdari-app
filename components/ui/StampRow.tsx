// A row of stamp circles, like the ones on a paper card. Filled circles are stamped (with a lighter ring, the way
// a real ink stamp looks), empty ones are dashed. The text label means the count is never shown by colour alone.
export function StampRow({ total, filled }: { total: number; filled: number }) {
  return (
    <div role="img" aria-label={`${Math.min(filled, total)} of ${total} stamps collected`} className="flex flex-wrap gap-2">
      {Array.from({ length: total }).map((_, i) => (
        <span key={i}
          className={`size-8 rounded-full border-2 ${i < filled ? "border-stamp-red bg-stamp-red shadow-[inset_0_0_0_3px_var(--surface)]" : "border-dashed border-line-strong"}`} />
      ))}
    </div>
  );
}
