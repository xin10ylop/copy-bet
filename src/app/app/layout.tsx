import { MeProvider } from "@/components/app/MeProvider";
import { TabBar } from "@/components/app/TabBar";

export const metadata = { title: "CopyBet" };

export default function AppLayout({ children }: LayoutProps<"/app">) {
  return (
    <MeProvider>
      <div className="app-theme min-h-dvh bg-bg text-ink">
        <div className="mx-auto max-w-[640px] px-4 pt-[max(16px,env(safe-area-inset-top))] pb-32 sm:px-6">{children}</div>
        <TabBar />
      </div>
    </MeProvider>
  );
}
