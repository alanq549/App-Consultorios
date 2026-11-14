// src/features/auth/application/useRegister.ts
import { useState } from "react";
import axios from "axios";
import { authApi } from "@/api/auth.api";
import type { RegisterRequest } from "@/types/auth.types";

/**
 * Orquesta el registro: POST /auth/register.
 * No inicia sesión; el backend dispara la verificación por correo.
 * Expone `isSuccess` para que la vista muestre la confirmación.
 */
export function useRegister() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);

  const register = async (payload: RegisterRequest): Promise<boolean> => {
    setIsLoading(true);
    setError(null);

    try {
      await authApi.register(payload);
      setIsSuccess(true);
      return true;
    } catch (err) {
      const message =
        axios.isAxiosError(err) && typeof err.response?.data?.message === "string"
          ? err.response.data.message
          : "No se pudo crear la cuenta. Revisa los datos e intenta de nuevo.";
      setError(message);
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  return { register, isLoading, error, isSuccess };
}
