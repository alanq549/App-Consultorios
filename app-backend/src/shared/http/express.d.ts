/// ARCHIVO: src/shared/http/express.d.ts
/// Extiende Express para que Request conozca el actor autenticado.

import type { ActorContext } from "@/shared/types/actor-context";


declare global {
  namespace Express {
    /// Agrega la propiedad `user` a las peticiones HTTP (`req`).
    /// Es opcional (`?`) porque no todas las rutas requieren autenticación.
    interface Request {
      user?: ActorContext;
    }
  }
}

/// Convierte el archivo en un módulo para aplicar los cambios de forma global.
export {};