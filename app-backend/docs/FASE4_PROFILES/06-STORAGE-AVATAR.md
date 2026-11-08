# Misión 5 — Desacoplar almacenamiento de avatar

## Objetivo

Introducir un `StoragePort` de Profiles y sacar del caso de uso el conocimiento de paths, `fs` y borrado local.

## Por qué

`UsersService.updateAvatar` construye rutas del filesystem y borra archivos directamente. `createUploader` usa almacenamiento local, mientras la API de perfil depende de esa implementación.

## Archivos a crear/tocar

- Crear `src/modules/profiles/application/ports/storage.port.ts`: contrato de guardar/eliminar recurso.
- Crear adaptador local bajo `src/modules/profiles/infrastructure/storage/` que conserve el backend actual.
- Añadir caso de uso `update-avatar` y validación de ownership por actor/perfil.
- Adaptar `src/core/storage/upload.ts` o sustituirlo por middleware/adaptador de infraestructura de Profiles.
- Adaptar `src/modules/users/users.routes.ts`, controller y composición en `src/app.ts`.
- Añadir tests del port/caso de uso y HTTP para archivo ausente, tipo, límite y error de storage.

## Límites

- Mantener el contrato multipart y path público `/avatars/...` si no existe migración aprobada.
- No cambiar certificados en esta misión; su storage/visibilidad se decide en Misión 6.
- Borrado del avatar anterior debe tener orden y política de fallo explícitos; no perder referencia vigente antes de guardar el nuevo.
- Validar MIME/tamaño en servidor y nunca confiar en el nombre del archivo enviado.

## Aceptación

- Caso de uso no importa `fs`, `path` ni conoce directorios.
- Adaptador reporta fallos; no hay catch silencioso ni respuesta exitosa falsa.
- Fallo al guardar preserva avatar anterior.
- Validación y ownership están cubiertos por pruebas.
- Configuración de infraestructura se puede sustituir sin cambiar el caso de uso.
