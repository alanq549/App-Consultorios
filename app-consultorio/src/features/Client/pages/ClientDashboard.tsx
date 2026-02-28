import { useNavigate } from 'react-router-dom'
import { useAppSelector } from '@/hooks/auth/useRedux'
import { useAuthActions } from '@/hooks/auth/useAuthActions'
import ClientDashboardSkeleton from '@/features/Client/components/ClientDashboardSkeleton'
import { staticbackend } from '@/config/variables'
import { useEffect } from 'react'

export default function ClientDashboard() {
  const user = useAppSelector(s => s.auth.user)
  const { logoutUser } = useAuthActions()
  const navigate = useNavigate()

  /// prueba del store :
  const auth = useAppSelector((s) => s.auth)

useEffect(() => {
  console.log("🧠 AUTH STORE:", auth)
}, [auth])


  if (!user || !user.profile || !user.config) {
    return <ClientDashboardSkeleton /> // loading state 
  }

  if (user.role !== 'CLIENT') return null

  const handleLogout = () => {
    logoutUser()
    navigate('/auth', { replace: true }) // redirect to auth page after logout 
  }

  const avatarUrl = user.profile.avatar
    ? `${staticbackend}${user.profile.avatar}`
    : '/avatar-placeholder.png'

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4">
        <img
          src={avatarUrl}
          alt={`Avatar de ${user.profile.name}`}
          className="w-16 h-16 rounded-full object-cover border"
        />

        <h1 className="text-2xl font-bold">
          Bienvenido {user.profile.name}
        </h1>
      </div>

      <p>Citas totales: pronto 👀</p>
      <p>Tema: {user.config.theme}</p>

<div className="flex justify-center">
  <button
    onClick={handleLogout}
    className="mt-6 px-4 py-2 bg-red-500 hover:bg-red-600 text-white font-semibold rounded-lg transition-colors"
  >
    Cerrar sesión
  </button>
</div>
    </div>
  )
}
