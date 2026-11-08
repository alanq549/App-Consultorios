# Misión 0 — Cerrar decisiones de Profiles

## Objetivo

Convertir las precondiciones pendientes de Fase 4 en decisiones explícitas antes de migrar código o schema.

## Por qué

`REFACTOR_PHASES.md` y `BASELINE_DECISIONS.md` todavía señalan incertidumbres sobre ownership, roles, lifecycle, specialty, certificados y visibilidad. Fase 3 ya implementa afiliaciones tenant-scoped; una decisión incompatible puede romper privacidad o duplicar revisión.

## Resultado de análisis

Las ocho decisiones están detalladas como propuestas verificables en [01-DECISIONES-ARQUITECTURA.md](01-DECISIONES-ARQUITECTURA.md). Cubren cada campo con owner, scope, modificación, revisión, visibilidad y ruta, además de gaps concretos encontrados en el código.

**Estado: APPROVED (2026-11-06).** Las ocho decisiones D1–D8 han sido revisadas y aprobadas explícitamente:

- el gate de `verificationStatus` global respecto al directorio público;
- Catalog como owner de elegibilidad `ProfessionalSpecialty` y ADMIN como reviewer;
- certificados privados frente al static route actual `/certificates`;
- transición `description`/social links globales legacy a revisiones tenant-scoped.

**Seguimiento de revisión del plan (2026-10-29):** se incorporaron los cuatro hallazgos: entrega privada de certificados en Misión 6; contrato Profiles/Catalog y prueba conjunta para revocar la última specialty en Misiones 4–7; notificación best-effort con error observable en Misión 4; y retiro público intencional de `verificationStatus` con migración de clientes en Misión 3. Esto resuelve el plan, pero no sustituye aprobación de D1–D8 ni cambia gaps de runtime.

## Archivos/documentos

- Revisar [REFACTOR_PHASES.md](../REFACTOR_PHASES.md), sección Fase 4.
- Revisar [BASELINE_DECISIONS.md](../BASELINE_DECISIONS.md) y [BASELINE_OWNERSHIP.md](../BASELINE_OWNERSHIP.md).
- Registrar decisiones aceptadas en esta carpeta y actualizar documentos fuente.
- Revisar `prisma/schema.prisma`; no modificarlo en esta misión.

## Aceptación y bloqueo

- D1–D8 están documentadas con owner, scope, permisos, visibilidad y rutas observadas.
- Se distinguen revisión global del perfil, revisión tenant de afiliación y aprobación global de specialty.
- Se identifican inconsistencias de implementación sin cambiar comportamiento ni schema.
- La misión permanece **READY FOR REVIEW** hasta que un reviewer acepte/rechace las decisiones.
- No iniciar misiones dependientes de decisiones no aprobadas; no inferir defaults ni hacer migraciones.

## Checklist para el reviewer

- [x] D1 — `ClientProfile` global y de acceso personal.
- [x] D2 — `ProfessionalProfile` base global y política de publicación.
- [x] D3 — ADMIN de plataforma y `AdminProfile` personal.
- [x] D4 — lifecycle global y transición de `verificationStatus`.
- [x] D5 — owner/reviewer de `ProfessionalSpecialty`.
- [x] D6 — certificados privados sin aprobación implícita.
- [x] D7 — un rol global por `User`; permisos tenant por membership.
- [x] D8 — `description`/enlaces públicos en revisiones de afiliación.
