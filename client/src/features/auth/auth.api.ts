// src/api/auth.ts
import api from "../../services/axios"; // tu instancia personalizada
import type { LoginCredentials, AuthResponse } from "../../types/auth";
import axios from "axios"; // axios directo, no la instancia

export const loginApi = async (credentials: LoginCredentials): Promise<AuthResponse> => {
  const response = await api.post("/auth/login", credentials); // no hace falta repetir la baseURL
  return response.data;
};

export const registerApi = async (formData: FormData): Promise<AuthResponse> => {
    console.log("Llamando a registerApi...");

  const response = await axios.post(
    `${import.meta.env.VITE_API_URL || "http://localhost:3000/api"}/auth/register`,
    
    formData
  );
  console.log("Respuesta de registerApi:", response.data)
  return response.data;
};