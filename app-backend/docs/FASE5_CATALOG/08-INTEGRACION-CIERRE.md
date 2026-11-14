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

## Estado

**🧩 IMPLEMENTADA — pendiente de revisión independiente — 2026-11-14.**

| Decisión de cierre | Elección |
|---|---|
| Retiro del módulo legacy `specialty` | **Completo**: eliminados `specialty.types.ts` (vacío), `specialty.dto.ts` (shim `@deprecated`) y la facade `ProfessionalSpecialty.Service.ts`; los tests que la usaban migrados a la ruta canónica de Catalog |
| `src/modules/services/` | Ya no existía (retirado en misiones previas); sin acción |
| Consulta cruzada Profiles→`professionalSpecialty` | **Aceptada y documentada** (ver Excepción registrada) |
| Backfill diferido (`catalog/infrastructure/legacy/*`) | Se conserva; riesgo de datos registrado, **no** declarado resuelto |
| Registro de rutas Catalog | Ya único en `src/app.ts` (`specialtyRouter`, `serviceOfferRouter`); sin duplicación |

## Evidencia de Implementación

### 1. Retiro del legacy `src/modules/specialty/`

- Eliminados:
  - `src/modules/specialty/specialty.types.ts` (archivo vacío; P3-CONTRACT-001).
  - `src/modules/specialty/specialty.dto.ts` (re-export `@deprecated`, sin consumidores).
  - `src/modules/specialty/ProfessionalSpecialty/ProfessionalSpecialty.Service.ts` (facade de compatibilidad).
- Migrados (única dependencia real de la facade):
  - `tests/profiles/catalog-profiles-coordination.unit.test.ts`
  - `tests/profiles/specialty-revocation-concurrency.integration.test.ts`
  Ambos invocan ahora la ruta canónica `catalogContainer.useCases.reviewProfessionalSpecialtyUseCase.execute({...})`.
- Verificación: no queda ninguna referencia a `modules/specialty` ni `ProfessionalSpecialtyService` en `src/`.

### 2. Sin duplicación activa de catálogo / elegibilidad / oferta

- Rutas Catalog montadas una sola vez en `src/app.ts`.
- El módulo `src/modules/services/` no existe; su rol lo cubre Catalog (`serviceOfferRouter`).

### 3. Excepción registrada — acceso de Profiles a `professionalSpecialty`

- `src/modules/profiles/infrastructure/prisma/prisma-catalog-specialty-checker.ts` cuenta `professionalSpecialty` (owner: Catalog) directamente.
- **Aceptado**: es un **puerto propiedad de Profiles** (`CatalogSpecialtyChecker`) implementado por un adaptador Prisma; no importa repositorios de Catalog. Lo consumen `admin.controller.ts`, `PrismaProfilesEligibilityService` y `PrismaProfessionalProfileRepository`.
- **Riesgo (Fase 6/7)**: la frontera de lectura de elegibilidad no está cerrada por contrato de Catalog. Si se formaliza, Catalog debería exponer un contrato (p. ej. `countApprovedSpecialties`) y Profiles consumirlo.

### 4. Riesgos registrados (no resueltos)

- **Backfill de afiliación (Fase 3, diferido)**: `catalog/infrastructure/legacy/offer-affiliation-backfill.ts` y `offer-affiliation-mapping.ts` permanecen; requieren inventario, mapeo aprobado y dry-run antes de `--apply`. No se ejecutó ninguna escritura en esta misión.
- **Frontera de elegibilidad Profiles↔Catalog** (punto 3).
- **Snapshots/concurrencia**: los riesgos correspondientes a Fase 6/7 quedan registrados; **no** se declaran resueltos por el contrato Catalog.

## Validación ejecutada

```powershell
npx tsc --noEmit
npx vitest run tests/profiles tests/catalog
npx vitest run
npm run build
npx prisma migrate status
```

| Comando | Resultado |
|---|---|
| `npx tsc --noEmit` | **exit 0** |
| `npx vitest run tests/profiles tests/catalog` | **19 archivos, 149 tests passed** |
| `npx vitest run` | **69 archivos, 569 tests passed** |
| `npm run build` | **exit 0** |
| `npx prisma migrate status` | **"Database schema is up to date!"** (6 migraciones) |
| Búsqueda `prisma.service\|prisma.specialty\|professionalSpecialty` en `src/` | Sólo `src/seed/*` (siembra) y el adaptador aceptado (punto 3) |

## Aceptación (verificación)

- [x] Todas las decisiones D0 aprobadas; sin migraciones o mappings implícitos.
- [x] No hay dos implementaciones activas de catálogo/elegibilidad/oferta.
- [x] Contract `CatalogReader` cubre reserva normal, guest y disponibilidad (validado en Misión 5; ver `06-BOOKABLE-SERVICE.md`).
- [x] Riesgos de snapshots/concurrencia registrados, no declarados resueltos.
- [ ] Reviewer independiente aprueba sin hallazgos bloqueantes.
