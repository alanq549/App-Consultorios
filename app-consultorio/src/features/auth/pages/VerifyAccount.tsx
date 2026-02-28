// src/features/auth/pages/VerifyPage.tsx
import { useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { useAppDispatch } from "@/hooks/auth/useRedux";
import { setCredentials, setMe } from "@/store/auth/authSlice";
import { authApi } from "@/api/auth.api";
import { usersApi } from "@/api/users.api";
import { setConfig } from "@/store/config/configSlice";

export default function VerifyPage() {
  const [params] = useSearchParams();
  const dispatch = useAppDispatch();

 useEffect(() => {
  const verifyAccount = async () => {
    const token = params.get("token")
    if (!token) return

    try {
      const { data } = await authApi.verify(token)
      dispatch(setCredentials(data))

      const me = await usersApi.me()
      dispatch(setMe(me))

      // guardar config en el store
       if (me.config) {
            dispatch(setConfig(me.config));
          }

      // 🚀 redirect automático por hook global
    } catch (err) {
      console.error("Error verificando la cuenta:", err)
      alert("Token inválido o expirado")
    }
  }

  verifyAccount()
}, [])




  return <p>🔐 Verificando tu cuenta...</p>;
}
