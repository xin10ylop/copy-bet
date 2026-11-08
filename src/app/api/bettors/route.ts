import { NextRequest } from "next/server";
import { paramsToFilter } from "@/lib/filters";
import { listBettors } from "@/lib/server/stats";

export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  const filter = paramsToFilter(sp);
  const offset = Math.max(0, Number(sp.get("offset") ?? 0) || 0);
  const limit = Math.min(50, Math.max(1, Number(sp.get("limit") ?? 20) || 20));
  // ?a=0x… returns just that bettor's row for the filter (empty when they don't qualify).
  const only = sp.get("a");
  return Response.json(await listBettors(filter, limit, offset, only && /^0x[0-9a-fA-F]{40}$/.test(only) ? only : undefined));
}
