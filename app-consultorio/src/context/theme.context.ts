// src/context/theme.context.ts
import { createContext } from "react";

export type ThemeContextType = {
  theme: string;
};

export const ThemeContext = createContext<ThemeContextType>({
  theme: "light",
});
