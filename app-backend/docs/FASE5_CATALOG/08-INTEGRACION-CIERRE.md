# Misión 7 — Integrar, retirar legacy y cerrar Fase 5

## Objetivo

Conectar las misiones aprobadas, retirar implementaciones duplicadas y demostrar el contrato completo Catalog→Appointments.

## Archivos a revisar/tocar

- `src/app.ts`: registrar rutas Catalog una sola vez; preservar adapters de compatibilidad necesarios.
- `src/modules/services/`, `src/modules/specialty/` y `src/modules/specialty/ProfessionalSpecialty/`: retirar código legacy solo tras mover todos los consumidores.
- `src/modules/auth/`, `src/modules/profiles/` y `src/modules/appointments/`: buscar consultas cruzadas restantes.
- `tests/catalog/`, `tests/services/catalog-tenancy.http.test.ts` y tests de Appointments: suite de regresión.
- Actualizar `docs/REFACTOR_PHASES.md`, baseline y estados de misión con evidencia real.

## Validación requerida

- Tests enfocados de todas las misiones y suite backend completa.
- `npm run build` (incluye typecheck) y revisar errores.
- Validar migraciones/status en base de pruebas; revisar dry-run y mapping sin tocar datos no aprobados.
- Buscar `prisma.service`, `prisma.specialty`, `professionalSpecialty` fuera de owners/contracts.
- Verificar rutas, DTOs públicos, precio/duración, compatibilidad y aislamiento multi-tenant.

## Cierre

- Todas las decisiones D0 están aprobadas; no quedan migraciones o mappings implícitos.
- No hay dos implementaciones activas de catálogo/elegibilidad/oferta.
- Contract `CatalogReader` cubre reserva normal, guest y disponibilidad.
- Riesgos de snapshots/concurrencia que correspondan a Fase 6/7 quedan registrados, no declarados resueltos.
- Reviewer independiente aprueba sin hallazgos bloqueantes.
