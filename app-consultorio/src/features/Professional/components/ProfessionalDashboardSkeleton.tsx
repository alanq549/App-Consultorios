// features/Professional/components/ProfessionalDashboardSkeleton.tsx
export default function ProfessionalDashboardSkeleton() {
  return (
    <div className="space-y-6 animate-pulse p-6">
      {/* Header avatar + nombre */}
      <div className="flex items-center gap-4">
        <div className="w-16 h-16 bg-gray-300 rounded-full border"></div>
        <div className="h-6 bg-gray-300 rounded w-48"></div>
      </div>

      {/* Cards de estadísticas */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="p-4 bg-gray-200 rounded-lg h-20"></div>
        <div className="p-4 bg-gray-200 rounded-lg h-20"></div>
        {/* Puedes añadir más cards simuladas */}
      </div>

      {/* Botón de logout */}
      <div className="flex justify-center">
        <div className="mt-6 w-32 h-10 bg-gray-300 rounded-lg"></div>
      </div>
    </div>
  )
}