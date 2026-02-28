// src/api/users.api.ts
import api from './axios'
import type { MeResponse } from '@/types/auth.types'

export const usersApi = {
  /* ===== ME ===== */
  me: async () => {
    const { data } = await api.get<MeResponse>('/users/me')
    return data
  }
}
