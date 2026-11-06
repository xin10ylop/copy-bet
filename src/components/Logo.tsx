import clsx from "clsx";
import { Mascot } from "./Mascot";

/** CopyBet mark: the Twins — the pro, and you copying them. */
export function LogoMark({ size = 32, className, variant = "color" }: { size?: number; className?: string; variant?: "color" | "white" }) {
  return <Mascot size={size} variant={variant} className={className} />;
}

export function Logo({ className, dark = false, size = 30 }: { className?: string; dark?: boolean; size?: number }) {
  return (
    <span className={clsx("inline-flex items-center gap-1.5", className)}>
      <LogoMark size={size + 4} variant={dark ? "white" : "color"} />
      <span className={clsx("text-[22px] font-bold tracking-[-0.04em]", dark ? "text-white" : "text-ink")}>copybet</span>
    </span>
  );
}
