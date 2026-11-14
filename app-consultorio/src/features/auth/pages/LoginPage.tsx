// src/features/auth/pages/LoginPage.tsx
import { AuthLayout } from "../ui/AuthLayout";
import { LoginForm } from "../ui/LoginForm";
import { useLogin } from "../application/useLogin";
import { useAuthRedirect } from "@/hooks/auth/useAuthRedirect";

export function LoginPage() {
  // Navega por rol cuando la sesión queda autenticada.
  useAuthRedirect();
  const { login, isLoading, error } = useLogin();

  return (
    <AuthLayout>
      <LoginForm onSubmit={login} isLoading={isLoading} error={error} />
    </AuthLayout>
  );
}
