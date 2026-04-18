import { Outlet, useLocation } from "react-router-dom";
import { useAppSelector } from "@/hooks/auth/useRedux";
import { VerificationPending } from "@/features/Professional/components/VerificationPending";

export const ProfessionalVerificationGuard = () => {
  const user = useAppSelector((s) => s.auth.user);
  const location = useLocation();

  if (!user) return null;

  if (user.role === "PROFESSIONAL") {
    const isApproved = user.profile.verificationStatus === "APPROVED";

    if (!isApproved) {
      if (location.pathname.startsWith("/professional/profile")) {
        return <Outlet />;
      }

      return <VerificationPending />;
    }
  }

  return <Outlet />;
};