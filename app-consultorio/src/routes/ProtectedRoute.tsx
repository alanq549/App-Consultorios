// src/routes/ProtectedRoute.tsx
import { Navigate, Outlet } from 'react-router-dom'
import { useAppSelector } from '@/hooks/auth/useRedux'
import { Loader2 } from 'lucide-react'

export const ProtectedRoute = () => {
  const { token, status } = useAppSelector(s => s.auth)

  // ⏳ Pantalla de carga inmersiva
  if (status === 'checking') {
    return (
      <div className="fixed inset-0 flex flex-col items-center justify-center bg-slate-50 dark:bg-neutral-950 transition-colors duration-500">
        {/* Decoración de fondo para mantener el estilo */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] bg-blue-500/5 rounded-full blur-[100px] -z-10" />
        
        <div className="relative flex flex-col items-center gap-6">
          {/* Spinner con efecto de brillo */}
          <div className="relative">
            <Loader2 
              size={42} 
              className="text-blue-600 dark:text-blue-500 animate-spin" 
              strokeWidth={1.5} 
            />
            <div className="absolute inset-0 blur-2xl bg-blue-500/20 animate-pulse" />
          </div>

          <div className="text-center space-y-1.5">
            <p className="text-[10px] font-black text-slate-400 dark:text-neutral-500 uppercase tracking-[0.4em] ml-1">
              Seguridad
            </p>
            <h2 className="text-sm font-bold text-slate-700 dark:text-neutral-200 tracking-tight">
              Sincronizando tu sesión...
            </h2>
          </div>
        </div>

        {/* Footer minimalista opcional */}
        <div className="absolute bottom-10">
          <p className="text-[9px] font-bold text-slate-300 dark:text-neutral-700 uppercase tracking-widest">
            Conexión Cifrada
          </p>
        </div>
      </div>
    )
  }

  // ❌ No autenticado
  if (!token || status !== 'authenticated') {
    return <Navigate to="/auth" replace />
  }

  return <Outlet />
}