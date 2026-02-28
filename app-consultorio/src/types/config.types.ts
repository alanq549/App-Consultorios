export type Language = "ES" | "EN";
export type Theme = "LIGHT" | "DARK";
export type Layout = "SIDEBAR" | "TOPBAR";

export interface CustomConfig {
  language: Language;
  theme: Theme;
  layout: Layout;
  notificationsEnabled: boolean;
}
