// src/features/auth/application/useLogin.ts
import { useState } from "react";
import { useAppDispatch } from "@/hooks/auth/useRedux";
import { setCredentials, setMe } from "@/store/auth/authSlice";
import { setConfig } from "@/store/config/configSlice";
import { authApi } from "@/api/auth.api";
import { usersApi } from "@/api/users.api";

/**
 * Orquesta el flujo de inicio de sesión:
 * POST /auth/login → guarda credenciales → GET /users/me → actualiza config.
 * La navegación por rol la realiza `useAuthRedirect` al detectar la sesión.
 */
export function useLogin() {
  const dispatch = useAppDispatch();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const login = async (email: string, password: string): Promise<boolean> => {
    setIsLoading(true);
    setError(null);

    try {
      const { data } = await authApi.login(email, password);
      dispatch(setCredentials(data));

      const me = await usersApi.me();
      dispatch(setMe(me));
      if (me.config) dispatch(setConfig(me.config));

      return true;
    } catch {
      // Mensaje genérico: no revelar si la cuenta existe.
      setError("Credenciales incorrectas. Verifica tu correo y contraseña.");
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  return { login, isLoading, error };
}
