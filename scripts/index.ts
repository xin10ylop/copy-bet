// Index Polymarket sports leaderboards into the local database.
// Usage: npm run index [-- --per-board 200 --address 0x…]
import { indexBettor, indexLeaderboards } from "../src/lib/server/indexer";
import { db } from "../src/lib/server/db";

const args = process.argv.slice(2);
const arg = (k: string) => {
  const i = args.indexOf(k);
  return i >= 0 ? args[i + 1] : undefined;
};

async function main() {
  const address = arg("--address");
  if (address) console.log(await indexBettor(address));
  else await indexLeaderboards({ perBoard: Number(arg("--per-board") ?? 200), maxAgeMs: Number(arg("--max-age-min") ?? 60) * 60_000, log: console.log });
  await db.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
