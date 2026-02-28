import { staticbackend } from "@/config/variables";
import { useAppSelector } from "@/hooks/auth/useRedux";

const ClientProfile = () => {
  const user = useAppSelector((state) => state.auth.user);

  if (!user) {
    return <p>Cargando perfil...</p>;
  }

  const { profile, email } = user;

   const avatarUrl = user.profile.avatar
      ? `${staticbackend}${user.profile.avatar}`
      : '/avatar-placeholder.png'

  return (
    <div className="mx-auto bg-gray-50 rounded-lg shadow p-6 dark:bg-neutral-800">
      <div className="flex items-center gap-4 mb-6">
        <img
          src={avatarUrl ?? "/avatar-default.png"}
          alt={profile.name}
          className="w-24 h-24 rounded-full object-cover"
        />

        <div>
          <h2 className="text-2xl font-bold">
            {profile.name} {profile.lastName}
          </h2>
          <p className="text-sm text-gray-500 dark:text-zinc-400">
            {email}
          </p>
        </div>
      </div>

      {/* resto del perfil */}
    </div>
  );
};

export default ClientProfile;
