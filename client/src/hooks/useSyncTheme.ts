import { useEffect } from "react";
import { useAppSelector } from "@/hooks/redux";

export function useSyncTheme() {
const theme = useAppSelector(state => state.customConfig.data?.theme || "light");

  useEffect(() => {
    const html = document.documentElement;

    html.classList.remove("light", "dark");  // Removemos ambas para resetear

    if (theme === "dark") {
      html.classList.add("dark");
    } else {
      html.classList.add("light");
    }

    console.log(`[useSyncTheme] Aplicado theme: ${theme}`);
  }, [theme]);

  return theme;
}
