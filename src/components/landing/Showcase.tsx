"use client";
import { motion, useInView, useScroll, useTransform } from "motion/react";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import clsx from "clsx";
import Link from "next/link";

export interface ShowcaseCard {
  title: string;
  bg: string;
  ink?: string;
  art: React.ReactNode;
}

/**
 * Scroll story, in three beats:
 * 1. A big phrase (with a live icon inside it) pins to the middle of the screen and fades in.
 * 2. A stacked deck of cards rises from below as the phrase scrolls away.
 * 3. When the deck reaches the middle, it deals out into a scrollable row with a label and arrows.
 * `tone="brand"` washes the whole page blue while the section is on screen.
 */
export function Showcase({ id, label, labelIcon, phrase, cards, tone = "light", href = "/app" }: { id?: string; label: string; labelIcon: React.ReactNode; phrase: React.ReactNode; cards: ShowcaseCard[]; tone?: "light" | "brand"; href?: string }) {
  const section = useRef<HTMLElement>(null);
  const pin = useRef<HTMLDivElement>(null);
  const { scrollYProgress: sectionP } = useScroll({ target: section, offset: ["start end", "end start"] });
  const wash = useTransform(sectionP, [0.08, 0.2, 0.8, 0.92], [0, 1, 1, 0]);
  const { scrollYProgress: pinP } = useScroll({ target: pin, offset: ["start end", "start 0.25"] });
  const phraseOpacity = useTransform(pinP, [0.35, 0.85], [0.18, 1]);
  const phraseY = useTransform(pinP, [0.35, 0.85], [40, 0]);
  const dark = tone === "brand";

  return (
    <section id={id} ref={section} className={clsx("relative scroll-mt-24", dark && "text-white")}>
      {dark && <motion.div aria-hidden style={{ opacity: wash }} className="pointer-events-none fixed inset-0 -z-10 bg-brand" />}
      {/* 1. pinned phrase */}
      <div ref={pin} className="relative h-[78vh] sm:h-[95vh]">
        <motion.div style={{ opacity: phraseOpacity, y: phraseY }} className="sticky top-[28vh] px-4 text-center">
          <h2 className="display mx-auto max-w-[1000px] text-[48px] sm:text-[88px]">{phrase}</h2>
          <Link href={href} className={clsx("press mt-6 inline-flex h-10 items-center gap-1.5 rounded-full px-5 text-[15px] font-semibold", dark ? "bg-white/15 text-white hover:bg-white/25" : "bg-brand-soft text-brand hover:bg-surface-3")}>
            See it live
            <svg width="12" height="12" viewBox="0 0 14 14" aria-hidden>
              <path d="M3 11 11 3M5 3h6v6" stroke="currentColor" strokeWidth="1.8" fill="none" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </Link>
        </motion.div>
      </div>
      {/* 2–3. deck that deals into a row */}
      <Deck label={label} labelIcon={labelIcon} cards={cards} dark={dark} />
      <div className="h-[18vh]" />
    </section>
  );
}

const CARD_GAP = 16;

function Deck({ label, labelIcon, cards, dark }: { label: string; labelIcon: React.ReactNode; cards: ShowcaseCard[]; dark: boolean }) {
  const wrap = useRef<HTMLDivElement>(null);
  const row = useRef<HTMLDivElement>(null);
  const items = useRef<(HTMLDivElement | null)[]>([]);
  const [offsets, setOffsets] = useState<number[]>([]);
  // Deal once the deck's middle reaches the middle of the screen; re-stack if scrolled back above.
  const dealt = useInView(wrap, { margin: "0px 0px -48% 0px" });

  useLayoutEffect(() => {
    const measure = () => {
      const r = row.current;
      if (!r) return;
      const first = items.current[0];
      if (!first) return;
      const cardW = first.offsetWidth;
      const deckLeft = Math.max(0, (r.clientWidth - cardW) / 2 - 14);
      setOffsets(items.current.map((el, i) => (el ? deckLeft - el.offsetLeft + r.scrollLeft + i * 14 : 0)));
    };
    measure();
    const ro = new ResizeObserver(measure);
    if (row.current) ro.observe(row.current);
    return () => ro.disconnect();
  }, [cards.length]);

  const scrollBy = (dir: 1 | -1) => {
    const w = items.current[0]?.offsetWidth ?? 340;
    row.current?.scrollBy({ left: dir * (w + CARD_GAP), behavior: "smooth" });
  };

  // Once dealt, the row slides to the next card on its own (and loops), pausing while touched or hovered.
  const paused = useRef(false);
  useEffect(() => {
    if (!dealt) return;
    const t = setInterval(() => {
      const r = row.current;
      if (!r || paused.current) return;
      const atEnd = r.scrollLeft + r.clientWidth >= r.scrollWidth - 8;
      if (atEnd) r.scrollTo({ left: 0, behavior: "smooth" });
      else scrollBy(1);
    }, 3200);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dealt]);

  return (
    <div ref={wrap} className="relative">
      <div className="mx-auto flex max-w-[1240px] items-center justify-between px-4 sm:px-8">
        <motion.span animate={{ opacity: dealt ? 1 : 0, y: dealt ? 0 : 10 }} transition={{ duration: 0.4 }} className={clsx("inline-flex items-center gap-2 rounded-full px-4 py-2 text-[15px] font-semibold", dark ? "bg-white/15" : "bg-white shadow-[0_2px_12px_rgba(16,23,58,.06)]")}>
          {labelIcon}
          {label}
        </motion.span>
        <motion.div animate={{ opacity: dealt ? 1 : 0 }} className={clsx("flex gap-1 rounded-full p-1", dark ? "bg-white/15" : "bg-white")}>
          {([-1, 1] as const).map((d) => (
            <button key={d} aria-label={d < 0 ? "Previous" : "Next"} onClick={() => scrollBy(d)} className={clsx("press flex h-9 w-9 items-center justify-center rounded-full", dark ? "hover:bg-white/20" : "hover:bg-surface-2", d > 0 && (dark ? "bg-white/20" : "bg-brand-soft text-brand"))}>
              <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden>
                <path d={d < 0 ? "M9 2 4 7l5 5" : "M5 2l5 5-5 5"} stroke="currentColor" strokeWidth="1.8" fill="none" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
          ))}
        </motion.div>
      </div>
      <div
        ref={row}
        onPointerEnter={() => {
          paused.current = true;
        }}
        onPointerLeave={() => {
          paused.current = false;
        }}
        onTouchStart={() => {
          paused.current = true;
        }}
        onTouchEnd={() => {
          setTimeout(() => {
            paused.current = false;
          }, 4000);
        }}
        className="no-scrollbar mt-5 flex snap-x snap-mandatory overflow-x-auto px-4 pb-6 sm:px-8 lg:px-[max(32px,calc((100vw-1240px)/2+32px))]"
        style={{ gap: CARD_GAP }}
      >
        {cards.map((c, i) => (
          <motion.div
            key={c.title}
            ref={(el) => {
              items.current[i] = el;
            }}
            initial={false}
            animate={dealt || !offsets.length ? { x: 0, scale: 1, opacity: 1 } : { x: offsets[i] ?? 0, scale: 1 - i * 0.045, opacity: i < 3 ? 1 : 0 }}
            transition={{ type: "spring", stiffness: 170, damping: 24, delay: dealt ? i * 0.05 : 0 }}
            style={{ zIndex: cards.length - i, transformOrigin: "left center", background: c.bg, color: c.ink ?? "#10173a" }}
            className="relative flex aspect-[3/4] w-[78vw] max-w-[380px] shrink-0 snap-start flex-col overflow-hidden rounded-[28px] sm:w-[340px] lg:w-[380px]"
          >
            <div className="relative z-10 p-6 pb-0 text-[21px] leading-[1.25] font-medium tracking-[-0.01em] sm:p-7 sm:pb-0 sm:text-[22px]">{c.title}</div>
            <div className="relative flex-1">{c.art}</div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}

/** A little glossy ball that lives inside a headline and cycles through sports. */
export function InlineBall({ icons }: { icons: React.ReactNode[] }) {
  const [i, setI] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setI((v) => (v + 1) % icons.length), 1600);
    return () => clearInterval(t);
  }, [icons.length]);
  return (
    <span className="relative mx-[0.12em] inline-flex h-[0.9em] w-[0.9em] translate-y-[0.08em] items-center justify-center rounded-full bg-[radial-gradient(circle_at_32%_28%,#c3d3ff_0%,#4f7bff_38%,#1652f0_70%,#0f3fcc_100%)] align-baseline shadow-[inset_-0.06em_-0.08em_0.12em_rgba(0,0,0,.25),0_0.08em_0.2em_rgba(22,82,240,.35)]">
      <motion.span key={i} initial={{ rotate: -90, scale: 0.4, opacity: 0 }} animate={{ rotate: 0, scale: 1, opacity: 1 }} transition={{ type: "spring", stiffness: 300, damping: 16 }} className="flex h-[62%] w-[62%] items-center justify-center text-white [&_svg]:h-full [&_svg]:w-full">
        {icons[i]}
      </motion.span>
    </span>
  );
}
