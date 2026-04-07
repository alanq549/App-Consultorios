/// src/mappers/user.mapper.ts
import  type { AuthUser } from "@/types/auth.types";
import type { UserProfileUI } from "@/types/ui.types";

export const mapAuthUserToProfileUI = (
  user: AuthUser
): UserProfileUI => {
  const base = {
    id: user.id,
    fullName: `${user.profile.name} ${user.profile.lastName}`,
    email: user.email,
    phone: user.profile.phone,
    avatar: user.profile.avatar,
    role: user.role,
  };

  if (user.role === "PROFESSIONAL") {
    return {
      ...base,
      role: "PROFESSIONAL",
      specialtyName: user.profile.specialties[0]?.name || "Sin especialidad",
      description: user.profile.description,
    };
  }

  return base;
};
