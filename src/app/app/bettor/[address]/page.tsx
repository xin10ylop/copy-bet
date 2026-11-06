import { Suspense } from "react";
import { Profile } from "./Profile";

export default async function BettorPage({ params }: PageProps<"/app/bettor/[address]">) {
  const { address } = await params;
  return (
    <Suspense>
      <Profile address={address.toLowerCase()} />
    </Suspense>
  );
}
