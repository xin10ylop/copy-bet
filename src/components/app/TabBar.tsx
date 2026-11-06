"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "motion/react";
import clsx from "clsx";
import { useMe } from "./MeProvider";

const TABS = [
  { href: "/app", label: "Discover", icon: <path d="M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18Zm3.6 5.4-1.8 5.4-5.4 1.8 1.8-5.4 5.4-1.8Z" /> },
  { href: "/app/search", label: "Search", icon: <path d="M11 4a7 7 0 1 0 0 14 7 7 0 0 0 0-14Zm9 16-4-4" /> },
  { href: "/app/portfolio", label: "Portfolio", icon: <path d="M4 8.5A2.5 2.5 0 0 1 6.5 6h11A2.5 2.5 0 0 1 20 8.5v9a2.5 2.5 0 0 1-2.5 2.5h-11A2.5 2.5 0 0 1 4 17.5v-9ZM9 6V5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v1M4 12h16" /> },
  { href: "/app/account", label: "Account", icon: <path d="M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8Zm-7 8a7 7 0 0 1 14 0" /> },
];

export function TabBar() {
  const path = usePathname();
  const { me } = useMe();
  const active = TABS.slice().reverse().find((t) => (t.href === "/app" ? path === "/app" || path.startsWith("/app/bettor") : path.startsWith(t.href)))?.href;
  const followCount = me?.follows.length ?? 0;
  return (
    <nav className="safe-bottom pointer-events-none fixed inset-x-0 bottom-0 z-30 flex justify-center px-3">
      <div className="pointer-events-auto flex w-full max-w-[440px] items-center justify-between rounded-full bg-surface/85 p-1.5 shadow-[0_12px_40px_-12px_rgba(16,23,58,.35)] ring-1 ring-line backdrop-blur-xl">
        {TABS.map((t) => {
          const on = active === t.href;
          return (
            <Link key={t.href} href={t.href} className="relative flex h-14 flex-1 flex-col items-center justify-center gap-0.5 rounded-full" aria-current={on ? "page" : undefined}>
              {on && <motion.span layoutId="tab-pill" className="absolute inset-0 rounded-full bg-brand-soft" transition={{ type: "spring", stiffness: 420, damping: 34 }} />}
              <svg width="22" height="22" viewBox="0 0 24 24" className={clsx("relative transition-colors duration-300", on ? "text-brand" : "text-ink-3")} fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                {t.icon}
              </svg>
              <span className={clsx("relative text-[11px] font-semibold transition-colors duration-300", on ? "text-brand" : "text-ink-3")}>{t.label}</span>
              {t.href === "/app/portfolio" && followCount > 0 && <span className="absolute top-1.5 right-[calc(50%-20px)] flex h-4 min-w-4 items-center justify-center rounded-full bg-brand px-1 text-[10px] font-bold text-white">{followCount}</span>}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
