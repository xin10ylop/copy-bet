import { Nav } from "@/components/landing/Nav";
import { Ribbons } from "@/components/landing/Ribbons";
import { AlertPhone } from "@/components/landing/AlertPhone";
import { BucketQuiz } from "@/components/landing/BucketQuiz";
import { SportGrid } from "@/components/landing/SportGrid";
import { Faq } from "@/components/landing/Faq";
import { Reveal } from "@/components/ui/Reveal";
import { ButtonLink } from "@/components/ui/Button";
import { Logo } from "@/components/Logo";
import { SportIcon } from "@/components/SportIcon";
import { getLandingData } from "@/lib/server/landing";
import { formatPct, formatUsd } from "@/lib/filters";
import { sportLabel } from "@/lib/sports";

export const dynamic = "force-dynamic";

function Eyebrow({ children, dark }: { children: React.ReactNode; dark?: boolean }) {
  return <span className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-[15px] font-medium ${dark ? "bg-white/10 text-white" : "bg-white text-ink shadow-[0_2px_12px_rgba(16,23,58,.06)]"}`}>{children}</span>;
}

export default async function Landing() {
  const d = await getLandingData();

  return (
    <main className="overflow-x-clip">
      <Nav />

      {/* ── Hero ── Rule 1 (highest need) + Rule 2 (label the reader) */}
      <section className="px-3 pt-[76px] sm:px-8 sm:pt-[96px]">
        <div className="relative mx-auto max-w-[1200px] overflow-hidden rounded-[32px] bg-night text-white sm:rounded-[40px]">
          <Ribbons />
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(11,15,38,.82)_0%,rgba(11,15,38,.55)_45%,rgba(11,15,38,.2)_100%)]" />
          <div className="relative grid items-center gap-10 px-6 pt-14 pb-10 sm:px-12 sm:pt-20 lg:grid-cols-[1.15fr_1fr] lg:pb-16">
            <div className="text-center lg:text-left">
              <Reveal>
                <Eyebrow dark>For bettors who play to win</Eyebrow>
              </Reveal>
              <Reveal delay={0.08}>
                <h1 className="display mt-6 text-[48px] sm:text-[72px] lg:text-[84px]">Bet with the best sports bettors in the world.</h1>
              </Reveal>
              <Reveal delay={0.16}>
                <p className="mx-auto mt-6 max-w-[520px] text-[19px] leading-relaxed text-night-ink-2 sm:text-[21px] lg:mx-0">
                  See who really wins on Polymarket, sport by sport. Follow them, and get every bet they place on Telegram within seconds.
                </p>
              </Reveal>
              <Reveal delay={0.24}>
                <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row sm:justify-center lg:justify-start">
                  <ButtonLink href="/app" variant="lime" size="lg" className="w-full sm:w-auto">
                    Start free
                  </ButtonLink>
                  <ButtonLink href="/app?sort=profit" variant="light" size="lg" className="w-full bg-white/10 text-white hover:bg-white/20 sm:w-auto">
                    See today&apos;s top bettors
                  </ButtonLink>
                </div>
                <p className="mt-4 text-[14px] text-night-ink-2">Free to start · No card · Takes 30 seconds</p>
              </Reveal>
            </div>
            <Reveal delay={0.2} y={60}>
              {d.alerts.length > 0 && <AlertPhone alerts={d.alerts} />}
            </Reveal>
          </div>
        </div>
      </section>

      {/* ── Proof: real numbers only ── */}
      <section className="px-4 pt-6 sm:px-8">
        <div className="mx-auto grid max-w-[1200px] grid-cols-3 gap-2 sm:gap-3">
          {[
            { k: d.tracked ? d.tracked.toLocaleString("en-US") : "—", v: "sports bettors tracked" },
            { k: d.topProfit30d ? formatUsd(d.topProfit30d) : "—", v: "won by this month's #1" },
            { k: "Seconds", v: "from their bet to your phone" },
          ].map((x) => (
            <Reveal key={x.v} className="rounded-[24px] bg-white p-4 text-center sm:p-6">
              <div className="display num text-[24px] sm:text-[44px]">{x.k}</div>
              <div className="mt-1 text-[12.5px] leading-tight text-ink-2 sm:text-[16px]">{x.v}</div>
            </Reveal>
          ))}
        </div>
      </section>

      {/* ── Rule 4–5: question-based, bucket question ── */}
      <section className="px-4 pt-24 sm:px-8 sm:pt-32">
        <div className="mx-auto max-w-[1200px]">
          <Reveal>
            <Eyebrow>Be honest</Eyebrow>
            <h2 className="display mt-5 max-w-[760px] text-[44px] sm:text-[72px]">Which one sounds like you?</h2>
          </Reveal>
          <div className="mt-10">
            <BucketQuiz />
          </div>
        </div>
      </section>

      {/* ── Rule 3: loss aversion ── */}
      <section className="px-3 pt-24 sm:px-8 sm:pt-32">
        <div className="mx-auto max-w-[1200px] rounded-[32px] bg-night px-6 py-16 text-white sm:rounded-[40px] sm:px-16 sm:py-24">
          <Reveal>
            <h2 className="display max-w-[900px] text-[40px] sm:text-[68px]">
              Every bet on a hunch is money handed to someone who <span className="text-lime">did the homework.</span>
            </h2>
          </Reveal>
          <div className="mt-12 grid gap-8 sm:grid-cols-2">
            <Reveal delay={0.1}>
              <p className="text-[19px] leading-relaxed text-night-ink-2 sm:text-[21px]">
                On Polymarket you don&apos;t bet against a bookmaker. You bet against other people. And the sharpest of them win again and again, often on the other side of your bets.
              </p>
            </Reveal>
            <Reveal delay={0.18}>
              <p className="text-[19px] leading-relaxed text-white sm:text-[21px]">
                CopyBet shows you exactly who they are, what they bet, and how they do in each sport. So next time, you can be on their side.
              </p>
            </Reveal>
          </div>
        </div>
      </section>

      {/* ── Sports squares ── */}
      <section id="sports" className="scroll-mt-24 px-4 pt-24 sm:px-8 sm:pt-32">
        <div className="mx-auto max-w-[1200px]">
          <Reveal className="flex flex-col justify-between gap-6 sm:flex-row sm:items-end">
            <div>
              <Eyebrow>12 sports · 500+ leagues</Eyebrow>
              <h2 className="display mt-5 text-[44px] sm:text-[72px]">Start with your sport.</h2>
            </div>
            <p className="max-w-[360px] text-[18px] text-ink-2">The best NBA bettor isn&apos;t the best NFL bettor. Pick your sport to see who wins there.</p>
          </Reveal>
          <div className="mt-10">
            <SportGrid perSport={d.perSport} />
          </div>
        </div>
      </section>

      {/* ── How it works ── */}
      <section id="how" className="scroll-mt-24 px-4 pt-24 sm:px-8 sm:pt-32">
        <div className="mx-auto max-w-[1200px]">
          <Reveal>
            <Eyebrow>How it works</Eyebrow>
            <h2 className="display mt-5 text-[44px] sm:text-[72px]">Three steps. That&apos;s it.</h2>
          </Reveal>
          <div className="mt-10 grid gap-3 lg:grid-cols-3">
            <Reveal className="flex flex-col lg:min-h-[420px] overflow-hidden rounded-[32px] bg-brand p-7 text-white sm:p-9">
              <div className="text-[15px] font-semibold opacity-70">01</div>
              <h3 className="title mt-2 text-[28px] leading-tight">Find who actually wins</h3>
              <p className="mt-2 text-[17px] text-white/75">Filter by sport, ROI, win rate, profit and when they bet. Or don&apos;t filter at all.</p>
              <div className="mt-auto flex flex-wrap gap-2 pt-8">
                {["NBA", "ROI > 15%", "Last 30 days", "50+ bets", "Game day"].map((t, i) => (
                  <span key={t} className={`rounded-full px-4 py-2 text-[15px] font-medium ${i % 2 ? "bg-white/15" : "bg-white text-brand"}`}>
                    {t}
                  </span>
                ))}
              </div>
            </Reveal>
            <Reveal delay={0.08} className="flex flex-col lg:min-h-[420px] overflow-hidden rounded-[32px] bg-[#10173a] p-7 text-white sm:p-9">
              <div className="text-[15px] font-semibold opacity-70">02</div>
              <h3 className="title mt-2 text-[28px] leading-tight">Choose which bets you want</h3>
              <p className="mt-2 text-[17px] text-white/70">Everything they bet, or only the bets that match your filter. Your filter is already ticked for you.</p>
              <div className="mt-auto space-y-2 pt-8">
                {[
                  ["Everything they bet", false],
                  ["Only Basketball", true],
                  ["Only bets over $1,000", true],
                ].map(([t, on]) => (
                  <div key={t as string} className="flex items-center justify-between rounded-2xl bg-white/10 px-4 py-3 text-[16px]">
                    {t}
                    <span className={`flex h-6 w-6 items-center justify-center rounded-full ${on ? "bg-lime" : "border-2 border-white/30"}`}>
                      {on && (
                        <svg width="12" height="12" viewBox="0 0 16 16" aria-hidden>
                          <path d="M3.5 8.5l3 3 6-7" stroke="#10173a" strokeWidth="2.6" fill="none" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      )}
                    </span>
                  </div>
                ))}
              </div>
            </Reveal>
            <Reveal delay={0.16} className="flex flex-col lg:min-h-[420px] overflow-hidden rounded-[32px] bg-lime p-7 text-[#10173a] sm:p-9">
              <div className="text-[15px] font-semibold opacity-60">03</div>
              <h3 className="title mt-2 text-[28px] leading-tight">Get the bet in seconds</h3>
              <p className="mt-2 text-[17px] text-[#10173a]/70">A Telegram message the moment they bet, with the price, the size and their record.</p>
              <div className="mt-auto rounded-[22px] rounded-tl-md bg-white p-4 text-[15px] shadow-[0_20px_40px_-20px_rgba(16,23,58,.35)]">
                <div className="flex items-center gap-2 font-semibold">
                  <span className="h-2 w-2 rounded-full bg-win" /> New bet
                </div>
                <div className="mt-1 text-ink-2">NBA · Lakers vs. Celtics · in 3h</div>
                <div className="mt-1 font-semibold">Lakers @ 42¢ · $2,500</div>
                <div className="mt-3 flex gap-2 text-[13px] font-semibold">
                  <span className="rounded-full bg-brand-soft px-3 py-1.5 text-brand">Open market</span>
                  <span className="rounded-full bg-surface-2 px-3 py-1.5">View profile</span>
                </div>
              </div>
            </Reveal>
          </div>
        </div>
      </section>

      {/* ── Detail: your filter vs everything (real example) ── */}
      {d.compare && (
        <section className="px-4 pt-24 sm:px-8 sm:pt-32">
          <div className="mx-auto grid max-w-[1200px] items-center gap-10 lg:grid-cols-2">
            <Reveal>
              <Eyebrow>Real example</Eyebrow>
              <h2 className="display mt-5 text-[44px] sm:text-[64px]">Same bettor. Very different story.</h2>
              <p className="mt-5 max-w-[480px] text-[19px] leading-relaxed text-ink-2">
                A leaderboard shows one number. CopyBet shows where someone is actually good, so you follow the bets that win and skip the ones that don&apos;t.
              </p>
              <ButtonLink href={`/app/bettor/${d.compare.address}?s=${d.compare.sport}&tf=all`} variant="dark" size="md" className="mt-8">
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
            <h2 className="display mx-auto mt-5 max-w-[800px] text-[44px] sm:text-[72px]">Six months from now.</h2>
          </Reveal>
          <div className="mt-10 grid gap-3 md:grid-cols-2">
            <Reveal className="rounded-[32px] bg-white p-7 sm:p-10">
              <div className="text-[15px] font-semibold text-ink-3">If nothing changes</div>
              <ul className="mt-6 space-y-5 text-[19px] text-ink-2">
                {["You're still betting on gut feeling.", "Still chasing losses after a bad weekend.", "Still finding out what the sharps bet after the price already moved."].map((t) => (
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
              <div className="text-[15px] font-semibold text-white/70">With CopyBet</div>
              <ul className="mt-6 space-y-5 text-[19px]">
                {["You know exactly who the best bettors in your sport are.", "Their bets reach your phone seconds after they place them.", "Every bet you make has a real record behind it."].map((t) => (
                  <li key={t} className="flex gap-3">
                    <span className="mt-1.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-lime">
                      <svg width="10" height="10" viewBox="0 0 16 16" aria-hidden>
                        <path d="M3.5 8.5l3 3 6-7" stroke="#10173a" strokeWidth="2.8" fill="none" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    </span>
                    {t}
                  </li>
                ))}
              </ul>
            </Reveal>
          </div>
          <Reveal className="mt-8 text-center text-[19px] text-ink-2">Same six months. The only difference is the decision you make today.</Reveal>
        </div>
      </section>

      {/* ── Rule 1 + 7: pricing, calm ── */}
      <section id="pricing" className="scroll-mt-24 px-4 pt-24 sm:px-8 sm:pt-32">
        <div className="mx-auto max-w-[1200px]">
          <Reveal className="text-center">
            <Eyebrow>Pricing</Eyebrow>
            <h2 className="display mx-auto mt-5 max-w-[860px] text-[44px] sm:text-[72px]">Stop betting alone.</h2>
            <p className="mx-auto mt-5 max-w-[520px] text-[19px] text-ink-2">Start free. Upgrade when you want their bets the second they happen. Cancel anytime.</p>
          </Reveal>
          <div className="mx-auto mt-10 grid max-w-[920px] gap-3 md:grid-cols-2">
            <Reveal className="flex flex-col rounded-[32px] bg-white p-7 sm:p-9">
              <div className="title text-[22px]">Free</div>
              <div className="mt-4 flex items-baseline gap-1">
                <span className="display text-[56px]">$0</span>
              </div>
              <ul className="mt-6 mb-2 space-y-3 text-[17px] text-ink-2">
                {["Every stat on every bettor", "Filters and custom search", "Follow up to 3 bettors", "Telegram alerts, 10 minutes later"].map((t) => (
                  <li key={t} className="flex gap-3">
                    <Check /> {t}
                  </li>
                ))}
              </ul>
              <ButtonLink href="/app" variant="soft" size="lg" className="mt-8 w-full md:mt-auto">
                Start free
              </ButtonLink>
            </Reveal>
            <Reveal delay={0.08} className="relative flex flex-col overflow-hidden rounded-[32px] bg-night p-7 text-white sm:p-9">
              <div className="flex items-center justify-between">
                <div className="title text-[22px]">Pro</div>
                <span className="rounded-full bg-lime px-3 py-1 text-[13px] font-semibold text-[#10173a]">Instant</span>
              </div>
              <div className="mt-4 flex items-baseline gap-1">
                <span className="display text-[56px]">$29</span>
                <span className="text-night-ink-2">/ month</span>
              </div>
              <ul className="mt-6 space-y-3 text-[17px] text-night-ink-2">
                {["Alerts within seconds", "Follow unlimited bettors", "Choose exactly which bets you get", "Saved searches"].map((t) => (
                  <li key={t} className="flex gap-3 text-white">
                    <Check lime /> {t}
                  </li>
                ))}
              </ul>
              <p className="mt-6 text-[15px] text-night-ink-2">Less than one bet a month. Catch one sharp bet in time, and it has paid for itself.</p>
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
            <h2 className="display text-center text-[44px] sm:text-[72px]">Questions</h2>
          </Reveal>
          <div className="mt-10">
            <Faq />
          </div>
        </div>
      </section>

      {/* ── Rule 2: label them, then a calm close ── */}
      <section className="px-3 pt-24 pb-6 sm:px-8 sm:pt-32">
        <div className="relative mx-auto max-w-[1200px] overflow-hidden rounded-[32px] bg-brand px-6 py-20 text-center text-white sm:rounded-[40px] sm:py-28">
          <Reveal>
            <h2 className="display mx-auto max-w-[900px] text-[44px] sm:text-[76px]">You&apos;re the kind of bettor who does the homework.</h2>
            <p className="mx-auto mt-6 max-w-[520px] text-[20px] text-white/80">Now do it with the best bettors in the world next to you.</p>
            <ButtonLink href="/app" variant="lime" size="lg" className="mt-10">
              Start free
            </ButtonLink>
          </Reveal>
        </div>
      </section>

      <footer className="px-4 pt-10 pb-12 sm:px-8">
        <div className="mx-auto flex max-w-[1200px] flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
          <Logo />
          <p className="max-w-[640px] text-[13px] leading-relaxed text-ink-3">
            CopyBet is an independent product and is not affiliated with or endorsed by Polymarket. Data comes from Polymarket&apos;s public APIs and blockchain records. Nothing here is financial advice. Past results don&apos;t guarantee future results. Only bet what you can afford to lose, where it&apos;s legal for you. 18+.
          </p>
        </div>
      </footer>
    </main>
  );
}

function Check({ lime }: { lime?: boolean }) {
  return (
    <span className={`mt-1 flex h-5 w-5 shrink-0 items-center justify-center rounded-full ${lime ? "bg-lime" : "bg-brand-soft"}`}>
      <svg width="10" height="10" viewBox="0 0 16 16" aria-hidden>
        <path d="M3.5 8.5l3 3 6-7" stroke={lime ? "#10173a" : "#3a5bff"} strokeWidth="2.8" fill="none" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </span>
  );
}
