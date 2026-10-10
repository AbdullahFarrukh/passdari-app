import type { ReactNode } from "react";

// A torn-off slip of receipt paper: the app's main card treatment. Flat corners (the tear takes the
// place of rounding), a soft shadow, no border — a border would wrap the flat sides but not the
// zigzag top and bottom, which would read as a broken outline rather than a deliberate choice.
// Anything absolutely positioned inside (a rubber-stamp badge hanging off a corner) needs the
// wrapper's own `relative` to anchor to.
export function Receipt({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <div className="relative">
      <div className="tear-t" />
      {/* --card-shadow carries its own light/dark value (see globals.css) — a shadow at the light
          theme's opacity all but disappears under a dark card on the night counter. */}
      <div className={`bg-surface text-ink shadow-[var(--card-shadow)] ${className}`}>
        {children}
      </div>
      <div className="tear-b" />
    </div>
  );
}
