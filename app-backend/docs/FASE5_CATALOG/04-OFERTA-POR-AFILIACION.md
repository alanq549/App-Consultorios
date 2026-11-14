# Misión 3 — Modelar oferta por afiliación

## Estado

**🧩 IMPLEMENTADA — pendiente de revisión independiente — 2026-11-13.** Alcance acordado: **modelo + migración aditiva versionada + tooling de inventario/dry-run (D8) + pruebas de integridad y tenant**. No se mueve el CRUD de `Service` a Catalog ni se cambia el reader de `Appointments` (misiones 4 y 5).

| Decisión de alcance | Elección |
|---|---|
| Profundidad | Modelo + migración + tooling (sin mover CRUD) |
| BD objetivo (`DATABASE_URL_psg`, Neon us-east-1) | **No aplicar**; solo versionar el SQL |
| BD de pruebas (`TEST_DATABASE_URL_PSG`, Neon us-east-2) | **Aplicar** para que la integración sea evidencia real |

---

## Objetivo

Implementar el modelo de oferta reservable conforme a D0/D3, distinguiéndolo del catálogo global y de la elegibilidad profesional: cada oferta (`Service`) se vincula a una **afiliación** (`ProfessionalTenantAffiliation`), de modo que precio, duración y specialty puedan diferir por consultorio.

## Por qué

`Service` pertenecía a un perfil global (`profileId`) sin tenant ni afiliación. El listado se filtraba por afiliación activa, pero precio, duración y specialty del mismo servicio se compartían entre todas sus afiliaciones.

## Límites

- No copiar automáticamente cada `Service` a todas las afiliaciones de un profesional.
- Sin mapping fiable, bloquear backfill/rollout; no asignar tenant por defecto (D8).
- No romper citas existentes ni eliminar filas/referencias históricas.
- `ProfessionalSpecialty` sigue siendo elegibilidad global; la oferta se vincula a specialty elegible según política aprobada.

---

## Diseño Aprobado

### D3 — Oferta tenant-scoped vía afiliación

- `Service` recibe `affiliationId Int?` con relación a `ProfessionalTenantAffiliation` (`onDelete: Restrict`).
- La unicidad pasa de `@@unique([profileId, name])` a `@@unique([affiliationId, name])`: el mismo nombre de oferta puede repetirse en afiliaciones distintas, pero no dentro de una misma afiliación.
- Se añade `@@index([affiliationId, specialtyId])`; se conserva `@@index([profileId, specialtyId])` porque aún hay consultas legacy en Appointments/services.
- `profileId` queda **deprecado** (se retira en una migración posterior, tras el backfill verificado).

### Migración en dos etapas (segura y reversible)

1. **Esta misión:** `affiliationId` **NULLABLE** + índices + FK. Las filas legacy quedan con `affiliationId = NULL` (PostgreSQL trata cada `NULL` de índice único como distinto → no hay colisiones legacy).
2. **Posterior (fuera de Misión 3):** `affiliationId NOT NULL` y retiro de `profileId`, únicamente cuando el backfill esté aplicado y verificado (ninguna fila en `NULL`).

### D8 — Backfill en tres etapas (sin defaults mágicos)

1. **Inventario:** audita todas las filas de `Service` y las afiliaciones `ACTIVE` de sus profesionales (no escribe).
2. **Clasificación:** por oferta → `UNIQUE` (exactamente una afiliación activa ⇒ mapping propuesto), `AMBIGUOUS` (>1 ⇒ decisión humana), `ORPHAN` (0 ⇒ decisión humana), `ALREADY_MAPPED` (ya vinculada ⇒ se omite).
3. **Aplicación:** solo con un mapping **aprobado por humano** (`--apply mapping.json`). Valida existencia de la oferta, que la afiliación exista y esté `ACTIVE`, y que pertenezca al mismo profesional; escribe con `updateMany({ where: { id, affiliationId: null } })` ⇒ **idempotente** y sin reasignar ofertas ya vinculadas.

---

## Evidencia de Implementación

### 1. Modelo — [`prisma/schema.prisma`](file:///c:/Users/alanq/OneDrive/Documentos/trabajo/pasatiempo/Consultorios/app-backend/prisma/schema.prisma)

- `ProfessionalTenantAffiliation` recibe la relación inversa `services Service[]`.
- `Service` recibe `affiliationId Int?`, la relación `affiliation`, `@@unique([affiliationId, name])`, `@@index([affiliationId, specialtyId])`; comentarios de bloque (`///`) documentan D3, la migración en dos etapas y la deprecación de `profileId`.

### 2. Migración versionada — [`20261113120000_service_offer_affiliation/migration.sql`](file:///c:/Users/alanq/OneDrive/Documentos/trabajo/pasatiempo/Consultorios/app-backend/prisma/migrations/20261113120000_service_offer_affiliation/migration.sql)

DDL aditivo generado con `prisma migrate diff`, con **plan de rollback documentado** en comentarios (drop FK, drop índices, drop columna, recrear la unicidad `profileId`). El rollback solo es válido mientras no existan ofertas cuyo único vínculo sea `affiliationId`.

### 3. Tooling de backfill — `src/modules/catalog/infrastructure/legacy/`

- [`offer-affiliation-mapping.ts`](file:///c:/Users/alanq/OneDrive/Documentos/trabajo/pasatiempo/Consultorios/app-backend/src/modules/catalog/infrastructure/legacy/offer-affiliation-mapping.ts): clasificador **puro** (sin Prisma) + resumen del dry-run.
- [`offer-affiliation-backfill.ts`](file:///c:/Users/alanq/OneDrive/Documentos/trabajo/pasatiempo/Consultorios/app-backend/src/modules/catalog/infrastructure/legacy/offer-affiliation-backfill.ts): `buildOfferAffiliationInventory` (Etapa 1–2, sin escritura) y `applyOfferAffiliationMappingEntries` (Etapa 3, con validaciones). CLI: sin args = **dry-run**; `--apply <mapping.json>` (formato `[{ "serviceId": number, "affiliationId": number }]`).

### 4. Pruebas — `tests/catalog/`

- [`offer-affiliation-mapping.unit.test.ts`](file:///c:/Users/alanq/OneDrive/Documentos/trabajo/pasatiempo/Consultorios/app-backend/tests/catalog/offer-affiliation-mapping.unit.test.ts): 7 pruebas del clasificador puro y del resumen.
- [`offer-affiliation-integrity.integration.test.ts`](file:///c:/Users/alanq/OneDrive/Documentos/trabajo/pasatiempo/Consultorios/app-backend/tests/catalog/offer-affiliation-integrity.integration.test.ts): 7 pruebas de integración contra PostgreSQL.

---

## Pruebas ejecutadas

| Archivo | Pruebas |
|---|---|
| [`tests/catalog/offer-affiliation-mapping.unit.test.ts`](file:///c:/Users/alanq/OneDrive/Documentos/trabajo/pasatiempo/Consultorios/app-backend/tests/catalog/offer-affiliation-mapping.unit.test.ts) | 7 (UNIQUE, AMBIGUOUS, ORPHAN, ALREADY_MAPPED, no reasignación, contabilidad, inventario vacío) |
| [`tests/catalog/offer-affiliation-integrity.integration.test.ts`](file:///c:/Users/alanq/OneDrive/Documentos/trabajo/pasatiempo/Consultorios/app-backend/tests/catalog/offer-affiliation-integrity.integration.test.ts) | 7 (mismo nombre en dos afiliaciones, unicidad por afiliación, integridad referencial, clasificación real, rechazo de afiliación ajena, apply idempotente, aislamiento por tenant) |
| **Total Misión 3** | **14 pruebas** |

Comandos de validación:

```powershell
npx tsc --noEmit
npx vitest run tests/catalog/offer-affiliation-mapping.unit.test.ts tests/catalog/offer-affiliation-integrity.integration.test.ts
npx vitest run
npx prisma migrate status --schema prisma/schema.prisma   # contra TEST_DATABASE_URL_PSG
```

Resultados:

- `npx tsc --noEmit` → exit 0.
- Misión 3 (2 archivos) → **14 passed**.
- Suite completa → **62 archivos, 508 tests passed** (baseline previo 60/494).
- `prisma migrate status` sobre la BD de pruebas → **5 migraciones**, `Database schema is up to date!` (la migración de Misión 3 quedó aplicada a la BD de pruebas).

---

## Aceptación

- [x] La base impide oferta huérfana o ligada a afiliación equivocada (FK `RESTRICT` + unicidad por afiliación + validación en el tooling).
- [x] Un profesional con varias afiliaciones puede tener términos distintos por consultorio (unicidad por afiliación; mismo nombre permitido en afiliaciones distintas).
- [x] Dry-run contabiliza filas que se crearán, omitirán o requieren decisión humana.
- [x] La aplicación del mapping es repetible/segura e idempotente; sin mappings aprobados no se ejecuta.

## Veredicto de revisión

**Pendiente.** A la espera de la revisión independiente de esta misión. Misiones siguientes ya planificadas: Misión 4 (ciclo de vida de la oferta) y Misión 5 (`BookableService` / reader de Appointments).
