/// ARCHIVO: src/modules/identity/application/ports/access-token-service.ts
/// Contrato (interfaz) que define las operaciones para generar y validar tokens de acceso.

import { ActorContext } from "@/shared/types/actor-context";

export interface AccessTokenService {
  /// Genera un token en formato string firmado a partir de los datos del actor.
  sign(actor: ActorContext): string;

  /// Decodifica y verifica la autenticidad del token, retornando la información del actor.
  verify(token: string): ActorContext;
}