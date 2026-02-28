import { useAppDispatch } from "@/hooks/auth/useRedux";
import { setConfig, clearConfig } from "@/store/config/configSlice";
import { getMyConfig, updateMyConfig } from "@/api/config.api";
import type { CustomConfig } from "@/types/config.types";

export const useConfigActions = () => {
  const dispatch = useAppDispatch();

  const loadConfig = async () => {
    const config = await getMyConfig();
    dispatch(setConfig(config));
  };

  const updateConfig = async (data: Partial<CustomConfig>) => {
    const updated = await updateMyConfig(data);
    dispatch(setConfig(updated));
  };

  const resetConfig = () => {
    dispatch(clearConfig());
  };

  return {
    loadConfig,
    updateConfig,
    resetConfig,
  };
};
