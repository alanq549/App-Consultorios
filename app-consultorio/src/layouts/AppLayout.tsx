// src/layouts/AppLayout.tsx
import { Outlet } from "react-router-dom";
import { ThemeProvider } from "@/context/ThemeProvider";

export const AppLayout = () => {
  return (
    <ThemeProvider>
      <div className="min-h-screen bg-white text-neutral-900 dark:bg-neutral-900 dark:text-white">
        <Outlet />
      </div>
    </ThemeProvider>
  );
};
