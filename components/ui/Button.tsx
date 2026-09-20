import type { ButtonHTMLAttributes } from "react";

type Variant = "primary" | "danger" | "outline" | "ghost";
type Size = "md" | "sm";

const VARIANTS: Record<Variant, string> = {
  primary: "bg-ink text-paper hover:bg-ink-deep",
  danger: "bg-stamp-red text-paper hover:bg-stamp-red-deep",
  outline: "border border-ink text-ink hover:bg-ink/5",
  ghost: "text-ink underline-offset-4 hover:underline",
};
const SIZES: Record<Size, string> = { md: "min-h-11 px-4 text-sm", sm: "min-h-9 px-3 text-sm" };

export function Button({ variant = "primary", size = "md", className = "", type = "button", ...rest }:
  ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant; size?: Size }) {
  return (
    <button type={type} {...rest}
      className={`inline-flex items-center justify-center gap-2 rounded-lg font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${VARIANTS[variant]} ${SIZES[size]} ${className}`} />
  );
}
