// src/services/axiosInterceptors.ts
import api from "./axios";
import { store } from "../store";

export const setupAxiosInterceptors = () => {
  api.interceptors.request.use((config) => {
    const token = store.getState().auth.token;

    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    return config;
  });

  // Interceptor de respuesta opcional
  api.interceptors.response.use(
    (response) => response,
    (error) => {
      if (error.response?.status === 401) {
        store.dispatch({ type: "auth/logout" });
        window.location.href = "/login";
      }
      return Promise.reject(error);
    }
  );
};
