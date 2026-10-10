"use client";

import { useEffect, useState } from "react";
import { THEME_STORAGE_KEY, isTheme, type Theme } from "@/lib/theme";

function SunIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
      <circle cx="12" cy="12" r="4.5" />
      <path d="M12 2v2.5M12 19.5V22M4.2 4.2l1.8 1.8M18 18l1.8 1.8M2 12h2.5M19.5 12H22M4.2 19.8 6 18M18 6l1.8-1.8" />
    </svg>
  );
}
function MoonIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M20 14.5A8.5 8.5 0 1 1 9.5 4a7 7 0 0 0 10.5 10.5Z" />
    </svg>
  );
}

export function ThemeToggle() {
  // Starts as "light" on every render pass that matters for hydration — the server has no way to know
  // localStorage, so its HTML always shows the light-mode icon/labels. Reading the live DOM (which the
  // inline init script in layout.tsx has, by this point, already corrected) directly in this component's
  // first render would make that first render *correct* but *different* from the static HTML the server
  // sent, which is exactly what React's hydration check flags as an error — it compares against the
  // server's output, not against what's actually true. The useEffect below corrects it immediately after
  // mount instead, a separate render pass that hydration doesn't compare against anything.
  const [theme, setTheme] = useState<Theme>("light");

  useEffect(() => {
    // One of the genuine exceptions to this lint rule: synchronising with a DOM attribute React does
    // not itself own (an inline script, outside React, set it before hydration). There is no pure-render
    // alternative here — the whole point is correcting state immediately after mount specifically
    // because reading it during render would reintroduce the hydration mismatch this is avoiding.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setTheme(document.documentElement.dataset.theme === "dark" ? "dark" : "light");
    // Stays correct if the theme is ever changed from outside this component (another tab, via
    // storage) — rare, but cheap to handle.
    function onStorage(e: StorageEvent) {
      if (e.key === THEME_STORAGE_KEY && isTheme(e.newValue)) setTheme(e.newValue);
    }
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  function toggle() {
    const next: Theme = theme === "dark" ? "light" : "dark";
    setTheme(next);
    // Light is the CSS default (bare :root in globals.css), so going light means removing the
    // attribute entirely, not setting it to "light" — `toggleAttribute`'s boolean force param sets an
    // empty-string value, not "dark", which the [data-theme="dark"] selector would not match.
    if (next === "dark") document.documentElement.setAttribute("data-theme", "dark");
    else document.documentElement.removeAttribute("data-theme");
    try {
      localStorage.setItem(THEME_STORAGE_KEY, next);
    } catch {
      // Private browsing or storage disabled: the toggle still works for this page view, it just
      // won't be remembered next time.
    }
  }

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
      aria-pressed={theme === "dark"}
      title={theme === "dark" ? "Light mode" : "Dark mode"}
      className="inline-flex size-8 items-center justify-center rounded-full text-paper/80 transition-colors hover:bg-paper/10 hover:text-paper"
    >
      {theme === "dark" ? <SunIcon /> : <MoonIcon />}
    </button>
  );
}
