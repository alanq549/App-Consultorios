// customConfigSlice.ts
import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import * as api from "./customConfig.api";

export interface CustomConfigState {
  data: null | { layout: string; theme: string; [key: string]: unknown };
  loading: boolean;
  error: null | string;
}

export const initialState: CustomConfigState = {
  data: null,
  loading: false,
  error: null,
};

// 👇 Obtener config del backend
export const fetchConfig = createAsyncThunk("customConfig/fetch", async () => {
  return await api.getConfig();
});

// 👇 Actualizar config parcial
export const patchConfig = createAsyncThunk(
  "customConfig/patch",
  async (payload: Partial<{ layout: string; theme: string }>) => {
    return await api.updateConfig(payload);
  }
);

const customConfigSlice = createSlice({
  name: "customConfig",
  initialState,
  reducers: {
    resetCustomConfig: (state) => {
      state.data = null;
      state.loading = false;
      state.error = null;
    },
  },
  extraReducers(builder) {
    builder
      .addCase(fetchConfig.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchConfig.fulfilled, (state, action) => {
        state.loading = false;
        state.data = action.payload;
      })
      .addCase(fetchConfig.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || "Error al cargar configuración";
      })
      .addCase(patchConfig.fulfilled, (state, action) => {
        state.data = action.payload;
      });
  },
});

// ✅ Action creators
export const { resetCustomConfig } = customConfigSlice.actions;

// ✅ Reducer
export default customConfigSlice.reducer;

// ✅ Estado inicial (para usar en logout global)
export { initialState as customConfigInitialState };
