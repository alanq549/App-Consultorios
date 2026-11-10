# Misión 1 — Migrar taxonomía Specialty

## Objetivo

Dar ownership efectivo del CRUD de `Specialty` al contexto Catalog, manteniendo su alcance global aprobado en Misión 0.

## Por qué

Actualmente `SpecialtyService` mezcla persistencia, soft delete, restauración y listado. Otros módulos acceden al modelo directamente y la API devuelve entidades Prisma.

## Archivos a crear/tocar

- Crear casos de uso/DTOs bajo `src/modules/catalog/` para crear, listar, editar, desactivar y restaurar.
- Migrar o adaptar `src/modules/specialty/specialty.service.ts`, controller, DTO, routes y types.
- Mantener `src/app.ts` y rutas legacy como adapters hasta probar compatibilidad.
- Revisar `src/modules/auth/auth.service.ts` y `src/modules/services/service.service.ts` para sustituir consultas cruzadas por contrato.
- Añadir tests en `tests/catalog/` para duplicados, soft delete, restore y consulta de activa.

## Límites

- No crear `tenantId` en la taxonomía global.
- Solo ADMIN de plataforma administra taxonomía; rutas públicas leen solo activas.
- Desactivar no borra filas ni rompe relaciones históricas.
- Aplicar la decisión aprobada para ofertas activas antes de permitir desactivar una specialty.

## Aceptación

- Una única implementación de CRUD en Catalog.
- DTOs públicos no serializan modelos Prisma.
- Nombres duplicados/reactivación cumplen decisión aprobada.
- Rutas/shape existentes conservados o migración aprobada.
- Pruebas de lifecycle, permisos, compatibilidad y especialidades inactivas pasan.
