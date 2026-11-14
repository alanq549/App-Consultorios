// src/hooks/theme/usePublicTheme.ts
import { useEffect, useState } from "react";

const STORAGE_KEY = "consultorio-public-theme";

type Theme = "light" | "dark";

function getInitialTheme(): Theme {
  if (typeof window === "undefined") return "light";

  const stored = window.localStorage.getItem(STORAGE_KEY);
  if (stored === "dark" || stored === "light") return stored;

  // Si otra capa (p. ej. ThemeProvider) ya marcó el tema, respétalo.
  return document.documentElement.classList.contains("dark") ? "dark" : "light";
}

/**
 * Tema claro/oscuro de las superficies públicas (Home, Login, Registro).
 * Se persiste en localStorage para conservarlo entre recargas y navegación.
 */
export function usePublicTheme() {
  const [theme, setTheme] = useState<Theme>(getInitialTheme);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", theme === "dark");
    window.localStorage.setItem(STORAGE_KEY, theme);
  }, [theme]);

  const toggleTheme = () => setTheme((prev) => (prev === "dark" ? "light" : "dark"));

  return { theme, isDark: theme === "dark", toggleTheme };
}
