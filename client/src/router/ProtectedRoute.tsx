import { Navigate } from "react-router-dom";
import { useAppSelector } from "../hooks/redux";
import type { JSX } from "react";

interface Props {
  children: JSX.Element;
  role: "ADMIN" | "PROFESSIONAL" | "CLIENT";
}

export default function ProtectedRoute({ children, role }: Props) {
  const { user, token } = useAppSelector((state) => state.auth);

  if (!token) return <Navigate to="/login" />;

  if (user?.role !== role) {
    return <Navigate to="/unauthorized" />;
  }

  return children;
}
