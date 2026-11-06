import { Nav } from "@/components/landing/Nav";
import { Ribbons } from "@/components/landing/Ribbons";
import { HeroPhone } from "@/components/landing/HeroPhone";
import { Showcase } from "@/components/landing/Showcase";
import { ArtAlerts, ArtBigWin, ArtFollow, ArtLeaderboard, ArtMarkets, ArtSlip, ArtSplit, ArtSpeed } from "@/components/landing/CardArt";
import { InlineMascot, Mascot } from "@/components/Mascot";
import { LeagueMarquee, RisingMascot, RollingNumber, StatStory, WordReveal } from "@/components/landing/ScrollFx";
import { BucketQuiz } from "@/components/landing/BucketQuiz";
import { Faq } from "@/components/landing/Faq";
import { Reveal } from "@/components/ui/Reveal";
import { ButtonLink } from "@/components/ui/Button";
import { Logo } from "@/components/Logo";
import { SportIcon } from "@/components/SportIcon";
import { getLandingData } from "@/lib/server/landing";
import { formatPct, formatUsd } from "@/lib/filters";
import { sportLabel } from "@/lib/sports";

export const dynamic = "force-dynamic";

function Eyebrow({ children, tone = "white" }: { children: React.ReactNode; tone?: "white" | "glass" }) {
  return <span className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-[15px] font-medium ${tone === "glass" ? "bg-white/70 text-ink backdrop-blur" : "bg-white text-ink shadow-[0_2px_12px_rgba(16,23,58,.06)]"}`}>{children}</span>;
}

function Check({ on = "brand" }: { on?: "brand" | "lime" | "white" }) {
  const bg = on === "lime" ? "bg-lime" : on === "white" ? "bg-white" : "bg-brand-soft";
  const stroke = on === "brand" ? "#1652f0" : on === "white" ? "#1652f0" : "#10173a";
  return (
    <span className={`mt-1 flex h-5 w-5 shrink-0 items-center justify-center rounded-full ${bg}`}>
      <svg width="10" height="10" viewBox="0 0 16 16" aria-hidden>
        <path d="M3.5 8.5l3 3 6-7" stroke={stroke} strokeWidth="2.8" fill="none" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </span>
  );
}

export default async function Landing() {
  const d = await getLandingData();

  return (
    <main className="overflow-x-clip">
      <Nav />

      {/* ── Hero ── Rule 1: the highest need (winning, money, being good at this), not features. Rule 2: label the reader. */}
      <section className="px-3 pt-[76px] sm:px-8 sm:pt-[96px]">
        <div className="relative mx-auto max-w-[1200px] overflow-hidden rounded-[32px] bg-[linear-gradient(160deg,#e3eaff_0%,#f3f6ff_55%,#e8eeff_100%)] sm:rounded-[40px]">
          <Ribbons faint />
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_30%_40%,rgba(255,255,255,.85)_0%,rgba(255,255,255,.55)_40%,rgba(255,255,255,0)_75%)]" />
          <div className="relative grid items-center gap-12 px-6 pt-14 pb-12 sm:px-12 sm:pt-20 lg:grid-cols-[1.15fr_1fr] lg:pb-16">
            <div className="text-center lg:text-left">
              <Reveal>
                <Eyebrow tone="glass">For bettors who play to win</Eyebrow>
              </Reveal>
              <Reveal delay={0.08}>
                <h1 className="display mt-5 text-[50px] sm:text-[84px] lg:text-[96px]">
                  Start winning
                  <br />
                  your bets.
                </h1>
              </Reveal>
              <Reveal delay={0.16}>
                <p className="mx-auto mt-5 max-w-[520px] text-[16px] leading-[1.5] text-ink-2 sm:mt-6 sm:text-[21px] sm:leading-relaxed lg:mx-0">
                  Follow the best sports bettors in the world. Bet what they bet, the second they bet it, and start turning the games you watch into profit.
                </p>
              </Reveal>
              <Reveal delay={0.24}>
                <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row sm:justify-center lg:justify-start">
                  <ButtonLink href="/app" variant="brand" size="lg" className="w-full sm:w-auto">
                    Start winning
                  </ButtonLink>
                  <ButtonLink href="/app?sort=profit" variant="light" size="lg" className="w-full sm:w-auto">
                    See who&apos;s winning today
                  </ButtonLink>
                </div>
                <p className="mt-4 text-[14px] text-ink-3">Free to start · No card · Works with any bookmaker</p>
              </Reveal>
            </div>
            <Reveal delay={0.2} y={60}>
              <HeroPhone bettors={d.phone.bettors} alert={d.phone.alert} compare={d.phone.compare} />
            </Reveal>
          </div>
        </div>
      </section>

      {/* ── Proof: real numbers only ── */}
      <section className="px-4 pt-6 sm:px-8">
        <div className="mx-auto grid max-w-[1200px] grid-cols-3 gap-2 sm:gap-3">
          {[
            { k: d.topProfit30d ? `+${formatUsd(d.topProfit30d)}` : "—", v: "won this month by our #1 bettor", win: true },
            { k: d.tracked ? d.tracked.toLocaleString("en-US") : "—", v: "top bettors you can follow" },
            { k: "Seconds", v: "from their bet to your phone" },
          ].map((x) => (
            <Reveal key={x.v} className="rounded-[24px] bg-white p-4 text-center sm:p-6">
              <div className={`display num text-[24px] sm:text-[44px] ${x.win ? "text-win" : ""}`}>{x.k}</div>
              <div className="mt-1 text-[12.5px] leading-tight text-ink-2 sm:text-[16px]">{x.v}</div>
            </Reveal>
          ))}
        </div>
      </section>

      {/* ── Scroll story 1: the feeling. Pinned phrase → deck → cards ── */}
      <div className="pt-16 sm:pt-24">
        <Showcase
          id="how"
          label="Bet like the best"
          labelIcon={<Mascot size={22} />}
          phrase={
            <>
              Bet like the <InlineMascot />
              <br />
              best in the world.
            </>
          }
          cards={[
            { title: "Stop guessing. Start copying the bettors who win.", bg: "#1652f0", ink: "#ffffff", art: <ArtLeaderboard bettors={d.phone.bettors} /> },
            { title: "Know exactly where the money is made.", bg: "#d4ff4f", art: <ArtSplit compare={d.phone.compare} name={d.phone.bettors[0]?.name ?? ""} /> },
            { title: "Copy only the bets that win.", bg: "#ffffff", art: <ArtFollow /> },
            { title: "Their winning bet, on your phone, in seconds.", bg: "#ffe2cc", art: <ArtAlerts alert={d.phone.alert} name={d.phone.bettors[0]?.name ?? "A top bettor"} sport={d.phone.compare?.sport ?? d.phone.bettors[0]?.sport ?? "basketball"} /> },
          ]}
        />
      </div>

      {/* ── Real numbers, rolling in. Then rule 2: label them. ── */}
      {d.winners30d.count > 0 && (
        <StatStory
          first={
            <>
              <RollingNumber value={d.winners30d.count.toLocaleString("en-US")} className="text-brand underline decoration-[0.06em] underline-offset-[0.12em]" /> winning bettors
            </>
          }
          second={
            <>
              won <RollingNumber value={formatUsd(d.winners30d.profit)} className="text-win underline decoration-[0.06em] underline-offset-[0.12em]" /> this month.
            </>
          }
          close={<>Now it&apos;s your turn to be on the winning side.</>}
        />
      )}

      {/* ── Rules 4–5: ask, don't tell. A bucket question. ── */}
      <section className="px-4 pt-24 sm:px-8 sm:pt-32">
        <div className="mx-auto max-w-[1200px]">
          <Reveal>
            <Eyebrow>Be honest</Eyebrow>
            <h2 className="display mt-5 max-w-[760px] text-[36px] sm:text-[72px]">Which one sounds like you?</h2>
          </Reveal>
          <div className="mt-10">
            <BucketQuiz />
          </div>
        </div>
      </section>

      {/* ── Scroll story 2 (page turns blue): win more, lose less ── */}
      <div className="h-[20vh]" />
      <Showcase
        tone="brand"
        label="Win more"
        labelIcon={<Mascot size={22} variant="white" />}
        phrase={
          <>
            Win more.
            <br />
            Lose <InlineMascot variant="white" /> less.
          </>
        }
        cards={[
          { title: "This month's #1 bettor is way up. Imagine being on their side.", bg: "#ffffff", art: <ArtBigWin amount={d.topProfit30d} /> },
          { title: "Win on the bets you already love.", bg: "#ff7a59", ink: "#ffffff", art: <ArtMarkets /> },
          { title: "Same pick. Your bookmaker. Your profit.", bg: "#ece3ff", art: <ArtSlip alert={d.phone.alert} /> },
          { title: "Get in before the odds move.", bg: "#d4ff4f", art: <ArtSpeed /> },
        ]}
      />

      {/* ── Rule 3: loss aversion, lighting up word by word ── */}
      <section className="px-4 pt-24 sm:px-8 sm:pt-40">
        <div className="mx-auto max-w-[1100px]">
          <WordReveal text="Every bet on a hunch is money you hand to *the *bookmaker. The best bettors in the world stopped guessing *years *ago." className="text-[32px] sm:text-[72px]" />
        </div>
      </section>

      {/* ── Sports: two rows of league bubbles drifting in opposite directions ── */}
      <section id="sports" className="scroll-mt-24 pt-24 sm:pt-32">
        <div className="mx-auto max-w-[1200px] px-4 sm:px-8">
          <Reveal className="flex flex-col justify-between gap-6 sm:flex-row sm:items-end">
            <div>
              <Eyebrow>12 sports · 500+ leagues</Eyebrow>
              <h2 className="display mt-5 text-[36px] sm:text-[72px]">Win in the sport you love.</h2>
            </div>
            <p className="max-w-[360px] text-[16px] text-ink-2 sm:text-[18px]">The best NBA bettor isn&apos;t the best NFL bettor. Pick your sport and follow the people who win there.</p>
          </Reveal>
        </div>
        <div className="mt-10 space-y-3">
          <LeagueMarquee row="a" />
          <LeagueMarquee row="b" reverse speed={55} />
        </div>
      </section>

      {/* ── Detail: real example ── */}
      {d.compare && (
        <section className="px-4 pt-24 sm:px-8 sm:pt-32">
          <div className="mx-auto grid max-w-[1200px] items-center gap-10 lg:grid-cols-2">
            <Reveal>
              <Eyebrow>Real example</Eyebrow>
              <h2 className="display mt-5 text-[36px] sm:text-[64px]">Same bettor. Very different story.</h2>
              <p className="mt-5 max-w-[480px] text-[16px] leading-[1.5] text-ink-2 sm:text-[19px] sm:leading-relaxed">Most people follow one number. Winners follow the bets that actually win. See exactly where someone makes their money, and copy only those bets.</p>
              <ButtonLink href={`/app/bettor/${d.compare.address}?s=${d.compare.sport}&tf=all`} variant="brand" size="md" className="mt-8">
                See {d.compare.name}&apos;s profile
              </ButtonLink>
            </Reveal>
            <Reveal delay={0.1} className="rounded-[32px] bg-white p-6 sm:p-8">
              <div className="flex items-center gap-3">
                <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-soft text-brand">
                  <SportIcon sport={d.compare.sport} />
                </span>
                <div>
                  <div className="title text-[20px]">{d.compare.name}</div>
                  <div className="text-[14px] text-ink-3">All-time, settled bets</div>
                </div>
              </div>
              <div className="mt-6 grid grid-cols-2 gap-2 sm:gap-3">
                <div className="rounded-[24px] bg-win-soft p-4 sm:p-5">
                  <div className="text-[14px] font-medium text-ink-2">{sportLabel(d.compare.sport)} only</div>
                  <div className="display num mt-2 text-[32px] text-win sm:text-[52px]">{formatPct(d.compare.sportRoi)}</div>
                  <div className="text-[14px] text-ink-2">ROI · {d.compare.sportBets} bets</div>
                </div>
                <div className="rounded-[24px] bg-surface-2 p-4 sm:p-5">
                  <div className="text-[14px] font-medium text-ink-2">Everything else</div>
                  <div className={`display num mt-2 text-[32px] sm:text-[52px] ${d.compare.otherRoi >= 0 ? "text-ink" : "text-loss"}`}>{formatPct(d.compare.otherRoi)}</div>
                  <div className="text-[14px] text-ink-2">ROI · {d.compare.otherBets} bets</div>
                </div>
              </div>
              <p className="mt-5 text-[15px] text-ink-2">Follow only their {sportLabel(d.compare.sport)} bets with one tap. Their other bets never reach your phone.</p>
            </Reveal>
          </div>
        </section>
      )}

      {/* ── Rule 6: future pacing ── */}
      <section className="px-4 pt-24 sm:px-8 sm:pt-32">
        <div className="mx-auto max-w-[1200px]">
          <Reveal className="text-center">
            <Eyebrow>Picture this</Eyebrow>
            <h2 className="display mx-auto mt-5 max-w-[800px] text-[36px] sm:text-[72px]">Six months from now.</h2>
          </Reveal>
          <div className="mt-10 grid gap-3 md:grid-cols-2">
            <Reveal className="rounded-[32px] bg-white p-7 sm:p-10">
              <div className="text-[15px] font-semibold text-ink-3">If nothing changes</div>
              <ul className="mt-6 space-y-4 text-[16px] text-ink-2 sm:space-y-5 sm:text-[19px]">
                {["You're still betting on gut feeling.", "Still chasing losses after a bad weekend.", "Still watching your balance go the wrong way."].map((t) => (
                  <li key={t} className="flex gap-3">
                    <span className="mt-1.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-loss-soft">
                      <span className="h-1.5 w-1.5 rounded-full bg-loss" />
                    </span>
                    {t}
                  </li>
                ))}
              </ul>
            </Reveal>
            <Reveal delay={0.1} className="rounded-[32px] bg-brand p-7 text-white sm:p-10">
              <div className="text-[15px] font-semibold text-white/70">If you start today</div>
              <ul className="mt-6 space-y-4 text-[16px] sm:space-y-5 sm:text-[19px]">
                {["You bet alongside the best bettors in the world.", "Every bet you place has a winning record behind it.", "You know why you win, and you keep winning."].map((t) => (
                  <li key={t} className="flex gap-3">
                    <Check on="lime" />
                    {t}
                  </li>
                ))}
              </ul>
            </Reveal>
          </div>
          <Reveal className="mt-8 text-center text-[16px] text-ink-2 sm:text-[19px]">Same six months. The only difference is the decision you make today.</Reveal>
        </div>
      </section>

      {/* ── Rule 1 + 7: pricing, said calmly ── */}
      <section id="pricing" className="scroll-mt-24 px-4 pt-24 sm:px-8 sm:pt-32">
        <div className="mx-auto max-w-[1200px]">
          <Reveal className="text-center">
            <Eyebrow>Pricing</Eyebrow>
            <h2 className="display mx-auto mt-5 max-w-[860px] text-[36px] sm:text-[72px]">Stop betting alone.</h2>
            <p className="mx-auto mt-5 max-w-[520px] text-[16px] text-ink-2 sm:text-[19px]">Start free. Upgrade when you want their bets the second they happen. Cancel anytime.</p>
          </Reveal>
          <div className="mx-auto mt-10 grid max-w-[920px] gap-3 md:grid-cols-2">
            <Reveal className="flex flex-col rounded-[32px] bg-white p-7 sm:p-9">
              <div className="title text-[22px]">Free</div>
              <div className="mt-4 flex items-baseline gap-1">
                <span className="display text-[56px]">$0</span>
              </div>
              <ul className="mt-6 mb-2 space-y-3 text-[15px] text-ink-2 sm:text-[17px]">
                {["See every winning bettor's full record", "Filters and custom search", "Follow up to 3 bettors", "Their bets on Telegram, 10 minutes later"].map((t) => (
                  <li key={t} className="flex gap-3">
                    <Check /> {t}
                  </li>
                ))}
              </ul>
              <ButtonLink href="/app" variant="soft" size="lg" className="mt-8 w-full md:mt-auto">
                Start free
              </ButtonLink>
            </Reveal>
            <Reveal delay={0.08} className="relative flex flex-col overflow-hidden rounded-[32px] bg-brand p-7 text-white sm:p-9">
              <div className="flex items-center justify-between">
                <div className="title text-[22px]">Pro</div>
                <span className="rounded-full bg-lime px-3 py-1 text-[13px] font-semibold text-[#10173a]">Instant</span>
              </div>
              <div className="mt-4 flex items-baseline gap-1">
                <span className="display text-[56px]">$29</span>
                <span className="text-white/70">/ month</span>
              </div>
              <ul className="mt-6 space-y-3 text-[15px] sm:text-[17px]">
                {["Their bets within seconds, before the odds move", "Follow as many winners as you like", "Choose exactly which bets you get", "Saved searches"].map((t) => (
                  <li key={t} className="flex gap-3">
                    <Check on="lime" /> {t}
                  </li>
                ))}
              </ul>
              <p className="mt-6 text-[15px] text-white/75">Less than a single bet. One winning pick pays for it.</p>
              <ButtonLink href="/app/account" variant="lime" size="lg" className="mt-6 w-full">
                Go Pro
              </ButtonLink>
            </Reveal>
          </div>
        </div>
      </section>

      {/* ── FAQ ── */}
      <section id="faq" className="scroll-mt-24 px-4 pt-24 sm:px-8 sm:pt-32">
        <div className="mx-auto max-w-[920px]">
          <Reveal>
            <h2 className="display text-center text-[36px] sm:text-[72px]">Questions</h2>
          </Reveal>
          <div className="mt-10">
            <Faq />
          </div>
        </div>
      </section>

      {/* ── Rule 2 + calm close: one giant phrase, the mascot inside it ── */}
      <section className="relative mt-24 overflow-hidden bg-lime px-4 pt-24 pb-40 text-center text-[#10173a] sm:mt-32 sm:pt-32 sm:pb-56">
        <RisingMascot />
        <Reveal className="relative">
          <p className="text-[15px] font-medium opacity-70 sm:text-[17px]">For bettors who do the homework.</p>
          <h2 className="display mx-auto mt-5 max-w-[1000px] text-[44px] sm:text-[104px]">
            Start winning.
            <br />
            Follow <InlineMascot copyColor="#FFFFFF" /> the best.
          </h2>
          <ButtonLink href="/app" variant="brand" size="lg" className="mt-10">
            Start winning, free
          </ButtonLink>
        </Reveal>
      </section>

      <footer className="px-4 pt-10 pb-12 sm:px-8">
        <div className="mx-auto flex max-w-[1200px] flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
          <Logo />
          <p className="max-w-[640px] text-[13px] leading-relaxed text-ink-3">
            Records come from real, settled bets placed with real money. Nothing here is financial advice, and past results don&apos;t guarantee future results. Betting involves risk: only bet what you can afford to lose, where it&apos;s legal for you. 18+. Please gamble responsibly.
          </p>
        </div>
      </footer>
    </main>
  );
}
