/// src/features/professional/pages/Profile.tsx
import { useAppSelector } from "@/hooks/auth/useRedux";
import { ProfileView } from "@/features/user/views/ProfileView";
import type { RootState } from "@/store";

const AdminProfile = () =>{
    const user = useAppSelector((state: RootState) => state.auth.user);

      if (!user) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4">
        <div className="w-10 h-10 border-4 border-blue-500/20 border-t-blue-500 rounded-full animate-spin" />
        <p className="text-slate-400 font-medium animate-pulse">Cargando perfil...</p>
      </div>
    );
  }
  return <ProfileView  />;
}
export default AdminProfile;