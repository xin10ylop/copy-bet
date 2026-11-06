"use client";
import clsx from "clsx";
import { motion } from "motion/react";

/** Toggleable pill. Selected chips fill with ink, like a wallet's token filter. */
export function Chip({ selected, onClick, children, className, removable }: { selected?: boolean; onClick?: () => void; children: React.ReactNode; className?: string; removable?: boolean }) {
  return (
    <motion.button
      type="button"
      layout
      onClick={onClick}
      whileTap={{ scale: 0.95 }}
      transition={{ type: "spring", stiffness: 500, damping: 32 }}
      className={clsx(
        "inline-flex h-10 shrink-0 items-center gap-1.5 rounded-full px-4 text-[15px] font-medium transition-colors duration-300",
        selected ? "bg-ink text-bg" : "bg-surface text-ink hover:bg-surface-2",
        className,
      )}
    >
      {children}
      {removable && selected && (
        <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden className="-mr-1 opacity-70">
          <path d="M4 4l6 6M10 4l-6 6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
        </svg>
      )}
    </motion.button>
  );
}
