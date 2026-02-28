import { useUsers } from "../admin.hooks";
import ProfessionalCard from "@/features/professionals/components/ProfessionalCard";

export default function UsersPage() {
  const { data: users, isLoading, isError, error } = useUsers();
  console.log(users)

  if (isLoading) return <p>Cargando usuarios...</p>;
  if (isError) return <p className="text-red-500">{error?.message || "Error"}</p>;
  const staticUrl = import.meta.env.VITE_STATIC_URL;

return (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
      {users?.map((user) =>
        user.role === "PROFESSIONAL" && user.professionalProfile ? (
         <ProfessionalCard
  key={user.id}
  professional={{
    id: user.professionalProfile.id,
    specialtyId: user.professionalProfile.specialtyId,
    user: {
      id: user.id,
      name: user.name,
      lastName: user.lastName,
      avatar: user.avatar,
    },
    specialty: user.professionalProfile.specialty ?? { id: 0, name: "Sin especialidad" },
    description: user.professionalProfile.description || "",
    certificates: user.professionalProfile.certificates || [],
    socialLinks: user.professionalProfile.socialLinks || {},
    isVerified: user.professionalProfile.isVerified ?? false,
    reviewsReceived: user.professionalProfile.reviews || [],
  }}
/>

        ) : (
          <div
            key={user.id}
            className="bg-white dark:bg-zinc-800 rounded-2xl shadow-md p-5 text-center mt-5"
          >
            <img
              src={`${staticUrl}${user.avatar }`|| "/default-avatar.png"}
              alt={`${user.name} ${user.lastName}`}
              className="w-20 h-20 rounded-full object-cover mb-4 mx-auto"
            />
            <h3 className="text-lg font-medium">
              {user.name} {user.lastName}
            </h3>
            <p className="text-sm text-gray-500">{user.role}</p>
          </div>
        )
      )}
    </div>
  );

}