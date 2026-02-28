import { useAppSelector } from "@/hooks/redux";

export function useProfileData() {
  const auth = useAppSelector((state) => state.auth);

  const user = auth?.user;
  const profile = user?.professionalProfile;
  const config = user?.config;

  return {
    user,
    profile,
    config,
  };
}
