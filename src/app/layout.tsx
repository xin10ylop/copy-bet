import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "CopyBet: bet like the best",
  description:
    "Get an alert the second top bettors place a bet. Every record verified.",
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
    { media: "(prefers-color-scheme: dark)", color: "#111114" },
  ],
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className="h-full">
      <body className="min-h-full">{children}</body>
    </html>
  );
}
