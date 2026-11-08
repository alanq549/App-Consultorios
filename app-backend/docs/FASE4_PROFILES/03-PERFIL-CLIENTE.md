# Misión 2 — Migrar perfil de cliente

## Objetivo

Dar ownership de lectura y actualización del perfil cliente al módulo Profiles con tipos y mappers explícitos.

## Por qué

El servicio actual consulta Prisma directamente y `ClientProfileMapper.toResponse(profile: any)` pierde seguridad de tipos. El modelo contiene PII y el profile debe seguir siendo del usuario autenticado.

## Archivos a crear/tocar

- Crear caso(s) de uso `get-client-profile` y `update-client-profile` bajo `src/modules/profiles/`.
- Crear/adaptar DTO y mapper tipado usando campos permitidos de `ClientProfile`.
- Migrar o convertir en adaptadores `src/modules/users/clientprofile/clientprofile.service.ts`, `clientprofile.dto.ts` y `clientprofile.mapper.ts`.
- Adaptar `src/modules/users/users.controller.ts` para delegar sin cambiar `PATCH /api/users/profile`.
- Añadir tests unitarios/HTTP en `tests/profiles/`.

## Límites

- `ClientProfile` sigue vinculado al usuario global; no filtrar por tenant sin decisión aprobada.
- No cambiar `Appointment`, `GuestClient`, ni ownership de citas.
- Nunca permitir que el request elija `userId`; derivarlo de `req.user.id`.
- No exponer email, citas, identidad de otros usuarios ni relaciones Prisma completas.

## Aceptación

- Actualización solo modifica campos permitidos (`name`, `lastName`, `phone`).
- Perfil ajeno y perfil inexistente no producen acceso/escritura.
- Mapper no usa `any` y conserva `appointmentsCount` del contrato actual.
- `GET /api/users/me` sigue devolviendo el shape pactado.
- Pruebas de autorización, validación, privacidad y regresión pasan.
