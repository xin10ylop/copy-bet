import type { SportKey } from "@/lib/sports";

const P = { fill: "none", stroke: "currentColor", strokeWidth: 1.7, strokeLinecap: "round" as const, strokeLinejoin: "round" as const };

/** Simple line icons for each sport group (24×24). */
export function SportIcon({ sport, size = 24, className }: { sport: SportKey | string; size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" className={className} aria-hidden>
      {ICONS[sport as SportKey] ?? ICONS.other}
    </svg>
  );
}

const ICONS: Record<SportKey, React.ReactNode> = {
  football: (
    <g {...P}>
      <ellipse cx="12" cy="12" rx="9.5" ry="5.6" transform="rotate(-40 12 12)" />
      <path d="M9.2 14.8 14.8 9.2M10.6 11.4l2 2M11.8 10.2l2 2M9.4 12.6l2 2" />
    </g>
  ),
  basketball: (
    <g {...P}>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 3v18M3 12h18M5.6 5.6c3.2 3.2 3.2 9.6 0 12.8M18.4 5.6c-3.2 3.2-3.2 9.6 0 12.8" />
    </g>
  ),
  soccer: (
    <g {...P}>
      <circle cx="12" cy="12" r="9" />
      <path d="m12 7.6 3.6 2.6-1.4 4.2H9.8l-1.4-4.2L12 7.6ZM12 3v4.6M15.6 10.2l4.6-1.6M14.2 14.4l2.8 4M9.8 14.4l-2.8 4M8.4 10.2 3.8 8.6" />
    </g>
  ),
  baseball: (
    <g {...P}>
      <circle cx="12" cy="12" r="9" />
      <path d="M6.2 5.2c2.4 3.6 2.4 10 0 13.6M17.8 5.2c-2.4 3.6-2.4 10 0 13.6" />
      <path d="m7.6 8.4 1.6-.6M8.2 11.4l1.7-.2M8.2 14.2l1.7.3M15.8 8.4l-1.6-.6M15.8 11.4l-1.7-.2M15.8 14.2l-1.7.3" />
    </g>
  ),
  hockey: (
    <g {...P}>
      <path d="M15.5 3 9 17.5c-.4.9-1.3 1.5-2.3 1.5H3v-2.6h3.4" />
      <ellipse cx="17" cy="18.5" rx="4" ry="1.6" />
      <path d="M13 18.5v1.2c0 .9 1.8 1.6 4 1.6s4-.7 4-1.6v-1.2" />
    </g>
  ),
  tennis: (
    <g {...P}>
      <circle cx="12" cy="12" r="9" />
      <path d="M5.4 5.8c3.4 2.8 4.4 8.6 1 12.6M18.6 5.6c-3.4 2.8-4.4 8.8-1 12.8" />
    </g>
  ),
  combat: (
    <g {...P}>
      <path d="M7 10V8a5 5 0 0 1 10 0v5a4 4 0 0 1-4 4H10a3 3 0 0 1-3-3v-4Z" />
      <path d="M7 11H5.6A1.6 1.6 0 0 0 4 12.6v.4A3 3 0 0 0 7 16M10 17v4h6v-4M11 8.5h4" />
    </g>
  ),
  esports: (
    <g {...P}>
      <path d="M7 7h10a4 4 0 0 1 4 4v3.5a2.5 2.5 0 0 1-4.6 1.4L15 14H9l-1.4 1.9A2.5 2.5 0 0 1 3 14.5V11a4 4 0 0 1 4-4Z" />
      <path d="M8 9.5v3M6.5 11h3M15 10h.01M17 12h.01" />
    </g>
  ),
  cricket: (
    <g {...P}>
      <path d="m4 20 2-2M6 18l9.5-9.5 3 3L9 21l-3-3Z" />
      <path d="m15.5 8.5 3-3 1.5 1.5-3 3" />
      <circle cx="7" cy="6" r="2.4" />
    </g>
  ),
  golf: (
    <g {...P}>
      <path d="M8 21V3l9 3.8L8 10.6" />
      <ellipse cx="12" cy="21" rx="7" ry="1.4" />
      <circle cx="16.5" cy="17" r="1.6" />
    </g>
  ),
  racing: (
    <g {...P}>
      <path d="M5 21V4M5 4h14v10H5" />
      <path d="M5 7.3h14M5 10.6h14M8.5 4v10M12 4v10M15.5 4v10" opacity=".55" />
    </g>
  ),
  rugby: (
    <g {...P}>
      <ellipse cx="12" cy="12" rx="9.5" ry="6" transform="rotate(-30 12 12)" />
      <path d="M6.6 9.8c3.2 2.2 7.6 2.2 10.8 4.4M7.8 7.4c3 .6 6.4 2.4 8.6 4.8" />
    </g>
  ),
  other: (
    <g {...P}>
      <path d="M8 21h8M12 17v4M7 4h10v5a5 5 0 0 1-10 0V4Z" />
      <path d="M7 6H4.5v1.5A3.5 3.5 0 0 0 8 11M17 6h2.5v1.5A3.5 3.5 0 0 1 16 11" />
    </g>
  ),
};
