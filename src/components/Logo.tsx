import clsx from "clsx";
import { Mascot } from "./Mascot";

/** CopyBet mark: Echo — the pro, and its copy (you). The eyes follow the pointer. */
export function LogoMark({ size = 32, className, variant = "color", follow = false }: { size?: number; className?: string; variant?: "color" | "white"; follow?: boolean }) {
  return <Mascot size={size} variant={variant} follow={follow} className={className} />;
}

export function Logo({ className, dark = false, size = 30 }: { className?: string; dark?: boolean; size?: number }) {
  return (
    <span className={clsx("inline-flex items-center gap-1.5", className)}>
      <LogoMark size={size + 4} variant={dark ? "white" : "color"} follow />
      <span className={clsx("text-[22px] font-bold tracking-[-0.04em]", dark ? "text-white" : "text-ink")}>copybet</span>
    </span>
  );
}
