// src/services/axiosForm.ts
import axios from "axios";
import { store } from "../store";

const axiosForm = axios.create({
  baseURL: import.meta.env.VITE_API_URL ,
  // Importante: NO pongas headers aquí, axios lo hace solo cuando es FormData
});

axiosForm.interceptors.request.use((config) => {
  const token = store.getState().auth.token;

  if (token) {
    // Axios automáticamente maneja los headers de FormData, solo necesitamos añadir la autorización
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});

export default axiosForm;
