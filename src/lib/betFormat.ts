// Turns a prediction-market question + answer into a bet-slip line the way the big bookmakers
// (Stake, Bet365, Betway, …) show it: the selection in bold, then the market, then the match.
//   "Spread: Thunder (-4.5)" + "Grizzlies"          -> Grizzlies +4.5   · Spread
//   "Will Czechia win on 2026-06-18?" + "Yes"         -> Czechia          · 1X2
//   "Will Czechia win on 2026-06-18?" + "No"          -> Draw or Brazil   · Double chance
//   "Heidenheim vs. Hannover 96: O/U 4.5" + "Under"   -> Under 4.5        · Total goals
// `eventTitle` (e.g. "Czechia vs. Brazil") names the match and the other side. `outcomeIndex` is the
// position of the answer in the market's outcome list; Polymarket always lists the team named in
// the title first, so it settles which side a handicap belongs to even when names are abbreviated.

export interface BookBet {
  /** What you'd tap at a bookmaker, e.g. "Grizzlies +4.5", "Over 2.5", "Arsenal" */
  selection: string;
  /** Bookmaker market name, e.g. "Spread", "1X2", "Total goals" */
  market: string;
  /** The match or competition, e.g. "Thunder vs Grizzlies" */
  event: string;
}

const US_SPORTS = new Set(["basketball", "football", "baseball", "hockey"]);
/** Sports where a match can end level, so "not X" means "draw or the other side". */
const DRAW_SPORTS = new Set(["soccer", "rugby", "cricket"]);

const clean = (s: string) => s.slice(0, 300).replace(/\s+/g, " ").replace(/\?$/, "").trim();
const cap = (s: string) => s.replace(/^./, (c) => c.toUpperCase());
const signed = (n: number) => (n > 0 ? `+${n}` : n < 0 ? `${n}` : "0");
/** Comparison key: accents, punctuation, "FC"-style suffixes and "and/&" differences ignored. */
const norm = (s: string) =>
  s
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .replace(/\b(?:a?fc|cf|sc)\b/g, "")
    .replace(/&/g, " and ")
    .replace(/\band\b/g, "")
    .replace(/[^\p{L}\p{N}]+/gu, "");

/** Which of `names` the outcome is: exact match first, then the single name that contains it (or vice versa). */
function matchSide(outcome: string, names: (string | null | undefined)[]): number {
  const o = norm(outcome);
  if (!o) return -1;
  const keys = names.map((n) => (n ? norm(n) : ""));
  const exact = keys.findIndex((k) => k && k === o);
  if (exact >= 0) return exact;
  const loose = keys.map((k, i) => (k && (k.includes(o) || o.includes(k)) ? i : -1)).filter((i) => i >= 0);
  return loose.length === 1 ? loose[0] : -1;
}
const same = (a: string, b: string) => matchSide(a, [b]) === 0;

const PERIOD: Record<string, string> = { "1h": "1st half", "1st half": "1st half", "first half": "1st half", "2h": "2nd half", "2nd half": "2nd half", "second half": "2nd half", "1q": "1st quarter", "2q": "2nd quarter", "3q": "3rd quarter", "4q": "4th quarter", "1st 5 innings": "1st 5 innings", "first 5 innings": "1st 5 innings" };
const period = (p?: string | null) => (p ? (PERIOD[p.toLowerCase()] ?? p.toLowerCase()) : "");
/** "1st half" + "Spread" -> "1st half spread" (proper nouns such as "Asian" keep their capital). */
const withPeriod = (p: string | undefined | null, market: string) => (period(p) ? `${period(p)} ${/^Asian/.test(market) ? market : market.replace(/^./, (c) => c.toLowerCase())}` : market);

/** The match part of a title or event name: "LoL: A vs. B (BO3) - Playoffs" -> "A vs B", "Men's Final - Canada vs. USA" -> "Canada vs USA". */
function vs(s: string) {
  const t = clean(s);
  const i = t.search(/\s+vs?\.?\s+/i);
  if (i < 0) return t;
  const pre = t.slice(0, i).replace(/^.*(?::|\s-)\s+/, "");
  const post = t
    .slice(i)
    .replace(/\s+-\s+.*$/, "")
    .replace(/:\s.*$/, "")
    .replace(/\s*\(BO\d\)/i, "")
    .replace(/\s*\([^)]*(?:weight|Main Card|Prelims)[^)]*\)$/i, "")
    .replace(/^\s+vs?\.?\s+/i, " vs ");
  return `${pre}${post}`.trim();
}
/** "Fulham FC vs. Arsenal" -> ["Fulham FC", "Arsenal"] */
function sides(s?: string | null): [string, string] | null {
  if (!s) return null;
  const m = vs(s).match(/^(.+?)\s+vs\s+(.+)$/);
  return m ? [m[1].trim(), m[2].trim()] : null;
}
/** The side of the match that isn't `team`, with its proper name. */
function opponent(team: string, eventTitle?: string | null) {
  const s = sides(eventTitle);
  if (!s) return null;
  const i = matchSide(team, s);
  return i < 0 ? null : s[1 - i];
}
/** Bookmakers write double chance home-first: "Arsenal or Draw" when the other side is home, "Draw or Hull" when away. */
function drawOr(team: string, eventTitle?: string | null) {
  const other = opponent(team, eventTitle);
  if (!other) return `Not ${team}`;
  const s = sides(eventTitle)!;
  return same(s[0], other) ? `${other} or Draw` : `Draw or ${other}`;
}
const winnerMarket = (sport?: string) => (sport === "soccer" ? "1X2" : US_SPORTS.has(sport ?? "") ? "Moneyline" : sport === "combat" ? "Fight winner" : "Match winner");
const spreadMarket = (sport?: string) => (sport === "soccer" ? "Asian handicap" : sport === "baseball" ? "Run line" : sport === "hockey" ? "Puck line" : sport === "tennis" ? "Game handicap" : sport === "esports" || sport === "rugby" ? "Handicap" : "Spread");
const totalMarket = (sport?: string) =>
  sport === "soccer" || sport === "hockey" ? "Total goals" : sport === "basketball" || sport === "football" || sport === "rugby" ? "Total points" : sport === "baseball" || sport === "cricket" ? "Total runs" : sport === "tennis" ? "Total games" : sport === "combat" ? "Total rounds" : sport === "esports" ? "Total maps" : "Total";
/** "Total Corners" / "Sets" / "Set 1 Games" / "1Q" / "Match" -> a market name. */
function statTotal(stat: string, sport?: string) {
  const s = stat.replace(/^Total\s+/i, "").trim();
  if (/^match$/i.test(s)) return totalMarket(sport);
  const p = PERIOD[s.toLowerCase()];
  if (p) return `${p} ${totalMarket(sport).toLowerCase()}`;
  const m = s.match(/^(.*?)\s*(\S+)$/);
  return m && m[1] ? `${cap(m[1])} total ${m[2].toLowerCase()}` : `Total ${s.toLowerCase()}`;
}
/** Clubs whose "FC" is part of the name a bettor knows (MLS, A-League, Asia). */
const KEEP_FC = new Set(["losangeles", "charlotte", "newyorkcity", "toronto", "austin", "sydney", "cincinnati", "dallas", "paris", "tokyo", "seoul", "goa", "eindhoven", "nashville", "stlouiscity", "orlandocity", "melbourne", "perth", "adelaide"]);
const keepName = (name: string) => /^\d+\.$/.test(name.split(" ")[0]) || KEEP_FC.has(norm(name));
/** Bookmakers drop club suffixes: "Arsenal FC" -> "Arsenal", "FC Porto" -> "Porto" (but "1. FC Köln", "Toronto FC", "FC Dallas"). */
const club = (s: string) =>
  s
    .replace(/(^|\bvs |\bor |\bNot )FC ([^\s,]+(?: [^\s,]+)?)(?=$|\s+(?:vs|or|Over|Under|or Draw)\b|\s+[+-]\d|[:,)])/g, (m, pre, name) => (KEEP_FC.has(norm(name)) || KEEP_FC.has(norm(name.split(" ")[0])) ? m : `${pre}${name}`))
    .replace(/(\S+(?: \S+)?)\s+(?:A?FC|CF)(?:\s+\d{4})?(?=$|\s+(?:vs|or|Over|Under)\b|\s+[+-]\d|[:,)])/g, (m, name: string) => (keepName(name) || KEEP_FC.has(norm(name.split(" ").slice(-1)[0])) ? m : name))
    .replace(/(^|\bvs |\bor |\bNot )FC (?=(\S+)(?: (\S+))?)/g, (m, pre, w1, w2) => (KEEP_FC.has(norm(w1)) || KEEP_FC.has(norm(`${w1} ${w2 ?? ""}`)) ? m : pre));

export function toBookmakerBet(titleRaw: string, outcomeRaw: string, eventTitle?: string | null, sport?: string, outcomeIndex?: number | null): BookBet {
  const b = translate(titleRaw, outcomeRaw, eventTitle, sport, outcomeIndex);
  return { selection: club(b.selection), market: b.market, event: club(b.event) };
}

function translate(titleRaw: string, outcomeRaw: string, eventTitle?: string | null, sport?: string, outcomeIndex?: number | null): BookBet {
  const title = clean(titleRaw);
  const outcome = clean(outcomeRaw);
  const over = /^(over|o)\b/i.test(outcome);
  const under = /^(under|u)\b/i.test(outcome);
  const yes = /^yes$/i.test(outcome) || over;
  const no = /^no$/i.test(outcome) || under;
  const ou = yes ? "Over" : "Under";
  const draw = /^(draw|tie)$/i.test(outcome);
  const threeWay = DRAW_SPORTS.has(sport ?? "soccer");
  const ev = eventTitle ? vs(eventTitle) : "";
  const evSides = sides(eventTitle);
  const idx = outcomeIndex === 0 || outcomeIndex === 1 ? outcomeIndex : null;
  let m: RegExpMatchArray | null;

  // Spread / handicap: "Spread: Thunder (-4.5)", "1H Spread: Seahawks (-10.5)", "1Q Spread: …", "1st 5 Innings Spread: …"
  if ((m = title.match(/^(1H|1st Half|2H|2nd Half|[1-4]Q|1st 5 Innings)?\s*Spread:\s*(.+?)\s*\(([-+]?\d+(?:\.\d+)?)\)$/i))) {
    const team = m[2].trim();
    const line = Number(m[3]);
    // Outcome 0 is always the team in the title. Without the index, match names (exactly first).
    const ti = evSides ? matchSide(team, evSides) : -1;
    const oi = evSides ? matchSide(outcome, evSides) : -1;
    const isTeam = idx !== null ? idx === 0 : ti >= 0 && oi >= 0 ? ti === oi : same(outcome, team);
    const other = opponent(team, eventTitle) ?? outcome;
    return { selection: isTeam ? `${team} ${signed(line)}` : `${other} ${signed(-line)}`, market: withPeriod(m[1], spreadMarket(sport)), event: ev };
  }

  // Map / game / set handicaps: "Map Handicap: FAL (-1.5) vs FaZe (+1.5)", "Game Spread: Djokovic (-2.5) vs Vacherot (+2.5)", "Map 1 Rounds Handicap: …"
  if ((m = title.match(/^(?:(Map|Game|Set)\s+(\d+)\s+)?(Map|Game|Set|Rounds?)\s+(?:Handicap|Spread):\s*(.+?)\s*\(([-+]?\d+(?:\.\d+)?)\)\s+vs\.?\s+(.+?)\s*\(([-+]?\d+(?:\.\d+)?)\)$/i))) {
    const [, per, perN, unit, a, la, b, lb] = m;
    // Outcome 0 is the first (minus) side. Title names are often abbreviated ("FAL"), so fall back to the full names in the event.
    let first = idx !== null ? idx === 0 : null;
    if (first === null) {
      const i = matchSide(outcome, [a, b]);
      first = i >= 0 ? i === 0 : evSides && matchSide(b, evSides) >= 0 ? matchSide(outcome, evSides) !== matchSide(b, evSides) : true;
    }
    const abbr = first ? a : b;
    const full = evSides && matchSide(abbr, evSides) >= 0 ? evSides[matchSide(abbr, evSides)] : evSides && matchSide(outcome, evSides) >= 0 ? evSides[matchSide(outcome, evSides)] : outcome;
    const market = per ? `${per} ${perN} ${unit.toLowerCase()} handicap` : `${unit} handicap`;
    return { selection: `${full} ${signed(Number(first ? la : lb))}`, market: cap(market), event: ev || `${a} vs ${b}` };
  }

  // Totals: "A vs. B: O/U 4.5", "A vs. B: 1st Half O/U 1.5", "A vs. B: O/U 9.5 Total Corners", "Lakers Team Total: O/U 110.5", "Stephen Curry: Points O/U 24.5"
  if ((m = title.match(/^(.+?):\s*(?:(1H|1st Half|2H|2nd Half|[1-4]Q|1st 5 Innings)\s+)?(?:(.+?)\s+)?O\/U\s*(\d+(?:\.\d+)?)(?:\s+(.+))?$/i))) {
    const [, who, per, stat, n, unit] = m;
    const sd = sides(who);
    if (unit) return { selection: `${ou} ${n}`, market: withPeriod(per, statTotal(unit, sport)), event: sd ? vs(who) : ev };
    if (sd) {
      // Something between the match and O/U: a team (team total), else a stat ("Total Sets", "Set 1 Games", "1Q", "Match").
      const t = stat?.match(/^(.+?)(?:\s+(1H|1st Half|2H|2nd Half|[1-4]Q))?$/i);
      if (t && matchSide(t[1], sd) >= 0) return { selection: `${sd[matchSide(t[1], sd)]} ${ou} ${n}`, market: withPeriod(t[2] ?? per, "Team total"), event: vs(who) };
      if (stat) return { selection: `${ou} ${n}`, market: withPeriod(per, statTotal(stat, sport)), event: vs(who) };
      return { selection: `${ou} ${n}`, market: withPeriod(per, totalMarket(sport)), event: vs(who) };
    }
    const tt = who.match(/^(.+?)(?:\s+(1H|2H|1st Half|2nd Half|[1-4]Q))?\s+Team Total$/i);
    if (tt) return { selection: `${tt[1]} ${ou} ${n}`, market: withPeriod(tt[2] ?? per, "Team total"), event: ev };
    if (/^Games Total$/i.test(who.trim())) return { selection: `${ou} ${n}`, market: /\b(LoL|Dota|League of Legends)\b/i.test(eventTitle ?? "") ? "Total games" : "Total maps", event: ev };
    // "Cardinals Total Touchdowns: O/U 1.5" (team stat) vs "Stephen Curry: Points O/U 24.5" (player stat)
    const teamStat = who.match(/^(.+?)\s+(Total\s+.+)$/i);
    if (teamStat && evSides && matchSide(teamStat[1], evSides) >= 0) return { selection: `${teamStat[1]} ${ou} ${n}`, market: `Team ${teamStat[2].toLowerCase()}`, event: ev };
    return { selection: `${who.trim()} ${ou} ${n}`, market: `Player ${(stat ?? "points").toLowerCase()}`, event: ev };
  }

  // "Map 1 Total Rounds: Over/Under 21.5", "Total Kills Over/Under 27.5 in Game 4", "O/U 1.5 Rounds"
  if ((m = title.match(/^(?:(Game|Map)\s+(\d+)\s+)?Total\s+(\w+):?\s+Over\/Under\s+(\d+(?:\.\d+)?)(?:\s+in\s+(Game|Map)\s+(\d+))?$/i))) {
    const per = m[1] ? `${m[1]} ${m[2]}` : m[5] ? `${m[5]} ${m[6]}` : "";
    return { selection: `${ou} ${m[4]}`, market: cap(`${per ? `${per.toLowerCase()} ` : ""}total ${m[3].toLowerCase()}`), event: ev };
  }
  if ((m = title.match(/^O\/U\s*(\d+(?:\.\d+)?)\s+(\w+)$/i))) return { selection: `${ou} ${m[1]}`, market: `Total ${m[2].toLowerCase()}`, event: ev };

  // Both teams to score (incl. first / second half)
  if ((m = title.match(/^(.+?):\s*(?:(1st Half|2nd Half|First Half|Second Half)\s+)?Both Teams to Score(?:\s+in\s+(First|Second) Half)?$/i))) {
    const half = m[2] ?? (m[3] ? `${m[3]} Half` : "");
    return { selection: yes ? "Yes" : "No", market: withPeriod(half, "Both teams to score"), event: vs(m[1]) };
  }

  // Correct score: "Exact Score: Hamburger SV 3 - 1 Borussia Mönchengladbach"
  if ((m = title.match(/^Exact Score:\s*(.+?)\s+(\d+)\s*-\s*(\d+)\s+(.+)$/i))) {
    const [, a, x, y, b] = m;
    return { selection: yes ? `${x}-${y}` : `Not ${x}-${y}`, market: "Correct score", event: `${a} vs ${b}` };
  }
  if (/^Exact Score:\s*Any Other Score$/i.test(title)) return { selection: yes ? "Any other score" : "Not any other score", market: "Correct score", event: ev };
  if ((m = title.match(/^Exact Margin:\s*(.+)$/i))) return { selection: yes ? m[1] : `Not ${m[1]}`, market: "Winning margin", event: ev };

  // Half-time result: "Fulham FC leading at halftime", "A vs. B: Draw at halftime"; second half: "X to win the second half", "A vs. B: Second half draw"
  if ((m = title.match(/^(.+?)\s+leading at half-?time$/i))) {
    const team = m[1].trim();
    if (yes) return { selection: team, market: "Half-time result", event: ev };
    return threeWay ? { selection: drawOr(team, eventTitle), market: "Half-time double chance", event: ev } : { selection: opponent(team, eventTitle) ?? `Not ${team}`, market: "Half-time result", event: ev };
  }
  if ((m = title.match(/^(.+?):\s*Draw at half-?time$/i))) {
    const s = sides(m[1]);
    return yes || !s ? { selection: yes ? "Draw" : "No draw", market: "Half-time result", event: vs(m[1]) } : { selection: `${s[0]} or ${s[1]}`, market: "Half-time double chance", event: vs(m[1]) };
  }
  if ((m = title.match(/^(.+?)\s+to win the (first|second) half$/i))) {
    const team = m[1].trim();
    const mk = `${m[2].toLowerCase() === "first" ? "1st" : "2nd"} half`;
    if (yes) return { selection: team, market: `${mk} result`, event: ev };
    return threeWay ? { selection: drawOr(team, eventTitle), market: `${mk} double chance`, event: ev } : { selection: opponent(team, eventTitle) ?? `Not ${team}`, market: `${mk} result`, event: ev };
  }
  if ((m = title.match(/^(.+?):\s*(first|second) half draw$/i))) {
    const s = sides(m[1]);
    const mk = `${m[2].toLowerCase() === "first" ? "1st" : "2nd"} half`;
    return yes || !s ? { selection: yes ? "Draw" : "No draw", market: `${mk} result`, event: vs(m[1]) } : { selection: `${s[0]} or ${s[1]}`, market: `${mk} double chance`, event: vs(m[1]) };
  }

  // First to score: "Arsenal to score first vs. Hull", "A vs. B: Neither team to score first"
  if ((m = title.match(/^(.+?)\s+to score first(?:\s+vs\.?\s+(.+))?$/i))) {
    return { selection: yes ? m[1] : `Not ${m[1]}`, market: "First team to score", event: m[2] ? `${m[1]} vs ${m[2]}` : ev };
  }
  if ((m = title.match(/^(.+?):\s*Neither team to score first$/i))) return { selection: yes ? "No goal" : "A goal", market: "First team to score", event: vs(m[1]) };

  // Baseball: "Yankees winning after 5 innings", "Tied after 5 innings", NRFI "Will there be a run scored in the first inning?: A vs. B"
  if ((m = title.match(/^(.+?)\s+winning after 5 innings$/i))) return { selection: yes ? m[1] : `Not ${m[1]}`, market: "1st 5 innings result", event: ev };
  if (/^Tied after 5 innings$/i.test(title)) return { selection: yes ? "Tie" : "No tie", market: "1st 5 innings result", event: ev };
  if ((m = title.match(/^Will there be a run scored in the first inning\??:?\s*(.*)$/i))) return { selection: yes ? "Yes" : "No", market: "Run in the 1st inning", event: m[1] ? vs(m[1]) : ev };

  // Draw: "Will AEK vs. Real Madrid CF end in a draw", "Will the match end in a draw"
  if ((m = title.match(/^Will\s+(.+?)\s+vs\.?\s+(.+?)\s+end in a (?:draw|tie)$/i))) {
    const [, a, b] = m;
    return yes ? { selection: "Draw", market: winnerMarket(sport), event: `${a} vs ${b}` } : { selection: `${a} or ${b}`, market: "Double chance", event: `${a} vs ${b}` };
  }
  if (/^Will\s+(?:the\s+)?(?:match|game|fight)\s+end in a (?:draw|tie)$/i.test(title)) {
    const tie = sport === "soccer" ? "Draw" : "Tie";
    return yes || !evSides ? { selection: yes ? tie : `No ${tie.toLowerCase()}`, market: winnerMarket(sport), event: ev } : { selection: `${evSides[0]} or ${evSides[1]}`, market: "Double chance", event: ev };
  }

  // Match result: "Will Czechia win on 2026-06-18", "Will Afghanistan win"
  if ((m = title.match(/^Will\s+(?:the\s+)?(.+?)\s+win(?:\s+on\s+\d{4}-\d{2}-\d{2})?$/i))) {
    const team = m[1].trim();
    if (yes) return { selection: team, market: winnerMarket(sport), event: ev };
    return threeWay ? { selection: drawOr(team, eventTitle), market: "Double chance", event: ev } : { selection: opponent(team, eventTitle) ?? `Not ${team}`, market: winnerMarket(sport), event: ev };
  }

  // Game / map / set winner (esports, tennis): "LoL: A vs B - Game 2 Winner", "Set 1 Winner: Shelton vs Paul"
  if ((m = title.match(/^(?:[^:]+:\s*)?(.+?)\s+vs\.?\s+(.+?)\s+-\s+(Game|Map|Set)\s+(\d+)\s+Winner$/i))) {
    return { selection: outcome, market: `${m[3]} ${m[4]} winner`, event: `${m[1]} vs ${m[2]}` };
  }
  if ((m = title.match(/^(Game|Map|Set)\s+(\d+)\s+Winner:\s*(.+)$/i))) return { selection: outcome, market: `${m[1]} ${m[2]} winner`, event: vs(m[3]) };

  // Scorers: "Derrick Henry: Anytime Touchdown", "Lionel Messi: 2+ goals"
  if ((m = title.match(/^(.+?):\s*Anytime (Touchdown|Goalscorer|Scorer|TD)$/i))) {
    const td = /touch|td/i.test(m[2]);
    return { selection: yes ? m[1] : `${m[1]} – No`, market: td ? "Anytime touchdown scorer" : "Anytime goalscorer", event: ev };
  }
  if ((m = title.match(/^(.+?):\s*(\d+)\+\s+(\p{L}+)$/iu))) {
    return { selection: yes ? m[1] : `${m[1]} – No`, market: m[2] === "1" && /goal/i.test(m[3]) ? "Anytime goalscorer" : `To score ${m[2]}+ ${m[3].toLowerCase()}`, event: ev };
  }

  // Match sub-markets with a side as the answer: "France vs. Spain: Team to Advance", "Jaguars vs. Ravens: 1H Moneyline", "A vs B - Who wins the toss?"
  if (!yes && !no && (m = title.match(/^(.+?\s+vs\.?\s+[^:]+?)(?::\s*|\s+-\s+)([^:]+)$/i)) && sides(m[1]) && !/\s+vs\.?\s+/i.test(m[2])) {
    const s = sides(m[1])!;
    const i = idx ?? matchSide(outcome, s);
    const name = draw ? "Draw" : i >= 0 ? s[i] : outcome;
    const sub = m[2].trim();
    const match = `${s[0]} vs ${s[1]}`;
    if (/^Team to Advance$/i.test(sub)) return { selection: name, market: "To qualify", event: match };
    if (/toss/i.test(sub)) return { selection: name, market: "Toss winner", event: match };
    const per = sub.match(/^(1H|1st Half|2H|2nd Half|[1-4]Q|1st 5 Innings)\s+(Moneyline|Winner|Result)$/i);
    if (per) return { selection: name, market: withPeriod(per[1], winnerMarket(sport)), event: match };
    if (/^(More Markets|Exact Score|Halftime Result|Player Props)$/i.test(sub) || /\b(Playoffs?|Group|Stage|Season|Final|Round|Week|Championship|Cup|Open|Masters|Invitational|Qualifier)\b/i.test(sub)) return { selection: name, market: winnerMarket(sport), event: match };
    return { selection: name, market: cap(sub), event: match };
  }

  // Match winner: "76ers vs. Bulls", "Chennai Open: A vs B", "UFC 329: A vs. B (Welterweight, Main Card)" — the answer is a side, not Yes/No
  if (!yes && !no && sides(title)) {
    const s = sides(title)!;
    const i = idx ?? matchSide(outcome, s);
    return { selection: draw ? "Draw" : i >= 0 ? s[i] : outcome, market: winnerMarket(sport), event: `${s[0]} vs ${s[1]}` };
  }

  // Season series: "Will the Eagles win the season series against the Commanders during …", "Will the season series between A and B end in a tie …"
  if ((m = title.match(/^Will\s+(?:the\s+)?(.+?)\s+win the season series against\s+(?:the\s+)?(.+?)(?:\s+(?:during|in)\s+.*)?$/i))) {
    return { selection: no ? `${m[2]} or tie` : m[1], market: "Season series", event: `${m[1]} vs ${m[2]}` };
  }
  if ((m = title.match(/^Will\s+the season series between\s+(?:the\s+)?(.+?)\s+and\s+(?:the\s+)?(.+?)\s+end in a tie\b.*$/i))) {
    return { selection: yes ? "Tie" : "No tie", market: "Season series", event: `${m[1]} vs ${m[2]}` };
  }

  // Season win totals: "Will the Ravens have more than 12.5 wins during the 2026 NFL season", "Will the Chargers win more than 10.5 games in …"
  if ((m = title.match(/^Will\s+(?:the\s+)?(.+?)\s+(?:have|win|record)\s+(?:more than|over|at least)\s+(\d+(?:\.\d+)?)\s+(?:wins|games)\s+(?:during|in)\s+(?:the\s+)?(.+)$/i))) {
    return { selection: `${m[1]} ${ou} ${m[2]} wins`, market: "Season wins", event: cap(m[3]) };
  }
  // Season player stats: "Will Terry McLaurin have 749.5+ receiving yards in the 2026-27 NFL regular season", "Will Anze Kopitar record 100+ points"
  if ((m = title.match(/^Will\s+(?:the\s+)?(.+?)\s+(?:have|record|throw|rush for|catch|score)\s+(\d[\d,]*(?:\.\d+)?)\+\s+([\p{L} ]+?)(?:\s+(?:in|during)\s+(?:the\s+)?(.+))?$/iu))) {
    const [, who, n, stat, season] = m;
    const line = n.includes(".") ? `${ou} ${n}` : yes ? `${n}+` : `Under ${n}`;
    return { selection: `${who} ${line}`, market: `Season ${stat.toLowerCase()}`, event: season ? cap(season) : ev };
  }
  // Season leaders: "Will Jahmyr Gibbs finish the 2026-27 NFL regular season with the most rushing touchdowns", "Will X record the most clean sheets in …"
  if ((m = title.match(/^Will\s+(.+?)\s+(?:finish|end)\s+(?:the\s+)?(.+?)\s+with the most\s+(.+)$/i))) {
    return { selection: no ? `${m[1]} not to win` : m[1], market: `Most ${m[3].toLowerCase()}`, event: cap(m[2]) };
  }
  if ((m = title.match(/^Will\s+(.+?)\s+(?:record|score|have|make)\s+the most\s+(.+?)(?:\s+in\s+(?:the\s+)?(.+))?$/i))) {
    return { selection: no ? `${m[1]} not to win` : m[1], market: `Most ${m[2].toLowerCase()}`, event: m[3] ? cap(m[3]) : ev };
  }
  // "Will the Mavericks make the 2027 NBA Playoffs", "Will Inter reach the 2027 UCL semifinal", "Will the Mets advance to the World Series in the 2027 MLB Playoffs"
  if ((m = title.match(/^Will\s+(?:the\s+)?(.+?)\s+(make|reach|advance to|qualify for)\s+(?:the\s+)?(.+?)(?:\s+(?:in|at|of(?!\s+\d))\s+(?:the\s+)?(.+))?$/i))) {
    const [, who, verb, what, where] = m;
    const stage = what.match(/^(.*?\S)\s+(playoffs?|play-in(?: tournament)?|quarter-?finals?|semi-?finals?|finals?|round of \d+|second round|third round|first round|divisional round|conference finals?|knockout stage|league phase)$/i);
    const v = verb.toLowerCase() === "advance to" ? "reach" : verb.toLowerCase();
    return { selection: no ? `${who} – No` : who, market: cap(`To ${v} the ${stage ? stage[2].toLowerCase() : what}`), event: where ? cap(where) : stage ? cap(what) : ev };
  }
  // Relegation / promotion / league position: "Will Burnley be relegated from the 2026-27 Premier League", "Will Spurs finish in the top 4 of the … season"
  if ((m = title.match(/^Will\s+(?:the\s+)?(.+?)\s+(be relegated|be promoted|finish(?: in)? (?:the )?top \d+|finish \d+(?:st|nd|rd|th)(?:-\d+(?:st|nd|rd|th))?|finish first|finish last|finish as (?:the )?runner-up|finish as a top-\d+ \w+)(?:\s+(?:from|of|in|to)\s+(?:the\s+)?(.+))?$/i))) {
    return { selection: no ? `${m[1]} – No` : m[1], market: `To ${m[2].replace(/^./, (c) => c.toLowerCase())}`, event: m[3] ? cap(m[3]) : ev };
  }
  // Next team: "Will Russell Westbrook play for the Boston Celtics in 2026-27"
  if ((m = title.match(/^Will\s+(.+?)\s+(?:play for|sign with|join)\s+(?:the\s+)?(.+?)(?:\s+(?:in|during|before)\s+(.+))?$/i))) {
    return { selection: no ? `${m[2]} – No` : m[2], market: `Next team: ${m[1]}`, event: m[3] ? cap(m[3]) : ev };
  }

  // Outrights: "Will the Spurs win the 2027 NBA Finals" -> Spurs · Outright · 2027 NBA Finals
  if ((m = title.match(/^Will\s+(?:the\s+)?(.+?)\s+(?:win|be)\s+(?:the\s+)?(.*\b(?:champions?|finals?|cup|title|league|world series|bowl|award|mvp|trophy|tournament|open|masters|grand prix|championship|premiership|serie a|bundesliga|liga|ligue|worlds|of the year|golden boot|top scorer|wimbledon|copa|division|conference)\b.*)$/i)) && !/\b(opening|opener)\b/i.test(m[2])) {
    const [, who, comp] = m;
    return { selection: no ? `${cap(who)} not to win` : cap(who), market: "Outright", event: cap(comp.replace(/^(the\s+)/i, "").replace(/\s+award\b.*$/i, "")) };
  }

  // Other specials: "Will X be the first WR to 1,000 receiving yards in …" -> X · To be the first WR to 1,000 receiving yards · 2026-27 NFL regular season
  if ((m = title.match(/^Will\s+(?:the\s+)?(?!there\b)(.+?)\s+(win|be|make|finish|have|qualify|reach|score|get|lead|record|throw|rush|catch|play|advance|go|beat|cover|top|end|claim|earn|receive|hit|post|average|surpass|exceed)\b\s*(.*)$/i))) {
    const [, who, verb, rest] = m;
    const split = rest.match(/^(.*?)\s+(?:during|in|at|for)\s+(?:the\s+)?((?:19|20)\d\d.*|.*(?:season|playoffs|tournament|cup|league).*)$/i);
    const what = split ? split[1] : rest;
    return { selection: no ? `${cap(who)} – No` : cap(who), market: cap(`To ${verb.toLowerCase()}${what ? ` ${what}` : ""}`), event: split ? cap(split[2]) : ev };
  }

  // Anything else: the question is the market, the answer is the selection (like a bookmaker "special").
  return { selection: cap(outcome), market: cap(title), event: ev };
}

/** One-line version for compact places: "Grizzlies +4.5 · Spread" */
export function betLine(b: BookBet) {
  return `${b.selection} · ${b.market}`;
}
