// 内联 SVG 图标（lucide 风格：stroke=currentColor, 16-18px）
import React from "react";

type P = { size?: number; className?: string; color?: string };

const S = ({ size = 16, className, children, color }: P & { children: React.ReactNode }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke={color ?? "currentColor"}
    strokeWidth={2}
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
    aria-hidden="true"
  >
    {children}
  </svg>
);

export const IconQuadrant = (p: P) => (
  <S {...p}>
    <circle cx="12" cy="12" r="9" />
    <path d="M12 3v18" />
    <path d="M3 12h18" />
    <circle cx="12" cy="12" r="1.6" fill="currentColor" stroke="none" />
  </S>
);

export const IconSearch = (p: P) => (
  <S {...p}>
    <circle cx="11" cy="11" r="7" />
    <path d="m21 21-4.3-4.3" />
  </S>
);

export const IconSparkles = (p: P) => (
  <S {...p}>
    <path d="M12 3l1.9 5.1L19 10l-5.1 1.9L12 17l-1.9-5.1L5 10l5.1-1.9L12 3z" />
    <path d="M19 3v3" />
    <path d="M20.5 4.5h-3" />
  </S>
);

export const IconLock = (p: P) => (
  <S {...p}>
    <rect x="4" y="11" width="16" height="10" rx="2" />
    <path d="M8 11V7a4 4 0 0 1 8 0v4" />
  </S>
);

export const IconMoon = (p: P) => (
  <S {...p}>
    <path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z" />
  </S>
);

export const IconSun = (p: P) => (
  <S {...p}>
    <circle cx="12" cy="12" r="4" />
    <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
  </S>
);

export const IconPen = (p: P) => (
  <S {...p}>
    <path d="M13 21h8" />
    <path d="m15 5 4 4" />
    <path d="M21.2 6.8a2 2 0 0 0-4-4L3.8 16.2a2 2 0 0 0-.5.8l-1.3 4.4a.5.5 0 0 0 .6.6l4.4-1.3a2 2 0 0 0 .8-.5L21.2 6.8z" />
  </S>
);

export const IconTrash = (p: P) => (
  <S {...p}>
    <path d="M3 6h18" />
    <path d="M8 6V4a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v2" />
    <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
    <path d="M10 11v6M14 11v6" />
  </S>
);

export const IconUndo = (p: P) => (
  <S {...p}>
    <path d="M9 14 4 9l5-5" />
    <path d="M4 9h10.5a5.5 5.5 0 0 1 0 11H11" />
  </S>
);

export const IconZoomIn = (p: P) => (
  <S {...p}>
    <circle cx="11" cy="11" r="7" />
    <path d="M21 21l-4.3-4.3M8 11h6M11 8v6" />
  </S>
);

export const IconZoomOut = (p: P) => (
  <S {...p}>
    <circle cx="11" cy="11" r="7" />
    <path d="M21 21l-4.3-4.3M8 11h6" />
  </S>
);

export const IconMaximize = (p: P) => (
  <S {...p}>
    <path d="M8 3H5a2 2 0 0 0-2 2v3M16 3h3a2 2 0 0 1 2 2v3M8 21H5a2 2 0 0 1-2-2v-3M16 21h3a2 2 0 0 0 2-2v-3" />
  </S>
);

export const IconChevronDown = (p: P) => (
  <S {...p}>
    <path d="m6 9 6 6 6-6" />
  </S>
);

export const IconChevronRight = (p: P) => (
  <S {...p}>
    <path d="m9 18 6-6-6-6" />
  </S>
);

export const IconX = (p: P) => (
  <S {...p}>
    <path d="M18 6 6 18M6 6l12 12" />
  </S>
);

export const IconMenu = (p: P) => (
  <S {...p}>
    <path d="M4 6h16M4 12h16M4 18h16" />
  </S>
);

export const IconTrending = (p: P) => (
  <S {...p}>
    <path d="M3 17l6-6 4 4 8-8" />
    <path d="M14 7h7v7" />
  </S>
);

export const IconBook = (p: P) => (
  <S {...p}>
    <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
    <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
  </S>
);

export const IconAlert = (p: P) => (
  <S {...p}>
    <path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z" />
    <path d="M12 9v4M12 17h.01" />
  </S>
);

// 模块图标映射（catalog.ts icon key → 图标组件）
export const MODULE_ICONS: Record<string, (p: P) => React.ReactElement> = {
  set: IconQuadrant,
  function: IconTrending,
  trig: IconQuadrant,
  sequence: IconTrending,
  inequality: IconAlert,
  analytic: IconQuadrant,
  solid: IconBook,
  prob: IconQuadrant,
  vector: IconTrending,
  algebra: IconBook,
  equation: IconAlert,
  geometry: IconQuadrant,
  circle: IconQuadrant,
  transform: IconMaximize,
  stat: IconTrending,
};
