"use client";
import { createContext, useCallback, useContext, useEffect, useState } from "react";

export interface FollowInfo {
  address: string;
  name: string;
  profileImage: string | null;
  mode: "all" | "custom";
  sports: string[];
  timing: string[];
  minSize: number;
  includeSells: boolean;
  mutedUntil: string | null;
  createdAt: string;
}

export interface Me {
  user: {
    id: string;
    plan: "free" | "pro";
    telegram: { username: string | null; name: string | null } | null;
    telegramLink: string | null;
    goal: string | null;
    favoriteSport: string | null;
  } | null;
  follows: FollowInfo[];
  searches: { id: string; name: string; query: string }[];
  limits: { follows: number | null; delayMinutes: number };
}

const Ctx = createContext<{ me: Me | null; refresh: () => Promise<void> }>({ me: null, refresh: async () => {} });

export function MeProvider({ children }: { children: React.ReactNode }) {
  const [me, setMe] = useState<Me | null>(null);
  const refresh = useCallback(async () => {
    const r = await fetch("/api/me", { cache: "no-store" });
    if (r.ok) setMe(await r.json());
  }, []);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- initial load of account data
    refresh();
    const onFocus = () => refresh();
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, [refresh]);
  return <Ctx.Provider value={{ me, refresh }}>{children}</Ctx.Provider>;
}

export function useMe() {
  return useContext(Ctx);
}

export function useFollowing(address: string) {
  const { me } = useMe();
  return me?.follows.find((f) => f.address === address.toLowerCase()) ?? null;
}
