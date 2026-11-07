// Turns a prediction-market question + answer into a bet-slip line the way the big bookmakers
// (Stake, Bet365, Betway, …) show it: the selection in bold, then the market, then the match.
//   "Spread: Thunder (-4.5)" + "Grizzlies"          -> Grizzlies +4.5   · Spread
//   "Will Czechia win on 2026-06-18?" + "Yes"         -> Czechia          · 1X2
//   "Will Czechia win on 2026-06-18?" + "No"          -> Draw or Brazil   · Double chance
//   "Heidenheim vs. Hannover 96: O/U 4.5" + "Under"   -> Under 4.5        · Total goals
// `eventTitle` (e.g. "Czechia vs. Brazil") names the match and the other side.

export interface BookBet {
  /** What you'd tap at a bookmaker, e.g. "Grizzlies +4.5", "Over 2.5", "Arsenal" */
  selection: string;
  /** Bookmaker market name, e.g. "Spread", "1X2", "Total goals" */
  market: string;
  /** The match or competition, e.g. "Thunder vs Grizzlies" */
  event: string;
}

const YES = /^yes$/i;
const NO = /^no$/i;
const US_SPORTS = new Set(["basketball", "football", "baseball", "hockey"]);

const clean = (s: string) => s.replace(/\s+/g, " ").replace(/\?$/, "").trim();
/** "LoL: A vs. B (BO3) - Playoffs" -> "A vs B" */
const vs = (s: string) =>
  clean(s)
    .replace(/^[^:]+:\s*(?=.+\s+vs\.?\s)/i, "")
    .replace(/^(?:Pro Football|Pro Basketball|College Football|College Basketball|Soccer|Hockey|Baseball):\s*/i, "")
    .replace(/\s+-\s+.*$/, "")
    .replace(/\s*\(BO\d\)/i, "")
    .replace(/\s+vs\.?\s+/i, " vs ")
    .trim();
const signed = (n: number) => (n > 0 ? `+${n}` : `${n}`);
const half = (h?: string) => (!h ? "" : /^(1H|1st)/i.test(h) ? "1st half " : "2nd half ");
const cap = (s: string) => s.replace(/^./, (c) => c.toUpperCase());

/** "Fulham FC vs. Arsenal" -> ["Fulham FC", "Arsenal"] */
function sides(s?: string | null): [string, string] | null {
  if (!s) return null;
  const m = clean(s).match(/^(?:[^:]+:\s*)?(.+?)\s+vs\.?\s+(.+?)(?:\s+-\s+.*)?$/i);
  return m ? [m[1].replace(/\s*\(BO\d\)/i, "").trim(), m[2].replace(/\s*\(BO\d\)/i, "").trim()] : null;
}
const same = (a: string, b: string) => a.toLowerCase().includes(b.toLowerCase()) || b.toLowerCase().includes(a.toLowerCase());
/** The side of the match that isn't `team`. */
function opponent(team: string, eventTitle?: string | null) {
  const s = sides(eventTitle);
  if (!s) return null;
  return same(s[0], team) ? s[1] : same(s[1], team) ? s[0] : null;
}
/** Bookmakers list the match winner as "1X2" in soccer, "Moneyline" in US sports, "Match winner" elsewhere. */
const winnerMarket = (sport?: string) => (sport === "soccer" ? "1X2" : US_SPORTS.has(sport ?? "") ? "Moneyline" : "Match winner");
const totalMarket = (sport?: string) =>
  sport === "soccer" || sport === "hockey" ? "Total goals" : sport === "basketball" || sport === "football" || sport === "rugby" ? "Total points" : sport === "baseball" ? "Total runs" : sport === "tennis" ? "Total games" : "Total";

/** Bookmakers drop club suffixes: "Arsenal FC" -> "Arsenal", "FC Porto" -> "Porto" (but keep "1. FC Köln"). */
const club = (s: string) =>
  s
    .replace(/\s+(?:A?FC|CF)(?=$|\s+(?:vs|or|Over|Under)\b|\s+[+-]\d)/g, "")
    .replace(/(^|\bvs |\bor )FC (?=\S)/g, "$1");

export function toBookmakerBet(titleRaw: string, outcomeRaw: string, eventTitle?: string | null, sport?: string): BookBet {
  const b = translate(titleRaw, outcomeRaw, eventTitle, sport);
  return { selection: club(b.selection), market: b.market, event: club(b.event) };
}

function translate(titleRaw: string, outcomeRaw: string, eventTitle?: string | null, sport?: string): BookBet {
  const title = clean(titleRaw);
  const outcome = clean(outcomeRaw);
  const yes = YES.test(outcome);
  const no = NO.test(outcome);
  const ev = eventTitle ? vs(eventTitle) : "";
  let m: RegExpMatchArray | null;

  // Spread / handicap: "Spread: Thunder (-4.5)", "1H Spread: Seahawks (-10.5)"
  if ((m = title.match(/^(1H|1st Half|2H|2nd Half)?\s*Spread:\s*(.+?)\s*\(([-+]?\d+(?:\.\d+)?)\)$/i))) {
    const team = m[2].trim();
    const line = Number(m[3]);
    const pick = same(outcome, team) ? `${team} ${signed(line)}` : `${outcome} ${signed(-line)}`;
    const name = sport === "soccer" ? "Asian handicap" : sport === "baseball" ? "Run line" : sport === "hockey" ? "Puck line" : "Spread";
    return { selection: pick, market: cap(`${half(m[1])}${half(m[1]) ? name.toLowerCase() : name}`), event: ev };
  }

  // Totals: "A vs. B: O/U 4.5", "A vs. B: 1st Half O/U 1.5", "Lakers Team Total: O/U 110.5", "Stephen Curry: Points O/U 24.5"
  if ((m = title.match(/^(.+?):\s*(?:(1H|1st Half|2H|2nd Half)\s+)?(?:(.+?)\s+)?O\/U\s*(\d+(?:\.\d+)?)$/i))) {
    const [, who, h, stat, n] = m;
    const side = /^over$/i.test(outcome) || yes ? "Over" : "Under";
    if (sides(who)) {
      // "A vs. B: B 1st Half O/U 0.5" is a team total inside the match title.
      const team = stat?.match(/^(.+?)(?:\s+(1H|1st Half|2H|2nd Half))?$/i);
      if (team) return { selection: `${team[1]} ${side} ${n}`, market: cap(`${half(team[2] ?? h)}team total`), event: vs(who) };
      return { selection: `${side} ${n}`, market: cap(`${half(h)}${totalMarket(sport).toLowerCase()}`), event: vs(who) };
    }
    const tt = who.match(/^(.+?)\s+Team Total$/i);
    if (tt) return { selection: `${tt[1]} ${side} ${n}`, market: "Team total", event: ev };
    if (/^Games Total$/i.test(who.trim())) return { selection: `${side} ${n}`, market: "Total maps", event: ev };
    const s = (stat ?? "points").toLowerCase();
    return { selection: `${who.trim()} ${side} ${n}`, market: `Player ${s}`, event: ev };
  }

  // Both teams to score
  if ((m = title.match(/^(.+?):\s*Both Teams to Score$/i))) {
    return { selection: yes ? "Yes" : "No", market: "Both teams to score", event: vs(m[1]) };
  }

  // Correct score: "Exact Score: Hamburger SV 3 - 1 Borussia Mönchengladbach"
  if ((m = title.match(/^Exact Score:\s*(.+?)\s+(\d+)\s*-\s*(\d+)\s+(.+)$/i))) {
    const [, a, x, y, b] = m;
    return { selection: yes ? `${x}-${y}` : `Not ${x}-${y}`, market: "Correct score", event: `${a} vs ${b}` };
  }
  if (/^Exact Score:\s*Any Other Score$/i.test(title)) {
    return { selection: yes ? "Any other score" : "Not any other score", market: "Correct score", event: ev };
  }

  // Half-time result: "Fulham FC leading at halftime", "A vs. B: Draw at halftime"
  if ((m = title.match(/^(.+?)\s+leading at half-?time$/i))) {
    const team = m[1].trim();
    if (yes) return { selection: team, market: "Half-time result", event: ev };
    const other = opponent(team, eventTitle);
    return { selection: other ? `Draw or ${other}` : `Not ${team}`, market: "Half-time double chance", event: ev };
  }
  if ((m = title.match(/^(.+?):\s*Draw at half-?time$/i))) {
    const s = sides(m[1]);
    return yes || !s ? { selection: yes ? "Draw" : "No draw", market: "Half-time result", event: vs(m[1]) } : { selection: `${s[0]} or ${s[1]}`, market: "Half-time double chance", event: vs(m[1]) };
  }

  // Draw: "Will AEK vs. Real Madrid CF end in a draw"
  if ((m = title.match(/^Will\s+(.+?)\s+vs\.?\s+(.+?)\s+end in a draw$/i))) {
    const [, a, b] = m;
    return yes ? { selection: "Draw", market: "1X2", event: `${a} vs ${b}` } : { selection: `${a} or ${b}`, market: "Double chance", event: `${a} vs ${b}` };
  }

  // Match result: "Will Czechia win on 2026-06-18"
  if ((m = title.match(/^Will\s+(?:the\s+)?(.+?)\s+win on\s+\d{4}-\d{2}-\d{2}$/i))) {
    const team = m[1].trim();
    if (yes) return { selection: team, market: "1X2", event: ev };
    const other = opponent(team, eventTitle);
    return { selection: other ? `Draw or ${other}` : `Not ${team}`, market: "Double chance", event: ev };
  }

  // Game / map winner (esports): "LoL: Dplus KIA vs Bilibili Gaming - Game 2 Winner"
  if ((m = title.match(/^(?:[^:]+:\s*)?(.+?)\s+vs\.?\s+(.+?)\s+-\s+(Game|Map)\s+(\d+)\s+Winner$/i))) {
    return { selection: outcome, market: `${m[3]} ${m[4]} winner`, event: `${m[1]} vs ${m[2]}` };
  }

  // "Total Kills Over/Under 27.5 in Game 4"
  if ((m = title.match(/^Total (\w+) Over\/Under (\d+(?:\.\d+)?) in (Game|Map) (\d+)$/i))) {
    const side = /^over$/i.test(outcome) || yes ? "Over" : "Under";
    return { selection: `${side} ${m[2]}`, market: `${m[3]} ${m[4]} total ${m[1].toLowerCase()}`, event: ev };
  }

  // Scorers: "Derrick Henry: Anytime Touchdown", "Lionel Messi: 2+ goals"
  if ((m = title.match(/^(.+?):\s*Anytime (Touchdown|Goalscorer|Scorer|TD)$/i))) {
    const td = /touch|td/i.test(m[2]);
    return { selection: yes ? m[1] : `${m[1]} - No`, market: td ? "Anytime touchdown scorer" : "Anytime goalscorer", event: ev };
  }
  if ((m = title.match(/^(.+?):\s*(\d+)\+\s+(\w+)$/i))) {
    const what = m[3].toLowerCase();
    return { selection: yes ? m[1] : `${m[1]} - No`, market: `To score ${m[2]}+ ${what}`, event: ev };
  }

  // Match winner: "76ers vs. Bulls", "Chennai Open: A vs B" — the answer is a side, not Yes/No
  if (!yes && !no && sides(title)) {
    const s = sides(title)!;
    return { selection: /^draw$/i.test(outcome) ? "Draw" : outcome, market: winnerMarket(sport), event: `${s[0]} vs ${s[1]}` };
  }

  // Outrights: "Will the Spurs win the 2027 NBA Finals" -> Spurs · Outright · 2027 NBA Finals
  if ((m = title.match(/^Will\s+(?:the\s+)?(.+?)\s+(?:win|be)\s+(?:the\s+)?(.*(?:champion|finals|cup|title|league|series|bowl|award|mvp|trophy|tournament|open|masters|grand prix|championship|premiership|serie a|bundesliga|liga|ligue).*)$/i))) {
    const [, who, comp] = m;
    const event = cap(comp.replace(/^(the\s+)/i, ""));
    return { selection: yes ? who : `${who} - No`, market: "Outright", event };
  }

  // Specials: "Will the Chiefs make the playoffs", "Will X finish as a top-12 WR"
  if ((m = title.match(/^Will\s+(?:the\s+)?(.+?)\s+(win|be|make|finish|have|qualify|reach|score|get|lead|record|throw|rush|catch|play|advance|go|beat|cover|top|end|claim|earn|receive|hit|post|average|surpass|exceed)\b\s*(.*)$/i))) {
    const [, who, verb, rest] = m;
    const what = `${verb.toLowerCase()}${rest ? ` ${rest}` : ""}`;
    return { selection: no ? `${who} not to ${what}` : `${who} to ${what}`, market: "Specials", event: ev };
  }

  // Anything else: the question is the market, the answer is the selection (like a bookmaker "special").
  return { selection: yes || no ? `${title}: ${outcome}` : outcome, market: yes || no ? "Specials" : title, event: ev };
}

/** One-line version for compact places: "Grizzlies +4.5 · Spread" */
export function betLine(b: BookBet) {
  return `${b.selection} · ${b.market}`;
}
