# Misión 4 — Revisar estado global del perfil profesional

## Objetivo

Extraer `ReviewProfessionalProfile` y operaciones de estado desde el servicio legacy, manteniendo clara la diferencia frente a afiliaciones y especialidades.

## Por qué

`AdminController` llama directamente a `ProfessionalProfileService` para listar, aprobar, rechazar y suspender. Las transiciones y un prerequisito de specialty están mezclados con Prisma y notificaciones.

## Archivos a crear/tocar

- Crear casos de uso para listar pendientes, revisar y cambiar estado en `src/modules/profiles/`.
- Crear máquina/servicio de dominio solo para las transiciones de `ProfessionalStatus` aprobadas en Misión 0.
- Exponer contrato/port de aplicación Profiles que recibe la unidad de trabajo o cliente transaccional ya abierto por Catalog. Catalog posee la transacción exterior; Profiles usa ese mismo contexto y no inicia una transacción independiente.
- Si Profiles no puede suspender el perfil al revocarse su última specialty aprobada, propaga el error para que Catalog revierta ambas escrituras (relación y perfil).
- Adaptar `src/modules/admin/admin.controller.ts` y `admin.routes.ts` como fachada HTTP.
- Clasificar el check de `ProfessionalSpecialty` como port/read contract; no transferir su ownership sin decisión de Catalog.
- Añadir tests de transiciones, autorización, condición de specialty y side effects.

## Límites

- `ADMIN` sigue siendo operador global; no representa OWNER ni membership de tenant.
- Esta revisión modifica `ProfessionalProfile.verificationStatus`, no `ProfessionalTenantAffiliation.status`.
- No reutilizar endpoints/estados de revisión de afiliación de Slice B.
- No mover la aprobación de `ProfessionalSpecialty` a Profiles si Misión 0 la asigna a Catalog.
- Notificación de revisión es best-effort post-commit: su fallo no revierte el estado ni produce error de revisión al cliente; reportar actor/perfil/acción a logs/monitoring sin ocultarlo.
- No prometer reintento/entrega garantizada en Fase 4; documentar outbox/retry como Fase 8.
- Catalog posee los cambios de elegibilidad; Profiles posee `verificationStatus`. El contrato transaccional compartido es requisito de cierre conjunto Fase 4/5.

## Aceptación

- Sólo ADMIN autenticado puede revisar; payload/status inválido se rechaza.
- Transiciones no permitidas y prerequisitos se prueban explícitamente.
- Error de persistencia revierte la revisión; fallo post-commit de notificación deja la revisión exitosa, registra fallo observable y no afirma entrega. Prueba ambos resultados.
- Rutas/respuestas legacy conservadas o cambio aprobado y documentado.
- Sin dependencia directa Admin → Prisma/servicio interno Profiles.
- Test de integración: Catalog abre una unidad de trabajo, revoca la última specialty y Profiles suspende usando el mismo contexto; ambas escrituras se confirman juntas.
- Test de fallo: forzar error en la suspensión de Profiles y verificar rollback completo: la specialty sigue aprobada y el perfil conserva su estado previo.
- Verificar que la implementación no abre una transacción anidada/independiente para la suspensión.
