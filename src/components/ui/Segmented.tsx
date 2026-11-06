"use client";
import clsx from "clsx";
import { motion } from "motion/react";
import { useId } from "react";

/** Pill segmented control with a sliding thumb. */
export function Segmented<T extends string>({ value, options, onChange, className, size = "md" }: { value: T; options: { key: T; label: React.ReactNode }[]; onChange: (v: T) => void; className?: string; size?: "sm" | "md" }) {
  const id = useId();
  return (
    <div className={clsx("relative inline-flex rounded-full bg-surface-2 p-1", className)} role="tablist">
      {options.map((o) => (
        <button
          key={o.key}
          role="tab"
          aria-selected={o.key === value}
          onClick={() => onChange(o.key)}
          className={clsx("relative z-0 flex-1 rounded-full font-semibold whitespace-nowrap transition-colors duration-300", size === "sm" ? "h-8 px-3 text-[13px]" : "h-10 px-4 text-[15px]", o.key === value ? "text-ink" : "text-ink-3")}
        >
          {o.key === value && <motion.span layoutId={`seg-${id}`} className="absolute inset-0 -z-10 rounded-full bg-surface shadow-[0_2px_10px_rgba(16,23,58,.08)]" transition={{ type: "spring", stiffness: 420, damping: 34 }} />}
          {o.label}
        </button>
      ))}
    </div>
  );
}
