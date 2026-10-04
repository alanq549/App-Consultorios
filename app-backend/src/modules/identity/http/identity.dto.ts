/// ARCHIVO: src/modules/identity/http/identity.dto.ts
/// Esquemas de validación con Zod para las peticiones HTTP del módulo de identidad.

import { z } from "zod";

/// Valida que la petición contenga un correo electrónico con formato válido y una contraseña.
export const LoginDTO = z.object({
  email: z.string().email(),
  password: z.string(),
});

/// Valida que la petición de verificación contenga un token no vacío.
export const VerifyEmailDTO = z.object({
  token: z.string().min(1),
});