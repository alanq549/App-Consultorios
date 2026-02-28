// src/hooks/useAuthInit.ts
// src/hooks/useAuthInit.ts
import { useEffect } from "react"
import { useAppDispatch, useAppSelector } from "./useRedux"
import api from "@/api/axios"
import { setMe, logout, setChecking } from "@/store/auth/authSlice"
import { setConfig } from "@/store/config/configSlice"

export const useAuthInit = () => {
  const dispatch = useAppDispatch()
  const token = useAppSelector(s => s.auth.token)

  useEffect(() => {
    if (!token) {
      dispatch(logout())
      return
    }

    dispatch(setChecking())

    Promise.all([
      api.get("/users/me"),
      api.get("/config/me"),
    ])
      .then(([meRes, configRes]) => {
        dispatch(setMe(meRes.data))
        dispatch(setConfig(configRes.data))
      })
      .catch(() => {
        dispatch(logout())
      })
  }, [token, dispatch])
}
