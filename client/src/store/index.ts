// src/store/index.ts
import { configureStore, combineReducers } from "@reduxjs/toolkit";
import { persistReducer, persistStore } from "redux-persist";
import storage from "redux-persist/lib/storage";
import authReducer from "../features/auth/authSlice";
import customConfigReducer from "@/features/customConfig/customConfigSlice";
import { initialState as authInitialState } from "../features/auth/authSlice";
import { customConfigInitialState } from "@/features/customConfig/customConfigSlice";
const appReducer = combineReducers({
  auth: authReducer,
  customConfig: customConfigReducer,
});

const rootReducer = (
  state: ReturnType<typeof appReducer> | undefined,
  action: Parameters<typeof appReducer>[1]
) => {
  // 🔹 Detecta rehidratación y limpia estados inválidos
  if (action.type === "persist/REHYDRATE") {
    if (state?.auth?.loading) {
      state = {
        ...state,
        auth: {
          ...state.auth,
          loading: false, // forzamos a false para evitar el bug
          error: null,
        },
      };
    }
  }

  // 🔹 Detecta logout global
if (action.type === "auth/logout") {
  state = {
    auth: authInitialState,
    customConfig: customConfigInitialState,
  };
}

  return appReducer(state, action);
};


const persistConfig = {
  key: "root",
  storage,
  whitelist: ["auth", "customConfig"],
};

const persistedReducer = persistReducer(persistConfig, rootReducer);

export const store = configureStore({
  reducer: persistedReducer,
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: false,
    }),
});

export const persistor = persistStore(store);

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
