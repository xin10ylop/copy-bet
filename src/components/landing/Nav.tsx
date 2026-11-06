"use client";
import Link from "next/link";
import { AnimatePresence, motion, useMotionValueEvent, useScroll } from "motion/react";
import { useState } from "react";
import clsx from "clsx";
import { Logo } from "../Logo";
import { ButtonLink } from "../ui/Button";

const LINKS = [
  { href: "#sports", label: "Sports" },
  { href: "#how", label: "How it works" },
  { href: "#pricing", label: "Pricing" },
  { href: "#faq", label: "FAQ" },
];

export function Nav() {
  const { scrollY } = useScroll();
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  useMotionValueEvent(scrollY, "change", (y) => setScrolled(y > 24));

  return (
    <header className="fixed inset-x-0 top-0 z-40 px-4 pt-3 sm:px-8 sm:pt-5">
      <div className={clsx("mx-auto flex max-w-[1200px] items-center justify-between rounded-full py-2 pr-2 pl-4 transition-all duration-500 ease-brand", scrolled ? "bg-white/80 shadow-[0_8px_32px_-12px_rgba(16,23,58,.25)] backdrop-blur-xl" : "bg-transparent")}>
        <Link href="/" aria-label="CopyBet home" className="press">
          <Logo size={30} />
        </Link>
        <nav className="hidden items-center gap-1 rounded-full bg-white px-2 py-1.5 shadow-[0_2px_12px_rgba(16,23,58,.06)] md:flex">
          {LINKS.map((l) => (
            <a key={l.href} href={l.href} className="press rounded-full px-4 py-2 text-[14px] font-medium text-ink hover:bg-surface-2">
              {l.label}
            </a>
          ))}
        </nav>
        <div className="flex items-center gap-2">
          <ButtonLink href="/app" size="sm" className="h-10 px-5">
            Start free
          </ButtonLink>
          <button aria-label="Menu" onClick={() => setOpen((v) => !v)} className="press flex h-10 w-10 items-center justify-center rounded-full bg-white md:hidden">
            <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden>
              <motion.path d="M3 6h12" stroke="#10173a" strokeWidth="1.8" strokeLinecap="round" animate={open ? { d: "M4 4l10 10" } : { d: "M3 6h12" }} />
              <motion.path d="M3 12h12" stroke="#10173a" strokeWidth="1.8" strokeLinecap="round" animate={open ? { d: "M4 14L14 4" } : { d: "M3 12h12" }} />
            </svg>
          </button>
        </div>
      </div>
      <AnimatePresence>
        {open && (
          <motion.nav initial={{ opacity: 0, y: -12, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -12, scale: 0.98 }} transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }} className="mx-auto mt-2 flex max-w-[1200px] flex-col rounded-[28px] bg-white p-3 shadow-xl md:hidden">
            {LINKS.map((l) => (
              <a key={l.href} href={l.href} onClick={() => setOpen(false)} className="rounded-2xl px-4 py-3.5 text-[18px] font-medium hover:bg-surface-2">
                {l.label}
              </a>
            ))}
          </motion.nav>
        )}
      </AnimatePresence>
    </header>
  );
}
