import { db } from "./db";
import { bettorStats, landingStats } from "./stats";
import type { HeroAlert } from "@/components/landing/AlertPhone";

export interface CompareExample {
  name: string;
  address: string;
  sport: string;
  sportRoi: number;
  sportBets: number;
  otherRoi: number;
  otherBets: number;
}

export interface LandingData {
  tracked: number;
  perSport: Record<string, { bettors: number; bets: number; best: number }>;
  topProfit30d: number | null;
  alerts: HeroAlert[];
  compare: CompareExample | null;
}

let cache: { at: number; data: LandingData } | null = null;

/** Everything on the landing page comes from real, indexed Polymarket data. Cached 5 minutes. */
export async function getLandingData(): Promise<LandingData> {
  if (cache && Date.now() - cache.at < 5 * 60_000) return cache.data;
  try {
    const { tracked, perSport, top } = await landingStats();
    const alerts: HeroAlert[] = [];
    let compare: CompareExample | null = null;
    for (const b of top) {
      const pos = await db.openPosition.findMany({ where: { bettorId: b.address, avgPrice: { gt: 0.05, lt: 0.95 } }, orderBy: { entryAt: "desc" }, take: 2 });
      for (const p of pos) alerts.push({ name: b.name, league: p.league, title: p.title, outcome: p.outcome, price: p.avgPrice, usd: p.cost, roi: b.roi });
      // A bettor whose best sport looks very different from the rest of their record.
      const all = await bettorStats(b.address, { sports: [], timing: [], timeframe: "all" });
      const best = all.sports.filter((s) => s.bets >= 20).sort((a, z) => z.roi - a.roi)[0];
      if (best) {
        const restBets = all.bets - best.bets;
        const restStaked = all.staked - best.staked;
        const restRoi = restStaked > 0 ? (100 * (all.profit - best.profit)) / restStaked : 0;
        const gap = best.roi - restRoi;
        if (restBets >= 20 && gap > 10 && (!compare || gap > compare.sportRoi - compare.otherRoi)) {
          compare = { name: b.name, address: b.address, sport: best.sport, sportRoi: best.roi, sportBets: best.bets, otherRoi: restRoi, otherBets: restBets };
        }
      }
    }
    const data: LandingData = { tracked, perSport, topProfit30d: top[0]?.profit ?? null, alerts: alerts.slice(0, 8), compare };
    cache = { at: Date.now(), data };
    return data;
  } catch {
    return { tracked: 0, perSport: {}, topProfit30d: null, alerts: [], compare: null };
  }
}
