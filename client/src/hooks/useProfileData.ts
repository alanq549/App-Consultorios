// src/hooks/useProfileData.ts
import { useAppSelector } from "./redux";

export function useProfileData() {
  const user = useAppSelector((state) => state.auth.user);

  return {
    user,
    profile: user?.professionalProfile,
    config: user?.config,
  };
}
