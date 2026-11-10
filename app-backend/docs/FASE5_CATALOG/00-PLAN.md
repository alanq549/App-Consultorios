# Fase 5 — Plan de obra: Catalog

## Propósito

Consolidar taxonomía, elegibilidad profesional y ofertas reservables bajo `src/modules/catalog/`, en misiones implementables y revisables por separado.

## Estado y alcance

- Estado inicial: **PLANIFICADA**; no implica que la fase esté implementada o aprobada.
- Fase 3 ya cerró el aislamiento público básico por afiliación activa; no duplicar ese trabajo.
- Fase 4 aprobó Catalog como owner de `ProfessionalSpecialty` global y dejó el contrato transaccional Profiles para suspender tras revocar la última especialidad.
- Fijar primero el modelo de oferta por afiliación y su efecto sobre citas existentes; no migrar datos/schema antes de aprobar Misión 0.

## Misiones

| Orden | Plano | Resultado |
|---|---|---|
| 0 | [Decisiones de Catalog](01-PUERTA-DECISIONES.md) | Aprobar ownership, tenant scope y reglas de cambio |
| 1 | [Taxonomía Specialty](02-TAXONOMIA-SPECIALTY.md) | Mover el catálogo global al contexto Catalog |
| 2 | [Elegibilidad profesional](03-ELEGIBILIDAD-PROFESIONAL.md) | Migrar solicitud/revisión de `ProfessionalSpecialty` |
| 3 | [Oferta tenant-scoped](04-OFERTA-POR-AFILIACION.md) | Definir y persistir ofertas por afiliación con backfill controlado |
| 4 | [Ciclo de vida de ofertas](05-CICLO-OFERTA.md) | Crear, actualizar y desactivar servicios con invariantes |
| 5 | [BookableService](06-BOOKABLE-SERVICE.md) | Desacoplar Appointments de Prisma Catalog |
| 6 | [Lectura pública](07-CATALOGO-PUBLICO.md) | Publicar DTOs tenant-scoped sin modelos Prisma |
| 7 | [Integración y cierre](08-INTEGRACION-CIERRE.md) | Retirar duplicación legacy y demostrar criterios |

## Dependencias

Misión 0 bloquea 1–6. Misiones 2 y 3 dependen de 1; Misión 4 depende de 0, 2 y 3; Misión 5 depende de 3 y 4; Misión 6 depende de 1, 3 y 4. Misión 7 depende de todo el alcance aprobado.

## Reglas comunes

- `Specialty` es taxonomía de Catalog; `ProfessionalSpecialty` es elegibilidad global; una oferta por afiliación es otro concepto.
- Reutilizar la coordinación transaccional con Profiles aprobada en Fase 4.
- `X-Tenant-ID` selecciona contexto público, no autoriza ni crea afiliaciones.
- No crear backfill con asignaciones tenant por defecto; requerir inventario, mapeos aprobados y dry-run.
- No exponer modelos Prisma ni introducir imports de repositorios Catalog en Appointments.
- Preservar rutas actuales o documentar cambio intencional de compatibilidad.

## Cierre

Cerrar solo con decisiones aceptadas, migraciones/datos reconciliados, pruebas HTTP e integración, typecheck/build y revisión independiente. Registrar brechas de Fase 6/7 sin declararlas resueltas por el contrato Catalog.
