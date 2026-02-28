// src/routes/RoleGuard.tsx
import { Navigate, Outlet } from 'react-router-dom'
import { useAppSelector } from '@/hooks/auth/useRedux'
import type { Role } from '@/types/auth.types'

interface Props {
  allowed: Role[]
}

export const RoleGuard = ({ allowed }: Props) => {
  const user = useAppSelector(s => s.auth.user)

  if (!user || !allowed.includes(user.role)) {
    return <Navigate to="/" replace />
  }

  return <Outlet />
}
