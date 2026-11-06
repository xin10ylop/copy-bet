import clsx from "clsx";

/** CopyBet mark: two stacked cards (copy) with an up-right arrow (winning). */
export function LogoMark({ size = 32, className }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" className={className} aria-hidden>
      <rect width="40" height="40" rx="12" fill="#1652F0" />
      <rect x="15" y="9" width="16" height="16" rx="5" fill="#D4FF4F" />
      <rect x="9" y="15" width="16" height="16" rx="5" fill="#fff" />
      <path d="M14 26.2 20.4 19.8M15.6 19.6h5v5" stroke="#1652F0" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" fill="none" />
    </svg>
  );
}

export function Logo({ className, dark = false, size = 30 }: { className?: string; dark?: boolean; size?: number }) {
  return (
    <span className={clsx("inline-flex items-center gap-2", className)}>
      <LogoMark size={size} />
      <span className={clsx("text-[22px] font-bold tracking-[-0.04em]", dark ? "text-white" : "text-ink")}>copybet</span>
    </span>
  );
}
