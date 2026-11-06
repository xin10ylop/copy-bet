/* eslint-disable @next/next/no-img-element */
import clsx from "clsx";

const PALETTES = [
  ["#3A5BFF", "#D4FF4F"],
  ["#FF7A59", "#FFD3A8"],
  ["#12B76A", "#C9F7DF"],
  ["#8B5CF6", "#E3D7FF"],
  ["#0EA5E9", "#C7EEFF"],
  ["#F43F5E", "#FFD1DA"],
  ["#F59E0B", "#FFEBB8"],
];

function hash(s: string) {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}

/** Profile picture, or a friendly generated blob when the bettor has none. */
export function Avatar({ address, src, name, size = 44, className }: { address: string; src?: string | null; name?: string; size?: number; className?: string }) {
  const h = hash(address);
  const [a, b] = PALETTES[h % PALETTES.length];
  const initial = (name ?? "?").replace(/^0x/i, "").trim().charAt(0).toUpperCase() || "?";
  return (
    <span className={clsx("relative inline-flex shrink-0 overflow-hidden rounded-full", className)} style={{ width: size, height: size }}>
      {src ? (
        <img src={src} alt="" width={size} height={size} className="h-full w-full object-cover" loading="lazy" />
      ) : (
        <span className="flex h-full w-full items-center justify-center font-semibold" style={{ background: `radial-gradient(circle at ${20 + (h % 60)}% ${15 + (h % 50)}%, ${b}, ${a} 70%)`, color: "#fff", fontSize: size * 0.42 }}>
          {initial}
        </span>
      )}
    </span>
  );
}
