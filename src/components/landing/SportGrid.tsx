"use client";
import Link from "next/link";
import { motion } from "motion/react";
import { SPORTS } from "@/lib/sports";
import { SportIcon } from "../SportIcon";
import { formatUsd } from "@/lib/filters";

export function SportGrid({ perSport }: { perSport: Record<string, { bettors: number; bets: number; best: number }> }) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
      {SPORTS.map((s, i) => {
        const st = perSport[s.key];
        return (
          <motion.div key={s.key} initial={{ opacity: 0, y: 30, scale: 0.96 }} whileInView={{ opacity: 1, y: 0, scale: 1 }} viewport={{ once: true, margin: "-40px" }} transition={{ delay: (i % 4) * 0.06, duration: 0.7, ease: [0.22, 1, 0.36, 1] }}>
            <Link href={`/app?s=${s.key}`} className="group relative flex aspect-square flex-col justify-between overflow-hidden rounded-[28px] p-4 transition-transform duration-500 ease-brand hover:-translate-y-1.5 active:scale-[0.97] sm:p-6" style={{ background: s.tile, color: s.ink }}>
              <div className="flex items-start justify-between">
                <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/70 transition-transform duration-500 ease-brand group-hover:rotate-[-8deg] group-hover:scale-110 sm:h-14 sm:w-14">
                  <SportIcon sport={s.key} size={28} />
                </span>
                <span className="flex h-9 w-9 translate-x-2 items-center justify-center rounded-full bg-white/70 opacity-0 transition-all duration-500 ease-brand group-hover:translate-x-0 group-hover:opacity-100">
                  <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden>
                    <path d="M3 11 11 3M5 3h6v6" stroke="currentColor" strokeWidth="1.8" fill="none" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </span>
              </div>
              <span aria-hidden className="pointer-events-none absolute -right-6 -bottom-8 opacity-[0.09] transition-transform duration-700 ease-brand group-hover:scale-110 group-hover:rotate-12">
                <SportIcon sport={s.key} size={150} />
              </span>
              <div className="relative">
                <div className="title text-[20px] leading-tight sm:text-[26px]">{s.label}</div>
                <div className="mt-0.5 truncate text-[13px] opacity-70 sm:text-[14px]">{s.headline.join(" · ")}</div>
                {st && st.best >= 100 ? (
                  <div className="mt-2 inline-flex items-center gap-1 rounded-full bg-white/70 px-2.5 py-1 text-[12px] font-semibold sm:text-[13px]">
                    Top 30d: +{formatUsd(st.best)}
                  </div>
                ) : st ? (
                  <div className="mt-2 inline-flex rounded-full bg-white/70 px-2.5 py-1 text-[12px] font-semibold sm:text-[13px]">{st.bettors} bettors tracked</div>
                ) : null}
              </div>
            </Link>
          </motion.div>
        );
      })}
    </div>
  );
}
