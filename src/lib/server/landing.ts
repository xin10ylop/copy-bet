import { db } from "./db";
import { bettorStats, landingStats } from "./stats";
import type { PhoneAlert, PhoneBettor, PhoneCompare } from "@/components/landing/HeroPhone";

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
  /** Bettors up over the last 30 days and their combined profit (real data). */
  winners30d: { count: number; profit: number };
  phone: { bettors: PhoneBettor[]; alert: PhoneAlert | null; compare: PhoneCompare | null };
  compare: CompareExample | null;
}

let cache: { at: number; data: LandingData } | null = null;

/** Everything on the landing page comes from real, indexed Polymarket data. Cached 5 minutes. */
export async function getLandingData(): Promise<LandingData> {
  if (cache && Date.now() - cache.at < 5 * 60_000) return cache.data;
  try {
    const { tracked, perSport, top, winners30d } = await landingStats();
    const alerts: PhoneAlert[] = [];
    let compare: CompareExample | null = null;
    for (const b of top) {
      const pos = await db.openPosition.findMany({ where: { bettorId: b.address, avgPrice: { gt: 0.05, lt: 0.95 } }, orderBy: { entryAt: "desc" }, take: 2 });
      for (const p of pos) alerts.push({ league: p.league, title: p.title, outcome: p.outcome, price: p.avgPrice, usd: p.cost });
      // A bettor whose best sport looks very different from the rest of their record.
      const all = await bettorStats(b.address, { sports: [], timing: [], timeframe: "all" });
      const best = all.sports.filter((s) => s.bets >= 20).sort((a, z) => z.roi - a.roi)[0];
      if (best) {
        const restBets = all.bets - best.bets;
        const restStaked = all.staked - best.staked;
        const restRoi = restStaked > 0 ? (100 * (all.profit - best.profit)) / restStaked : 0;
        const gap = best.roi - restRoi;
        if (restBets >= 20 && all.roi > 8 && best.roi >= 15 && gap > 10 && (!compare || gap > compare.sportRoi - compare.otherRoi)) {
          compare = { name: b.name, address: b.address, sport: best.sport, sportRoi: best.roi, sportBets: best.bets, otherRoi: restRoi, otherBets: restBets };
        }
      }
    }
    // The phone demo follows the bettor of the "real example" when there is one, else this month's #1.
    const star = (compare && top.find((b) => b.address === compare!.address)) ?? top[0];
    const ordered = star ? [star, ...top.filter((b) => b !== star)] : top;
    // The demo's "one sport vs everything else" card uses the star's real all-time split.
    let phoneCompare: PhoneCompare | null = compare && star && compare.address === star.address ? { sport: compare.sport, sportRoi: compare.sportRoi, otherRoi: compare.otherRoi, sportBets: compare.sportBets } : null;
    if (!phoneCompare && star) {
      const all = await bettorStats(star.address, { sports: [], timing: [], timeframe: "all" });
      const best = all.sports.filter((x) => x.bets >= 10).sort((a, z) => z.roi - a.roi)[0];
      const restStaked = best ? all.staked - best.staked : 0;
      if (best && restStaked > 0 && all.bets - best.bets >= 10) phoneCompare = { sport: best.sport, sportRoi: best.roi, otherRoi: (100 * (all.profit - best.profit)) / restStaked, sportBets: best.bets };
    }
    const phoneBettors: PhoneBettor[] = ordered.slice(0, 4).map((b) => ({ address: b.address, name: b.name, profileImage: b.profileImage, roi: b.roi, profit: b.profit, winRate: b.winRate, bets: b.bets, sport: b === star && phoneCompare ? phoneCompare.sport : (b.topSports[0]?.sport ?? "other") }));
    const starAlert = star ? await db.openPosition.findFirst({ where: { bettorId: star.address, avgPrice: { gt: 0.2, lt: 0.8 } }, orderBy: { entryAt: "desc" } }) : null;
    const alert: PhoneAlert | null = starAlert ? { league: starAlert.league, title: starAlert.title, outcome: starAlert.outcome, price: starAlert.avgPrice, usd: starAlert.cost } : (alerts[0] ?? null);
    const data: LandingData = { tracked, winners30d, perSport, topProfit30d: top[0]?.profit ?? null, phone: { bettors: phoneBettors, alert, compare: phoneCompare }, compare };
    cache = { at: Date.now(), data };
    return data;
  } catch {
    return { tracked: 0, winners30d: { count: 0, profit: 0 }, perSport: {}, topProfit30d: null, phone: { bettors: [], alert: null, compare: null }, compare: null };
  }
}
