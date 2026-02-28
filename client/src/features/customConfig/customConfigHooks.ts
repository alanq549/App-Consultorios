// src/features/customConfig/customConfigHooks.ts
import { useAppDispatch, useAppSelector } from "@/hooks/redux";
import { useEffect } from "react";
import { fetchConfig, patchConfig } from "./customConfigSlice";
import { updateUserConfig } from "@/features/auth/authSlice"; // 👈 importar la acción


export function useCustomConfig() {
  const dispatch = useAppDispatch();
  const config = useAppSelector((state) => state.customConfig.data);
  const loading = useAppSelector((state) => state.customConfig.loading);
  const error = useAppSelector((state) => state.customConfig.error);

useEffect(() => {
  if (!config && !loading) {
    dispatch(fetchConfig());
  } else if (config) {
    const safeConfig = {
      ...config,
      theme: config.theme === 'dark' ? 'dark' : 'light',
      layout: config.layout === 'SIDEBAR' ? 'SIDEBAR' : 'TOPBAR',
    } as const;

    dispatch(updateUserConfig(safeConfig));
  }
}, [config, loading, dispatch]);


  const updateConfig = (data: Partial<{ layout: string; theme: string }>) => {
    dispatch(patchConfig(data));
    // Adaptar el tipo de theme para que coincida con UserConfig
    const userConfigData: Partial<{ layout?: string; theme?: "light" | "dark" }> = {
      ...data,
      theme: data.theme === "light" || data.theme === "dark" ? data.theme : undefined,
    };
    dispatch(updateUserConfig(userConfigData)); // 👈 aquí sincronizás con auth.user.config
  };

  return { config, loading, error, updateConfig };
}
