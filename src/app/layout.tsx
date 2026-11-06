import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "CopyBet — Bet with the best sports bettors in the world",
  description:
    "Follow the sharpest sports bettors on Polymarket. See their real record by sport, and get every bet they place on Telegram within seconds.",
  manifest: "/manifest.webmanifest",
  appleWebApp: { capable: true, title: "CopyBet", statusBarStyle: "default" },
  icons: { icon: "/icon.svg", apple: "/icon.svg" },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f4f6ff" },
    { media: "(prefers-color-scheme: dark)", color: "#0b0f26" },
  ],
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className="h-full">
      <body className="min-h-full">{children}</body>
    </html>
  );
}
