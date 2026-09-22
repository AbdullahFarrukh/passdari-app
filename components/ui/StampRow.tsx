import { CheckIcon } from "./icons";

// A row of stamp boxes, like punches on a paper card. Filled ones are stamped solid black with a
// check; empty ones are dashed. The text label means the count is never shown by colour alone.
export function StampRow({ total, filled }: { total: number; filled: number }) {
  return (
    <div role="img" aria-label={`${Math.min(filled, total)} of ${total} stamps collected`} className="flex flex-wrap gap-2">
      {Array.from({ length: total }).map((_, i) => (
        <span key={i}
          className={`flex size-8 items-center justify-center rounded-md border-2 ${i < filled ? "border-ink bg-ink text-paper" : "border-dashed border-line-strong text-transparent"}`}>
          <CheckIcon size={16} />
        </span>
      ))}
    </div>
  );
}
