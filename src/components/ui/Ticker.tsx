"use client";
import { animate, useInView } from "motion/react";
import { useEffect, useRef } from "react";

/** Number that counts to its value — on first view, and smoothly whenever it changes. */
export function Ticker({ value, format, className }: { value: number; format: (n: number) => string; className?: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const prev = useRef(0);
  const inView = useInView(ref, { once: true, margin: "-40px" });
  useEffect(() => {
    if (!inView || !ref.current) return;
    const node = ref.current;
    const controls = animate(prev.current, value, {
      duration: 0.9,
      ease: [0.22, 1, 0.36, 1],
      onUpdate: (v) => (node.textContent = format(v)),
    });
    prev.current = value;
    return () => controls.stop();
  }, [value, inView, format]);
  return (
    <span ref={ref} className={className}>
      {format(0)}
    </span>
  );
}
