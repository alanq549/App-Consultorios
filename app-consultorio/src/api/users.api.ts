// src/api/users.api.ts
import api from "./axios";
import type { MeResponse } from "@/types/auth.types";

export const usersApi = {
  /* ===== ME ===== */
  me: async () => {
    const { data } = await api.get<MeResponse>("/users/me");
    return data;
  },

  /* ===== EMAIL ===== */
changeEmail: async (currentPassword: string, newEmail: string) => {
  const { data } = await api.patch("/users/email", {
    currentPassword,
    newEmail,
  });

  return data;
},

  /* ===== PASSWORD ===== */
  changePassword: async (currentPassword: string, newPassword: string) => {
    const { data } = await api.patch("/users/password", {
      currentPassword,
      newPassword,
    });

    return data;
  },

  /* ===== AVATAR ===== */
  updateAvatar: async (file: File) => {
    const formData = new FormData();
    formData.append("avatar", file);

    const { data } = await api.patch("/users/avatar", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });

    // Devuelve solo la URL relativa que usará el frontend
    return data.avatar; 
  },

  updateProfile: async (data: {
    name?: string;
    lastName?: string;
    phone?: string;
    description?: string;
  }) => {
    const response = await api.patch("/users/profile", data);
    return response.data;
  },

  
};
