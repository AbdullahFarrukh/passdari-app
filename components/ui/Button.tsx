import type { ButtonHTMLAttributes } from "react";

type Variant = "primary" | "danger" | "outline" | "ghost";
type Size = "md" | "sm" | "lg";

// `primary` used to be `bg-ink text-paper` — reading as "the boldest fill available" only because the
// old --ink was dark. Once --ink turns light (it is the main text colour everywhere else), that pairing
// inverts into a light fill with light text, so this is pointed at the accent colour directly instead.
const VARIANTS: Record<Variant, string> = {
  primary: "bg-stamp-blue text-white hover:bg-stamp-blue-deep",
  danger: "bg-stamp-red text-white hover:bg-stamp-red-deep",
  outline: "border-[2.5px] border-ink text-ink bg-transparent hover:bg-stamp-blue hover:text-white hover:border-stamp-blue",
  ghost: "text-ink underline-offset-4 hover:underline",
};
const SIZES: Record<Size, string> = {
  lg: "min-h-14 px-7 text-xl",
  md: "min-h-11 px-5 text-sm",
  sm: "min-h-9 px-4 text-xs",
};

export function Button({ variant = "primary", size = "md", className = "", type = "button", ...rest }:
  ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant; size?: Size }) {
  return (
    <button type={type} {...rest}
      className={`inline-flex items-center justify-center gap-2 rounded-full font-display font-extrabold uppercase tracking-wide transition-colors disabled:cursor-not-allowed disabled:border-0 disabled:bg-paper-2 disabled:text-muted ${VARIANTS[variant]} ${SIZES[size]} ${className}`} />
  );
}
