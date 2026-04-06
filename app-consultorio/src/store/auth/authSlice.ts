// src/store/auth/slices/authSlice.ts
import { createSlice, type PayloadAction } from "@reduxjs/toolkit";
import type { AuthUser, LoginResponse, MeResponse } from "@/types/auth.types";

export interface AuthState {
  token: string | null;
  refreshToken: string | null;
  user: AuthUser | null;
  status: "checking" | "unauthenticated" | "authenticated" | "loading";
}

const initialState: AuthState = {
  token: null,
  refreshToken: null,
  user: null,
  status: "checking",
};

const authSlice = createSlice({
  name: "auth",
  initialState,
  reducers: {
    /* CHECKING */
    setChecking: (state) => {
      state.status = "checking";
    },

    /* LOGIN */
    setCredentials: (state, action: PayloadAction<LoginResponse>) => {
      state.token = action.payload.token;
      state.refreshToken = action.payload.refreshToken;
      state.user = action.payload.user as AuthUser;
      state.status = "authenticated";
    },

    /* ME */
    setMe: (state, action: PayloadAction<MeResponse>) => {
      state.user = {
        ...state.user,
        ...action.payload,
      } as AuthUser;

      state.status = "authenticated"; // 🔥 CLAVE
    },

    updateAvatar: (state, action: PayloadAction<string>) => {

      if (!state.user) return;

      state.user.profile = {
        ...state.user.profile,
        avatar: action.payload, // ya es la URL del backend
      };

    },

    updateProfile: (
      state,
      action: PayloadAction<{
        name?: string;
        lastName?: string;
        phone?: string;
        description?: string;
      }>,
    ) => {
      if (!state.user?.profile) return;

      state.user.profile = {
        ...state.user.profile,
        ...action.payload,
      };
    },

    /* LOGOUT */
    logout: (state) => {
      state.token = null;
      state.refreshToken = null;
      state.user = null;
      state.status = "unauthenticated";
    },
  },
});

export const {
  setChecking,
  setCredentials,
  setMe,
  updateAvatar,
  updateProfile,
  logout,
} = authSlice.actions;

export default authSlice.reducer;
