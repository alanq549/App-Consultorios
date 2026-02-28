// src/api/refresh.ts
import axios from 'axios'
import { store } from '@/store'
import { setCredentials, logout } from '@/store/auth/authSlice'

const refreshApi = axios.create({
  baseURL: import.meta.env.VITE_BACKEND_URL
})

export const refreshToken = async (): Promise<string> => {
  const state = store.getState()
  const refreshToken = state.auth.refreshToken

  if (!refreshToken) {
    store.dispatch(logout())
    throw new Error('No refresh token')
  }

  try {
    const response = await refreshApi.post<{
      token: string
      refreshToken: string
    }>('/auth/refresh', {
      refreshToken
    })

    store.dispatch(
      setCredentials({
        token: response.data.token,
        refreshToken: response.data.refreshToken,
        user: state.auth.user!
      })
    )

    return response.data.token
  } catch (error) {
    store.dispatch(logout())
    throw error
  }
}

