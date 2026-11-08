# Misión 1 — Componer GetCurrentUser

## Objetivo

Implementar el caso de uso de lectura del usuario actual y conservar el contrato existente de `GET /api/users/me`.

## Por qué

`UsersService.me` hoy consulta `User`, elige un perfil mediante `profileServiceMap` y agrega `CustomConfig`. Esta orquestación mezcla Identity, Profiles y Preferences.

## Archivos a crear/tocar

- Crear `src/modules/profiles/application/use-cases/get-current-user.use-case.ts`: coordina lectura de identidad, perfil y configuración mediante contratos explícitos.
- Crear puertos/readers de Profiles solo si hace falta evitar importar servicios concretos de Identity/Preferences.
- Crear mapper/DTO de salida Profiles para mantener `role`, `email`, `isVerified`, `profile` y `config`.
- Adaptar `src/modules/users/users.controller.ts` o rutas actuales como fachada temporal.
- Retirar `UsersService.me` después de que la ruta delegue al caso de uso.
- Pruebas en `tests/profiles/` para forma, roles, ausencia de datos y privacidad.

## Límites

- No mover ni duplicar `User`/credenciales desde Identity.
- No mover `CustomConfig`; `ConfigService` continúa siendo dependencia legacy de Preferences.
- No cambiar respuesta, autenticación ni `GET /api/users/me`.
- No hacer `GetCurrentUser` dueño de lecturas de citas o de tenant.

## Aceptación

- Respuesta HTTP compatible con baseline para CLIENT, PROFESSIONAL y ADMIN.
- No existe dispatch `Record<Role, any>` para construir la respuesta.
- Faltas de User/perfil/configuración tienen error explícito y probado.
- DTO no serializa hash de contraseña, refresh token ni campos privados no existentes en el contrato.
- Tests HTTP y unitarios pasan junto con typecheck.
