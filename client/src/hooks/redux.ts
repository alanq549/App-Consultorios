//redux.ts
import { type TypedUseSelectorHook, useDispatch, useSelector } from "react-redux";
import type { RootState, AppDispatch } from "../store";

// Usar en lugar de useDispatch con tipos claros
export const useAppDispatch = () => useDispatch<AppDispatch>();

// Usar en lugar de useSelector con RootState tipado
export const useAppSelector: TypedUseSelectorHook<RootState> = useSelector;
