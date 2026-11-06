import { cookies } from "next/headers";
import { db } from "./db";

const COOKIE = "cb_uid";

/** Current user, if the browser already has one. Safe in server components. */
export async function getUser() {
  const id = (await cookies()).get(COOKIE)?.value;
  if (!id) return null;
  return db.user.findUnique({ where: { id } });
}

/**
 * Current user, creating an anonymous one on first action (follow, save search…).
 * No signup: the account becomes "real" when the person links Telegram.
 * Only call from route handlers / server actions (it may set a cookie).
 */
export async function requireUser() {
  const existing = await getUser();
  if (existing) return existing;
  const user = await db.user.create({ data: {} });
  (await cookies()).set(COOKIE, user.id, { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", maxAge: 60 * 60 * 24 * 400, path: "/" });
  return user;
}

export const FREE_FOLLOW_LIMIT = 3;
export const FREE_DELAY_MINUTES = 10;
