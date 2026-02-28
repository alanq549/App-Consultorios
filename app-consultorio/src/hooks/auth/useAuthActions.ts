// src/hooks/auth/useAuthActions.ts
import { useAppDispatch } from "@/hooks/auth/useRedux";
import { setCredentials, setMe, logout } from "@/store/auth/authSlice";
import api from "@/api/axios";
import type {
  LoginResponse,
  RegisterRequest,
} from "@/types/auth.types";
import { usersApi } from "@/api/users.api";
import { setConfig } from "@/store/config/configSlice";
import type { AuthUser } from "@/types/auth.types";

export const useAuthActions = () => {
  const dispatch = useAppDispatch();

  /* ===== LOGIN ===== */

const login = async (
  email: string,
  password: string
): Promise<AuthUser> => {
  const { data } = await api.post<LoginResponse>("/auth/login", {
    email,
    password,
  });

  // 1️⃣ login básico
  dispatch(setCredentials(data));

  // 2️⃣ completar user (perfil + config)
  const me = await usersApi.me();
  dispatch(setMe(me));

  if (me.config) {
    dispatch(setConfig(me.config));
  }

  // 3️⃣ devolver el user FINAL
  return {
    ...data.user,
    ...me,
  } as AuthUser;
};


  /* ===== REGISTER ===== */
  const register = async (payload: RegisterRequest) => {
    await api.post("/auth/register", payload);
    // ⛔ no logueamos automáticamente
    // normalmente se verifica email primero
  };

  /* ===== LOGOUT ===== */
  const logoutUser = () => {
    dispatch(logout());
  };

  return { login, register, logoutUser };
};
