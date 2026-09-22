import type { ReactNode } from "react";

// A torn-off slip of receipt paper: the app's main card treatment. Flat corners (the tear takes the
// place of rounding), a soft shadow, no border. Anything absolutely positioned inside (a rubber-stamp
// badge hanging off a corner) needs the wrapper's own `relative` to anchor to.
export function Receipt({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <div className="relative">
      <div className="tear-t" />
      <div className={`bg-surface text-ink shadow-[0_10px_24px_rgba(17,17,17,.16),0_2px_4px_rgba(17,17,17,.12)] ${className}`}>
        {children}
      </div>
      <div className="tear-b" />
    </div>
  );
}
