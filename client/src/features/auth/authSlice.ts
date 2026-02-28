/// authSlice.ts
import { createSlice, createAsyncThunk,type PayloadAction } from "@reduxjs/toolkit";
import { loginApi, registerApi } from "./auth.api";
import type { AuthState, AuthResponse, LoginCredentials } from "../../types/auth";

import axios from "axios";

 export const initialState: AuthState = {
  user: null,
  token: null,
  loading: false,
  error: null,
};


// 🔐 Login
export const login = createAsyncThunk<AuthResponse, LoginCredentials>(
  "auth/login",
  async (credentials, thunkAPI) => {
    try {
      const data = await loginApi(credentials);
      return data;
    } catch (error) {
      if (axios.isAxiosError(error) && error.response) {
        return thunkAPI.rejectWithValue(error.response.data.message);
      }
      return thunkAPI.rejectWithValue("Error desconocido");
    }
  }
);

// 📝 Register
export const register = createAsyncThunk<AuthResponse, FormData>(
  "auth/register",
  async (formData, thunkAPI) => {
    try {
      const data = await registerApi(formData);
      return data;
    } catch (error) {
      if (axios.isAxiosError(error) && error.response) {
        return thunkAPI.rejectWithValue(error.response.data.message);
      }
      return thunkAPI.rejectWithValue("Error desconocido");
    }
  }
);


// Slice
const authSlice = createSlice({
  name: "auth",
  initialState,
  reducers: {
    logout: (state) => {
      state.user = null;
      state.token = null;
      state.loading = false; // <-- forzar a false
    },
    setCredentials: (
      state,
      action: PayloadAction<{ user: AuthResponse["user"]; token: string }>
    ) => {
      state.user = action.payload.user;
      state.token = action.payload.token;
      state.loading = false; // <-- asegurar
    },
    updateUserConfig: (state, action: PayloadAction<Partial<AuthResponse["user"]["config"]>>) => {
      if (state.user) {
        state.user = {
          ...state.user,
          config: {
            ...state.user.config,
            ...action.payload,
          },
        };
      }
    },
    updateUserProfile: (state, action: PayloadAction<Partial<AuthResponse["user"]>>) => {
      if (state.user) {
        state.user = {
          ...state.user,
          ...action.payload,
        };
      }
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(login.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(login.fulfilled, (state, action: PayloadAction<AuthResponse>) => {
        state.loading = false;
        state.user = action.payload.user;
        state.token = action.payload.token;
      })
      .addCase(login.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string | null;
      })
      .addCase(register.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(register.fulfilled, (state, action: PayloadAction<AuthResponse>) => {
        state.loading = false;
        state.user = action.payload.user;
        state.token = action.payload.token;
      })
      .addCase(register.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string | null;
      })
      // 🛠 Evita que redux-persist rehidrate con loading = true
      .addCase("persist/REHYDRATE" as never, (state) => {
        state.loading = false;
      });
  },
});

export const { logout, setCredentials, updateUserConfig, updateUserProfile } =
  authSlice.actions;
export default authSlice.reducer;