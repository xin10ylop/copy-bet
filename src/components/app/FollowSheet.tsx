"use client";
import { AnimatePresence, motion } from "motion/react";
import { useState } from "react";
import clsx from "clsx";
import { Sheet } from "../ui/Sheet";
import { Button, ButtonLink } from "../ui/Button";
import { Chip } from "../ui/Chip";
import { Toggle } from "./FilterPanel";
import { SportIcon } from "../SportIcon";
import { Avatar } from "../ui/Avatar";
import { useMe, type FollowInfo } from "./MeProvider";
import { TIMINGS, type BettorFilter, type TimingKey, formatUsd } from "@/lib/filters";
import { sportLabel } from "@/lib/sports";

const SIZES = [0, 100, 500, 1000, 5000, 10000];

interface Props {
  open: boolean;
  onClose: () => void;
  bettor: { address: string; name: string; profileImage: string | null };
  /** Sports this bettor actually bets on, most frequent first. */
  bettorSports: string[];
  filter: BettorFilter;
  existing: FollowInfo | null;
}

/**
 * "Which of their bets do you want?" — everything, or only bets matching rules.
 * Rules start pre-ticked from the user's current filter; tap a chip to remove it.
 */
export function FollowSheet(props: Props) {
  return <Sheet open={props.open} onClose={props.onClose}>{props.open && <FollowFlow {...props} />}</Sheet>;
}

function FollowFlow({ onClose, bettor, bettorSports, filter, existing }: Props) {
  const { me, refresh } = useMe();
  const fromFilter = filter.sports.length > 0 || filter.timing.length > 0;
  const [mode, setMode] = useState<"all" | "custom">(existing?.mode ?? (fromFilter ? "custom" : "all"));
  const [sports, setSports] = useState<string[]>(existing?.mode === "custom" ? existing.sports : filter.sports.length ? [...filter.sports] : []);
  const [timing, setTiming] = useState<TimingKey[]>(existing?.mode === "custom" ? (existing.timing as TimingKey[]) : [...filter.timing]);
  const [minSize, setMinSize] = useState(existing?.minSize ?? 0);
  const [includeSells, setIncludeSells] = useState(existing?.includeSells ?? false);
  const [step, setStep] = useState<"rules" | "limit" | "telegram" | "done">("rules");
  const [busy, setBusy] = useState(false);

  const sportOptions = [...new Set([...bettorSports, ...sports])];
  const toggle = <T,>(list: T[], v: T) => (list.includes(v) ? list.filter((x) => x !== v) : [...list, v]);
  const customEmpty = mode === "custom" && !sports.length && !timing.length && !minSize;

  const save = async () => {
    setBusy(true);
    const r = await fetch("/api/follow", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ address: bettor.address, mode: customEmpty ? "all" : mode, sports, timing, minSize, includeSells }) });
    setBusy(false);
    if (r.status === 402) return setStep("limit");
    if (!r.ok) return;
    await refresh();
    setStep(me?.user?.telegram ? "done" : "telegram");
  };

  const unfollow = async () => {
    setBusy(true);
    await fetch(`/api/follow?address=${bettor.address}`, { method: "DELETE" });
    await refresh();
    setBusy(false);
    onClose();
  };

  return (
    <AnimatePresence mode="wait" initial={false}>
      {step === "rules" && (
        <motion.div key="rules" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.3 }}>
          <div className="flex items-center gap-3 pt-2 pb-5">
            <Avatar address={bettor.address} src={bettor.profileImage} name={bettor.name} size={44} />
            <div>
              <div className="title text-[22px] leading-tight">{existing ? "Edit alerts" : "Follow"} {bettor.name}</div>
              <div className="text-[14px] text-ink-3">Which of their bets do you want?</div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            {(
              [
                ["all", "Everything", "Every bet they place"],
                ["custom", "Only some", "Bets that match my rules"],
              ] as const
            ).map(([k, t, s]) => (
              <button key={k} onClick={() => setMode(k)} className={clsx("press rounded-[22px] p-4 text-left ring-2 transition-colors", mode === k ? "bg-brand-soft ring-brand" : "bg-surface ring-transparent")}>
                <div className="flex items-center justify-between">
                  <span className="text-[16px] font-semibold">{t}</span>
                  <span className={clsx("flex h-5 w-5 items-center justify-center rounded-full border-2", mode === k ? "border-brand bg-brand" : "border-surface-3")}>{mode === k && <span className="h-2 w-2 rounded-full bg-white" />}</span>
                </div>
                <div className="mt-1 text-[13px] text-ink-2">{s}</div>
              </button>
            ))}
          </div>

          <AnimatePresence initial={false}>
            {mode === "custom" && (
              <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }} className="overflow-hidden">
                <div className="space-y-6 pt-6">
                  {fromFilter && !existing && <p className="rounded-2xl bg-surface-2 px-4 py-3 text-[14px] text-ink-2">We ticked the rules from your filter. Tap any to remove it.</p>}
                  <Group title="Sports" hint={sports.length ? undefined : "All their sports"}>
                    <div className="flex flex-wrap gap-2">
                      {sportOptions.map((s) => (
                        <Chip key={s} selected={sports.includes(s)} removable onClick={() => setSports(toggle(sports, s))}>
                          <SportIcon sport={s} size={16} />
                          {sportLabel(s)}
                        </Chip>
                      ))}
                    </div>
                  </Group>
                  <Group title="When they bet" hint={timing.length ? undefined : "Any time"}>
                    <div className="flex flex-wrap gap-2">
                      {TIMINGS.map((t) => (
                        <Chip key={t.key} selected={timing.includes(t.key)} removable onClick={() => setTiming(toggle(timing, t.key))}>
                          {t.label}
                        </Chip>
                      ))}
                    </div>
                  </Group>
                  <Group title="Minimum bet size">
                    <div className="no-scrollbar -mx-6 flex gap-2 overflow-x-auto px-6">
                      {SIZES.map((v) => (
                        <Chip key={v} selected={minSize === v} onClick={() => setMinSize(v)}>
                          {v === 0 ? "Any size" : `${formatUsd(v)}+`}
                        </Chip>
                      ))}
                    </div>
                  </Group>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <button onClick={() => setIncludeSells(!includeSells)} className="press mt-6 flex w-full items-center justify-between rounded-[20px] bg-surface p-4 text-left">
            <span>
              <span className="block text-[15px] font-semibold">Also tell me when they sell</span>
              <span className="text-[13px] text-ink-3">Useful if you copy their exits too</span>
            </span>
            <Toggle on={includeSells} />
          </button>

          <div className="sticky bottom-0 -mx-6 mt-6 bg-gradient-to-t from-bg via-bg to-bg/0 px-6 pt-4 pb-2">
            <Button size="lg" className="w-full" onClick={save} disabled={busy}>
              {busy ? "Saving…" : existing ? "Save alerts" : mode === "all" || customEmpty ? "Follow every bet" : "Follow these bets"}
            </Button>
            {existing && (
              <button onClick={unfollow} className="mt-3 w-full py-2 text-[15px] font-semibold text-loss">
                Unfollow
              </button>
            )}
          </div>
        </motion.div>
      )}

      {step === "limit" && (
        <motion.div key="limit" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0 }} className="pt-4 pb-2 text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-lime text-[28px]">★</div>
          <h3 className="title mt-5 text-[26px]">You&apos;re following 3 bettors</h3>
          <p className="mx-auto mt-2 max-w-[340px] text-[16px] text-ink-2">That&apos;s the free limit. Pro lets you follow as many as you like, with alerts in seconds instead of 10 minutes.</p>
          <ButtonLink href="/app/account#pro" size="lg" variant="brand" className="mt-6 w-full">
            See Pro
          </ButtonLink>
          <ButtonLink href="/app/portfolio" size="md" variant="ghost" className="mt-2 w-full">
            Manage who I follow
          </ButtonLink>
        </motion.div>
      )}

      {step === "telegram" && (
        <motion.div key="tg" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0 }} className="pt-4 pb-2 text-center">
          <Burst />
          <h3 className="title mt-5 text-[26px]">Following {bettor.name}</h3>
          <p className="mx-auto mt-2 max-w-[340px] text-[16px] text-ink-2">One last step: connect Telegram so their bets reach your phone.</p>
          {me?.user?.telegramLink ? (
            <a href={me.user.telegramLink} target="_blank" rel="noreferrer" className="press mt-6 flex h-[60px] w-full items-center justify-center gap-2 rounded-full bg-[#2AABEE] text-[18px] font-semibold text-white">
              <TelegramIcon /> Connect Telegram
            </a>
          ) : (
            <p className="mt-6 rounded-2xl bg-surface-2 px-4 py-3 text-[14px] text-ink-2">Telegram isn&apos;t set up on this server yet (TELEGRAM_BOT_USERNAME is missing).</p>
          )}
          <button onClick={onClose} className="mt-3 w-full py-2 text-[15px] font-semibold text-ink-3">
            Later
          </button>
        </motion.div>
      )}

      {step === "done" && (
        <motion.div key="done" initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} className="pt-4 pb-2 text-center">
          <Burst />
          <h3 className="title mt-5 text-[26px]">You&apos;re set</h3>
          <p className="mx-auto mt-2 max-w-[340px] text-[16px] text-ink-2">
            {bettor.name}&apos;s {mode === "all" || customEmpty ? "bets" : "matching bets"} will land in your Telegram{me?.limits.delayMinutes ? ` ${me.limits.delayMinutes} minutes after they're placed` : " within seconds"}.
          </p>
          <Button size="lg" className="mt-6 w-full" onClick={onClose}>
            Done
          </Button>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function Group({ title, hint, children }: { title: string; hint?: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="mb-2.5 flex items-baseline justify-between">
        <span className="text-[15px] font-semibold">{title}</span>
        {hint && <span className="text-[13px] text-ink-3">{hint}</span>}
      </div>
      {children}
    </div>
  );
}

function Burst() {
  return (
    <motion.div initial={{ scale: 0.4, rotate: -20 }} animate={{ scale: 1, rotate: 0 }} transition={{ type: "spring", stiffness: 260, damping: 14 }} className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-lime">
      <svg width="34" height="34" viewBox="0 0 16 16" aria-hidden>
        <motion.path d="M3.5 8.5l3 3 6-7" stroke="#10173a" strokeWidth="2.2" fill="none" strokeLinecap="round" strokeLinejoin="round" initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ delay: 0.2, duration: 0.4 }} />
      </svg>
    </motion.div>
  );
}

export function TelegramIcon({ size = 22 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden>
      <path fill="currentColor" d="M21.9 4.3 18.6 19.9c-.2 1.1-.9 1.4-1.8.9l-5-3.7-2.4 2.3c-.3.3-.5.5-1 .5l.4-5.1 9.3-8.4c.4-.4-.1-.6-.6-.2L6 13.4 1.1 11.9c-1.1-.3-1.1-1.1.2-1.6L20.5 2.9c.9-.3 1.7.2 1.4 1.4Z" />
    </svg>
  );
}
