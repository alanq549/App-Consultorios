// src/store/config/configSlice.ts
import { createSlice, type PayloadAction } from "@reduxjs/toolkit";
import type { CustomConfig } from "@/types/config.types";

export interface ConfigState { // <--- export
  config: CustomConfig | null;
}

const initialState: ConfigState = {
  config: null,
};

const configSlice = createSlice({
  name: "config",
  initialState,
  reducers: {
    setConfig: (state, action: PayloadAction<CustomConfig>) => {
      state.config = action.payload;
    },
    clearConfig: (state) => {
      state.config = null;
    },
  },
});

export const { setConfig, clearConfig } = configSlice.actions;
export default configSlice.reducer;