export const LayoutType = {
  SIDEBAR: "SIDEBAR",
  TOPBAR: "TOPBAR",
} as const;

export type LayoutType = (typeof LayoutType)[keyof typeof LayoutType];
