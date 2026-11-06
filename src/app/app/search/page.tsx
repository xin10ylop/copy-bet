"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { motion } from "motion/react";
import Link from "next/link";
import { FilterPanel, useMatchCount } from "@/components/app/FilterPanel";
import { Button } from "@/components/ui/Button";
import { Sheet } from "@/components/ui/Sheet";
import { useMe } from "@/components/app/MeProvider";
import { type BettorFilter, describeFilter, emptyFilter, filterToParams, paramsToFilter } from "@/lib/filters";
import { sportLabel } from "@/lib/sports";

const READY: { name: string; sub: string; color: string; f: Partial<BettorFilter> }[] = [
  { name: "NFL sharps", sub: "30d ROI 10%+, 30+ bets", color: "#DDE6FF", f: { sports: ["football"], roi: { min: 10 }, bets: { min: 30 } } },
  { name: "NBA sharps", sub: "30d ROI 10%+, 30+ bets", color: "#FFE2CC", f: { sports: ["basketball"], roi: { min: 10 }, bets: { min: 30 } } },
  { name: "Soccer sharps", sub: "30d ROI 10%+, 30+ bets", color: "#D6F5E3", f: { sports: ["soccer"], roi: { min: 10 }, bets: { min: 30 } } },
  { name: "Early birds", sub: "Bet 24h+ before kickoff", color: "#ECE3FF", f: { timing: ["early"], roi: { min: 5 } } },
  { name: "Live bettors", sub: "Bet during the game", color: "#FFE0E3", f: { timing: ["live"], roi: { min: 0 } } },
  { name: "Consistent", sub: "Win rate 55%+, 100+ bets", color: "#F1F9C9", f: { winRate: { min: 55 }, bets: { min: 100 }, timeframe: "all" } },
  { name: "Hot this week", sub: "Most profit, last 7 days", color: "#DDF3FA", f: { timeframe: "7d", sort: "profit", profit: { min: 1000 } } },
  { name: "Undiscovered", sub: "ROI 15%+, barely copied", color: "#EDE7DD", f: { roi: { min: 15 }, followers: { max: 1 } } },
];

export default function SearchPage() {
  const router = useRouter();
  const { me, refresh } = useMe();
  const [f, setF] = useState<BettorFilter>(emptyFilter());
  const [wallet, setWallet] = useState("");
  const [naming, setNaming] = useState(false);
  const [name, setName] = useState("");
  const n = useMatchCount(f);
  const go = (x: BettorFilter) => router.push(`/app?${filterToParams(x)}`);

  const lookup = (e: React.FormEvent) => {
    e.preventDefault();
    const m = wallet.match(/0x[0-9a-fA-F]{40}/);
    if (m) router.push(`/app/bettor/${m[0].toLowerCase()}`);
  };

  const save = async () => {
    await fetch("/api/searches", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ name: name || describeFilter(f, sportLabel).join(", ") || "My search", query: filterToParams(f).toString() }) });
    setNaming(false);
    setName("");
    refresh();
  };

  return (
    <div>
      <h1 className="display pt-6 text-[40px] sm:text-[48px]">Search</h1>

      <form onSubmit={lookup} className="mt-5 flex items-center gap-2 rounded-full bg-surface p-1.5 pl-5">
        <svg width="18" height="18" viewBox="0 0 24 24" className="shrink-0 text-ink-3" aria-hidden>
          <path d="M11 4a7 7 0 1 0 0 14 7 7 0 0 0 0-14Zm9 16-4-4" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" />
        </svg>
        <input value={wallet} onChange={(e) => setWallet(e.target.value)} placeholder="Paste a bettor ID or profile link" className="h-11 min-w-0 flex-1 bg-transparent text-[16px] outline-none placeholder:text-ink-3" />
        {/0x[0-9a-fA-F]{40}/.test(wallet) && (
          <Button size="sm" className="h-11" type="submit">
            Open
          </Button>
        )}
      </form>

      {me?.searches.length ? (
        <section className="mt-8">
          <h2 className="title mb-3 text-[20px]">Your searches</h2>
          <div className="space-y-2">
            {me.searches.map((s) => (
              <div key={s.id} className="flex items-center gap-2 rounded-[22px] bg-surface p-2 pl-5">
                <Link href={`/app?${s.query}`} className="min-w-0 flex-1 py-2">
                  <div className="truncate text-[16px] font-semibold">{s.name}</div>
                  <div className="truncate text-[13px] text-ink-3">{describeFilter(paramsToFilter(new URLSearchParams(s.query)), sportLabel, { includeTimeframe: true }).join(" · ")}</div>
                </Link>
                <button
                  aria-label="Delete search"
                  onClick={async () => {
                    await fetch(`/api/searches?id=${s.id}`, { method: "DELETE" });
                    refresh();
                  }}
                  className="press flex h-10 w-10 items-center justify-center rounded-full text-ink-3 hover:bg-surface-2"
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
        </section>
      ) : null}

      <section className="mt-8">
        <h2 className="title mb-3 text-[20px]">Ready-made</h2>
        <div className="no-scrollbar -mx-4 flex snap-x gap-2 overflow-x-auto px-4 sm:-mx-6 sm:px-6">
          {READY.map((r, i) => (
            <motion.button
              key={r.name}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.04 }}
              onClick={() => go({ ...emptyFilter(), ...r.f })}
              className="press flex h-[132px] w-[150px] shrink-0 snap-start flex-col justify-between rounded-[24px] p-4 text-left text-[#10173a]"
              style={{ background: r.color }}
            >
              <span className="text-[17px] leading-tight font-semibold">{r.name}</span>
              <span className="text-[13px] leading-snug opacity-70">{r.sub}</span>
            </motion.button>
          ))}
        </div>
      </section>

      <section className="mt-8">
        <h2 className="title mb-1 text-[20px]">Build your own</h2>
        <p className="mb-5 text-[15px] text-ink-2">Combine anything. Leave it empty to see everyone.</p>
        <div className="-mx-6 px-6">
          <FilterPanel value={f} onChange={setF} />
        </div>
      </section>

      <div className="sticky bottom-[96px] z-10 mt-4 flex gap-2">
        <Button variant="soft" size="lg" className="shrink-0 px-5" onClick={() => setNaming(true)} aria-label="Save search">
          Save
        </Button>
        <Button size="lg" className="flex-1" onClick={() => go(f)} disabled={n === 0}>
          {n === null ? "Show bettors" : n === 0 ? "No bettors match" : `Show ${n} bettor${n === 1 ? "" : "s"}`}
        </Button>
      </div>

      <Sheet open={naming} onClose={() => setNaming(false)} title="Name this search">
        <input autoFocus value={name} onChange={(e) => setName(e.target.value)} placeholder={describeFilter(f, sportLabel).join(", ") || "My search"} className="h-14 w-full rounded-2xl bg-surface px-5 text-[17px] outline-none" />
        <Button size="lg" className="mt-4 mb-2 w-full" onClick={save}>
          Save search
        </Button>
      </Sheet>
    </div>
  );
}
