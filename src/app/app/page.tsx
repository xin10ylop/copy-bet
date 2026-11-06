import { Suspense } from "react";
import { Discover } from "./Discover";

export default function DiscoverPage() {
  return (
    <Suspense>
      <Discover />
    </Suspense>
  );
}
