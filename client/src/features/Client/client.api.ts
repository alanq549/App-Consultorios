import axiosForm from "../../services/axiosForm";
import axios from "../../services/axios";
import type { ClientProfile, UpdateClientProfileDto } from "./types";

// Obtener perfil
export const getClientProfile = async (): Promise<ClientProfile> => {
  const res = await axios.get("/client/me");
  return res.data;
};

// Actualizar perfil (con posible imagen)
export const updateClientProfile = async (data: UpdateClientProfileDto) => {
  const formData = new FormData();

  // Agregar campos de texto excluyendo avatarFile
  Object.entries(data).forEach(([key, value]) => {
    if (key !== "avatarFile" && value !== undefined && value !== null) {
      formData.append(key, value as string);
    }
  });

  // Agregar imagen si hay
  if (data.avatarFile) {
    formData.append("avatar", data.avatarFile);
  }

  const res = await axiosForm.patch("/client/me", formData);
  return res.data;
};
