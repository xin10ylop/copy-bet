import clsx from "clsx";
import Link from "next/link";

type Variant = "brand" | "soft" | "ghost" | "dark" | "light" | "lime";
type Size = "sm" | "md" | "lg";

const V: Record<Variant, string> = {
  brand: "bg-brand text-white hover:bg-brand-2 shadow-[0_8px_24px_-8px_rgba(22,82,240,.55)]",
  soft: "bg-brand-soft text-brand hover:bg-surface-3",
  ghost: "bg-transparent text-ink hover:bg-surface-2",
  dark: "bg-ink text-bg hover:opacity-90",
  light: "bg-white text-[#10173a] hover:bg-[#eef1ff]",
  lime: "bg-lime text-[#10173a] hover:brightness-95",
};
const S: Record<Size, string> = {
  sm: "h-9 px-4 text-[14px]",
  md: "h-12 px-6 text-[16px]",
  lg: "h-[60px] px-8 text-[18px]",
};

export function buttonClass(variant: Variant = "brand", size: Size = "md", className?: string) {
  return clsx("press inline-flex select-none items-center justify-center gap-2 rounded-full font-semibold whitespace-nowrap disabled:opacity-40 disabled:pointer-events-none", V[variant], S[size], className);
}

export function Button({ variant, size, className, ...rest }: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant; size?: Size }) {
  return <button className={buttonClass(variant, size, className)} {...rest} />;
}

export function ButtonLink({ variant, size, className, ...rest }: React.ComponentProps<typeof Link> & { variant?: Variant; size?: Size }) {
  return <Link className={buttonClass(variant, size, className)} {...rest} />;
}
