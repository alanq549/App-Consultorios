// src/routes/ProtectedRoute.tsx
import { Navigate, Outlet } from 'react-router-dom'
import { useAppSelector } from '@/hooks/auth/useRedux'

export const ProtectedRoute = () => {
  const { token, status } = useAppSelector(s => s.auth)

  // ⏳ Esperar verificación
  if (status === 'checking') {
    return <div className="w-full h-full bg-white dark:bg-black dark:text-white">Cargando sesión...</div>
  }

  // ❌ No autenticado
  if (!token || status !== 'authenticated') {
    return <Navigate to="/auth" replace />
  }

  return <Outlet />
}
