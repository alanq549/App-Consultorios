// src/context/ThemeProvider.tsx
import { useEffect } from "react";
import { useAppSelector } from "@/hooks/auth/useRedux";
import { ThemeContext } from "./theme.context";

export const ThemeProvider = ({ children }: { children: React.ReactNode }) => {
  const theme = useAppSelector(s => s.config.config?.theme); // no default

  // espera a que Redux esté listo
useEffect(() => {
  const root = document.documentElement;

  if (theme?.toLowerCase() === "dark") {
    root.classList.add("dark");
  } else {
    // 👇 incluye light, undefined, null, logout, etc.
    root.classList.remove("dark");
  }

  console.log(
    "🔥 Tema aplicado:",
    theme ?? "LIGHT (default)",
    "Clases html:",
    root.className
  );
}, [theme]);


  if (!theme) return null; // evita render prematuro

  return (
    <ThemeContext.Provider value={{ theme }}>
      {children}
    </ThemeContext.Provider>
  );
};
