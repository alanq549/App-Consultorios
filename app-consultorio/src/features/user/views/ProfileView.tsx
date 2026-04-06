import { useSelector } from "react-redux";
import type { RootState } from "@/store";

import { ProfessionalProfileLayout } from "../professional/ProfessionalProfileLayout";
import { ClientProfileLayout } from "../client/ClientProfileLayout";

export const ProfileView = () => {

  const user = useSelector((state: RootState) => state.auth.user);
  const isProfessional = user?.role === "PROFESSIONAL";

  if (isProfessional) {
    return <ProfessionalProfileLayout />;
  }

  return <ClientProfileLayout />;
};