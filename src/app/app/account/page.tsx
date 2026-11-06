"use client";
import Link from "next/link";
import clsx from "clsx";
import { useMe } from "@/components/app/MeProvider";
import { TelegramIcon } from "@/components/app/FollowSheet";
import { Logo } from "@/components/Logo";

const PAYMENT_LINK = process.env.NEXT_PUBLIC_PRO_CHECKOUT_URL;

export default function AccountPage() {
  const { me } = useMe();
  const tg = me?.user?.telegram;
  const pro = me?.user?.plan === "pro";
  return (
    <div>
      <h1 className="display pt-6 text-[40px] sm:text-[48px]">Account</h1>

      {/* Telegram */}
      <section className="mt-6 overflow-hidden rounded-[28px] bg-surface">
        <div className="flex items-center gap-4 p-5">
          <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#2AABEE] text-white">
            <TelegramIcon size={28} />
          </span>
          <div className="flex-1">
            <div className="text-[17px] font-semibold">Telegram alerts</div>
            <div className={clsx("text-[14px] font-medium", tg ? "text-win" : "text-ink-3")}>{tg ? `Connected${tg.username ? ` as @${tg.username}` : tg.name ? ` as ${tg.name}` : ""}` : "Not connected"}</div>
          </div>
        </div>
        {!tg && (
          <div className="border-t border-line p-5">
            <ol className="space-y-2 text-[15px] text-ink-2">
              <li>1. Tap the button. Telegram opens.</li>
              <li>2. Press Start.</li>
              <li>3. That&apos;s it. Bets from your portfolio arrive there.</li>
            </ol>
            {me?.user?.telegramLink ? (
              <a href={me.user.telegramLink} target="_blank" rel="noreferrer" className="press mt-5 flex h-14 w-full items-center justify-center gap-2 rounded-full bg-[#2AABEE] text-[17px] font-semibold text-white">
                <TelegramIcon /> Connect Telegram
              </a>
            ) : (
              <p className="mt-5 rounded-2xl bg-surface-2 px-4 py-3 text-[14px] text-ink-2">{me?.user ? "The Telegram bot isn't configured on this server yet (set TELEGRAM_BOT_USERNAME)." : "Follow a bettor first, then connect Telegram here."}</p>
            )}
          </div>
        )}
      </section>

      {/* Plan */}
      <section id="pro" className="mt-3 scroll-mt-6 overflow-hidden rounded-[28px] bg-night p-6 text-white">
        <div className="flex items-center justify-between">
          <div className="title text-[22px]">{pro ? "You're on Pro" : "CopyBet Pro"}</div>
          <span className="rounded-full bg-lime px-3 py-1 text-[13px] font-semibold text-[#10173a]">{pro ? "Active" : "$29 / month"}</span>
        </div>
        <ul className="mt-5 space-y-2.5 text-[16px]">
          {["Alerts within seconds, not 10 minutes", "Follow as many bettors as you like", "Pick exactly which of their bets you get", "Saved searches"].map((t) => (
            <li key={t} className="flex gap-3">
              <span className="mt-1 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-lime">
                <svg width="10" height="10" viewBox="0 0 16 16" aria-hidden>
                  <path d="M3.5 8.5l3 3 6-7" stroke="#10173a" strokeWidth="2.8" fill="none" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </span>
              {t}
            </li>
          ))}
        </ul>
        {!pro && (
          <>
            <p className="mt-5 text-[15px] text-night-ink-2">Less than one bet a month. Cancel anytime.</p>
            {PAYMENT_LINK ? (
              <a href={`${PAYMENT_LINK}${PAYMENT_LINK.includes("?") ? "&" : "?"}client_reference_id=${me?.user?.id ?? ""}`} className="press mt-5 flex h-14 w-full items-center justify-center rounded-full bg-lime text-[17px] font-semibold text-[#10173a]">
                Go Pro
              </a>
            ) : (
              <div className="mt-5 flex h-14 w-full items-center justify-center rounded-full bg-white/10 text-[16px] font-semibold text-night-ink-2">Upgrades open soon</div>
            )}
          </>
        )}
      </section>

      {/* Install */}
      <section className="mt-3 rounded-[28px] bg-surface p-5">
        <div className="text-[17px] font-semibold">Put CopyBet on your home screen</div>
        <p className="mt-1 text-[15px] text-ink-2">iPhone: tap Share, then &quot;Add to Home Screen&quot;. Android: tap ⋮, then &quot;Install app&quot;. It opens full screen, like an app.</p>
      </section>

      <section className="mt-3 rounded-[28px] bg-surface p-5">
        <Link href="/" className="press inline-block">
          <Logo size={26} />
        </Link>
        <p className="mt-3 text-[13px] leading-relaxed text-ink-3">
          CopyBet is independent and not affiliated with Polymarket. Stats come from Polymarket&apos;s public data. Past results don&apos;t guarantee future results. Only bet what you can afford to lose, where it&apos;s legal for you. 18+.
        </p>
      </section>
    </div>
  );
}
