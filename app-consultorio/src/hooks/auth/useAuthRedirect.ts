// src/hooks/auth/useAuthRedirect.ts
import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAppSelector } from "./useRedux";

export const useAuthRedirect = () => {
  const navigate = useNavigate();
  const { status, user } = useAppSelector((s) => s.auth);

useEffect(() => {
  if (status === 'checking') return;

  if (status !== "authenticated" || !user) return;

  switch (user.role) {
    case "CLIENT":
      navigate("/client/dashboard", { replace: true });
      break;
    case "PROFESSIONAL":
      navigate("/professional/dashboard", { replace: true });
      break;
    case "ADMIN":
      navigate("/admin/dashboard", { replace: true });
      break;
  }
}, [status, user, navigate]);

};
