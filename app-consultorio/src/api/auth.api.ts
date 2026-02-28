import api from '@/api/axios'
import type { AuthUser, LoginResponse, RegisterRequest } from '@/types/auth.types'

export const authApi = {
 register: (data: RegisterRequest) =>
    api.post<AuthUser>('/auth/register', data),

  login: (email: string, password: string) =>
    api.post<LoginResponse>('/auth/login', { email, password }),

  verify: (token: string) =>
    api.get(`/auth/verify?token=${token}`),

  refresh: (refreshToken: string) =>
    api.post('/auth/refresh', { refreshToken }),

  forgotPassword: (email: string) =>
    api.post('/auth/forgot-password', { email }),

  resetPassword: (token: string, newPassword: string) =>
    api.post('/auth/reset-password', { token, newPassword })
}
