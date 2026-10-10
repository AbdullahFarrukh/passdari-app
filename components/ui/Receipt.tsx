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
      {/* A shadow at the old light-theme opacity all but disappears under a dark card on a near-black
          ground, so this is a lot darker and a little bigger than it was — same reasoning as .surface
          in globals.css. */}
      <div className={`bg-surface text-ink shadow-[0_16px_32px_rgba(0,0,0,.55),0_3px_8px_rgba(0,0,0,.4)] ${className}`}>
        {children}
      </div>
      <div className="tear-b" />
    </div>
  );
}
