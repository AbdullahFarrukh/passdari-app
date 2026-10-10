// One key, shared by the inline script in layout.tsx (which has to set the theme before paint, so it
// can't import this — see the literal copy there) and ThemeToggle.tsx (which can). Keep them in sync by
// hand if this ever changes.
export const THEME_STORAGE_KEY = "passdari-theme";
export type Theme = "light" | "dark";

export function isTheme(value: unknown): value is Theme {
  return value === "light" || value === "dark";
}
