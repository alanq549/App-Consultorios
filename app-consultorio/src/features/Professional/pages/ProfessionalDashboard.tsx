// features/Professional/pages/ProfessionalDashboard.tsx
import { useNavigate } from 'react-router-dom'
import { useAppSelector } from '@/hooks/auth/useRedux'
import { useAuthActions } from '@/hooks/auth/useAuthActions'
import { useEffect } from 'react'

// Skeleton/loading temporal
import ProfessionalDashboardSkeleton from '@/features/Professional/components/ProfessionalDashboardSkeleton'
import { staticbackend } from '@/config/variables'

export default function ProfessionalDashboard() {
  const user = useAppSelector(s => s.auth.user)
  const { logoutUser } = useAuthActions()
  const navigate = useNavigate()

  const auth = useAppSelector((s) => s.auth)

  useEffect(() => {
    console.log("🧠 AUTH STORE (PROFESSIONAL):", auth)
  }, [auth])

  if (!user || !user.profile || !user.config) {
    return <ProfessionalDashboardSkeleton /> // loading state 
  }

  if (user.role !== 'PROFESSIONAL') return null

  const handleLogout = () => {
    logoutUser()
    navigate('/auth', { replace: true })
  }

  const avatarUrl = user.profile.avatar
    ? `${staticbackend}${user.profile.avatar}`
    : '/avatar-placeholder.png'

  return (
    <div className="space-y-6">
      {/* Header con avatar y nombre */}
      <div className="flex items-center gap-4">
        <img
          src={avatarUrl}
          alt={`Avatar de ${user.profile.name}`}
          className="w-16 h-16 rounded-full object-cover border"
        />
        <h1 className="text-2xl font-bold">Bienvenido {user.profile.name}</h1>
      </div>

      {/* Estadísticas / Info profesional */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="p-4  rounded-lg shadow">
          <p className="">Citas próximas</p>
          <p className="text-xl font-semibold">Pronto 👀</p>
        </div>
        <div className="p-4  rounded-lg shadow">
          <p className="">Tema</p>
          <p className="text-xl font-semibold">{user.config.theme}</p>
        </div>
        {/* Puedes añadir más cards, p. ej., pacientes, ingresos, etc. */}
      </div>

      {/* Botón de logout */}
      <div className="flex justify-center">
        <button
          onClick={handleLogout}
          className="mt-6 px-4 py-2 bg-red-500 hover:bg-red-600  font-semibold rounded-lg transition-colors"
        >
          Cerrar sesión
        </button>
      </div>
    </div>
  )
}