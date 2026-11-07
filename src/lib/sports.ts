// Sport groups shown in the app, and how Polymarket league codes map into them.
// Polymarket has ~500 league codes (gamma /sports). Each event slug starts with
// its league code, e.g. "nfl-jax-bal-2026-11-06" or "epl-2027-champion-…".

export type SportKey =
  | "football"
  | "basketball"
  | "soccer"
  | "baseball"
  | "hockey"
  | "tennis"
  | "combat"
  | "esports"
  | "cricket"
  | "golf"
  | "racing"
  | "rugby"
  | "other";

export interface Sport {
  key: SportKey;
  label: string;
  short: string;
  /** Leagues shown as examples on tiles and chips. */
  headline: string[];
  /** Tile colours (background, ink) — pastel tiles, Phantom-style. */
  tile: string;
  ink: string;
}

export const SPORTS: Sport[] = [
  { key: "football", label: "Football", short: "NFL", headline: ["NFL", "College"], tile: "#DDE6FF", ink: "#1B2B6B" },
  { key: "basketball", label: "Basketball", short: "NBA", headline: ["NBA", "NCAAB", "EuroLeague"], tile: "#FFE2CC", ink: "#6B2E0B" },
  { key: "soccer", label: "Soccer", short: "Soccer", headline: ["Premier League", "Champions League", "La Liga"], tile: "#D6F5E3", ink: "#0B4D2C" },
  { key: "baseball", label: "Baseball", short: "MLB", headline: ["MLB", "KBO", "NPB"], tile: "#FFE0E3", ink: "#6B0B1A" },
  { key: "hockey", label: "Hockey", short: "NHL", headline: ["NHL", "KHL", "SHL"], tile: "#DDF3FA", ink: "#0B4A5E" },
  { key: "tennis", label: "Tennis", short: "Tennis", headline: ["ATP", "WTA"], tile: "#F1F9C9", ink: "#3D4A06" },
  { key: "combat", label: "UFC & Boxing", short: "UFC", headline: ["UFC", "Boxing"], tile: "#ECE3FF", ink: "#3A1B7A" },
  { key: "esports", label: "Esports", short: "Esports", headline: ["CS2", "LoL", "Dota 2", "Valorant"], tile: "#E3E1F7", ink: "#25205C" },
  { key: "cricket", label: "Cricket", short: "Cricket", headline: ["IPL", "T20", "Test"], tile: "#E6F4D7", ink: "#2C4A0B" },
  { key: "golf", label: "Golf", short: "Golf", headline: ["PGA", "LIV"], tile: "#DFF2EC", ink: "#0B4A3A" },
  { key: "racing", label: "Racing", short: "F1", headline: ["F1", "NASCAR", "MotoGP"], tile: "#FFE9D6", ink: "#6B370B" },
  { key: "rugby", label: "Rugby", short: "Rugby", headline: ["Premiership", "NRL", "Six Nations"], tile: "#EDE7DD", ink: "#4A3A1B" },
];

export const SPORT_BY_KEY: Record<string, Sport> = Object.fromEntries(SPORTS.map((s) => [s.key, s]));

export function sportLabel(key: string): string {
  return SPORT_BY_KEY[key]?.label ?? "Other";
}

// Gamma tag ids that identify a sport (from gamma-api /tags/{id}).
const TAG_TO_SPORT: Record<string, SportKey> = {
  "1186": "football",
  "28": "basketball",
  "100350": "soccer",
  "678": "baseball",
  "100088": "hockey",
  "864": "tennis",
  "64": "esports",
  "517": "cricket",
  "100219": "golf",
  "434": "racing",
  "102193": "rugby",
};

// Explicit league codes, for leagues whose gamma tags don't carry a sport tag.
const CODE_TO_SPORT: Record<string, SportKey> = {
  nfl: "football", cfb: "football", ufl: "football", cfl: "football",
  nba: "basketball", wnba: "basketball", ncaab: "basketball", cbb: "basketball", cwbb: "basketball", euroleague: "basketball", nbasl: "basketball",
  mlb: "baseball", kbo: "baseball", npb: "baseball", ncaabaseball: "baseball", lmb: "baseball", lmp: "baseball", lidom: "baseball", lvbp: "baseball", cpbl: "baseball", wbc: "baseball",
  nhl: "hockey", khl: "hockey", shl: "hockey", ahl: "hockey", liiga: "hockey", ncaahockey: "hockey", hockeychl: "hockey", snhl: "hockey", dehl: "hockey", wch: "hockey", wjc: "hockey",
  atp: "tennis", wta: "tennis", itf: "tennis", wimbledon: "tennis", "atp-doubles": "tennis", "wta-doubles": "tennis", daviscup: "tennis", bjkcup: "tennis",
  ufc: "combat", boxing: "combat", zuffa: "combat", powerslap: "combat",
  cs2: "esports", lol: "esports", "lol-wild-rift": "esports", dota2: "esports", val: "esports", codmw: "esports", r6siege: "esports", ow: "esports", pubg: "esports", rl: "esports", mlbb: "esports", lec: "esports", lpl: "esports",
  ipl: "cricket", t20: "cricket", odi: "cricket", test: "cricket",
  pga: "golf", lpga: "golf", dpwt: "golf", liv: "golf",
  f1: "racing", nascar: "racing", "nascar-truck": "racing", "nascar-xfinity": "racing", motogp: "racing", moto2: "racing", moto3: "racing", indycar: "racing", formulae: "racing", wsbk: "racing",
};

const PREFIX_TO_SPORT: [string, SportKey][] = [
  ["cric", "cricket"],
  ["bk", "basketball"],
  ["ru", "rugby"],
];

// Title keywords for sports events whose slug has no league prefix.
const KEYWORDS: [RegExp, SportKey][] = [
  [/super bowl|\bnfl\b|heisman/i, "football"],
  [/\bnba\b|finals mvp|march madness/i, "basketball"],
  [/premier league|champions league|world cup|la liga|serie a|bundesliga|ballon d'or/i, "soccer"],
  [/world series|\bmlb\b/i, "baseball"],
  [/stanley cup|\bnhl\b/i, "hockey"],
  [/grand slam|wimbledon|us open|roland garros|australian open/i, "tennis"],
  [/\bufc\b|boxing|\bfights?\b/i, "combat"],
  [/formula 1|\bf1\b|grand prix|nascar/i, "racing"],
  [/masters|ryder cup|\bpga\b/i, "golf"],
];

/** league code -> sport, filled from gamma /sports at runtime. */
const dynamicCodes = new Map<string, SportKey>();
/** league code -> display name from gamma /sports, e.g. "swe" -> "Allsvenskan". */
const dynamicNames = new Map<string, string>();
let loadedAt = 0;

export async function loadLeagueCodes(): Promise<void> {
  if (Date.now() - loadedAt < 6 * 3600_000 && dynamicCodes.size) return;
  try {
    const res = await fetch("https://gamma-api.polymarket.com/sports", { cache: "no-store" });
    const rows = (await res.json()) as { sport: string; tags: string; name?: string }[];
    for (const r of rows) {
      const code = r.sport.toLowerCase();
      const tags = (r.tags || "").split(",");
      const fromTag = tags.map((t) => TAG_TO_SPORT[t]).find(Boolean);
      const sport = CODE_TO_SPORT[code] ?? fromTag ?? PREFIX_TO_SPORT.find(([p]) => code.startsWith(p))?.[1] ?? "other";
      dynamicCodes.set(code, sport);
      if (r.name) dynamicNames.set(code, r.name);
    }
    loadedAt = Date.now();
  } catch {
    // keep whatever we had; static tables still work for major leagues
  }
}

export function isKnownLeague(code: string): boolean {
  return dynamicCodes.has(code) || code in CODE_TO_SPORT;
}

/**
 * Resolve an event slug (and optional title) to {league, sport}.
 * Returns null when the event is not a sports event.
 */
export function classifyEvent(eventSlug: string, title = ""): { league: string; sport: SportKey } | null {
  const parts = (eventSlug || "").toLowerCase().split("-");
  for (const n of [2, 1]) {
    const code = parts.slice(0, n).join("-");
    if (!code) continue;
    const sport = dynamicCodes.get(code) ?? CODE_TO_SPORT[code];
    if (sport) return { league: code, sport };
  }
  for (const [re, sport] of KEYWORDS) if (re.test(title) || re.test(eventSlug.replace(/-/g, " "))) return { league: sport, sport };
  return null;
}

export const LEAGUE_LABELS: Record<string, string> = {
  nfl: "NFL", cfb: "College Football", nba: "NBA", wnba: "WNBA", ncaab: "NCAAB", cbb: "College Basketball", mlb: "MLB", nhl: "NHL",
  epl: "Premier League", ucl: "Champions League", lal: "La Liga", bun: "Bundesliga", sea: "Serie A", fl1: "Ligue 1", mls: "MLS", uel: "Europa League",
  fifwc: "World Cup", atp: "ATP", wta: "WTA", ufc: "UFC", boxing: "Boxing", cs2: "CS2", lol: "LoL", dota2: "Dota 2", val: "Valorant",
  ipl: "IPL", f1: "F1", nascar: "NASCAR", pga: "PGA", euroleague: "EuroLeague", kbo: "KBO", npb: "NPB", khl: "KHL",
};

export function leagueLabel(code: string): string {
  return LEAGUE_LABELS[code] ?? dynamicNames.get(code) ?? code.toUpperCase();
}
