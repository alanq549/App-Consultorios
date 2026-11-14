# Misión 3 — Modelar oferta por afiliación

## Estado

**🧩 IMPLEMENTADA (2.ª iteración — corrección P1) — pendiente de revisión independiente — 2026-11-13.** Alcance acordado: **modelo + migración aditiva versionada + tooling de inventario/dry-run (D8) + pruebas de integridad y tenant**. No se mueve el CRUD de `Service` a Catalog ni se cambia el reader de `Appointments` (misiones 4 y 5).

| Iteración | Resultado | Hallazgos |
|-----------|-----------|-----------|
| 1ª | No aprobada | P1×1: la FK simple no impedía que una oferta referenciara la afiliación de **otro** profesional; el clasificador marcaba ese vínculo cruzado como `ALREADY_MAPPED` en vez de error |
| **2ª** | **🧩 Pendiente** | P1 resuelto: FK **compuesta** `(affiliationId, profileId) -> (id, professionalProfileId)` y clasificación `INCONSISTENT` para vínculos cruzados, con prueba de integración que intenta persistir la combinación inválida |

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

### Garantía profesional↔afiliación (corrección P1)

La FK simple solo comprobaba que la afiliación **existiera**, no que perteneciera al mismo profesional que la oferta. Ambas referencias podían ser válidas por separado y aun así cruzar profesional/tenant. Se corrige con una **FK compuesta**:

- `ProfessionalTenantAffiliation` recibe `@@unique([id, professionalProfileId])` (clave redundante respecto de la PK, requerida como destino de la FK compuesta).
- `Service.affiliation` referencia `(affiliationId, profileId) -> (id, professionalProfileId)`.
- Con MATCH SIMPLE (semántica por defecto de PostgreSQL), cuando `affiliationId` es `NULL` el chequeo se omite → las filas legacy pendientes de backfill siguen siendo válidas; cuando está poblado, el motor exige que la afiliación sea del mismo profesional.

### Migración en dos etapas (segura y reversible)

1. **Esta misión:** `affiliationId` **NULLABLE** + índices + FK (Misión 3) y luego la **FK compuesta** de ownership (corrección P1). Las filas legacy quedan con `affiliationId = NULL` (PostgreSQL trata cada `NULL` de índice único como distinto → no hay colisiones legacy).
2. **Posterior (fuera de Misión 3):** `affiliationId NOT NULL` y retiro de `profileId`, únicamente cuando el backfill esté aplicado y verificado (ninguna fila en `NULL`).

### D8 — Backfill en tres etapas (sin defaults mágicos)

1. **Inventario:** audita todas las filas de `Service`, las afiliaciones `ACTIVE` de sus profesionales y el propietario de la afiliación ya referenciada por cada fila (no escribe).
2. **Clasificación:** por oferta → `UNIQUE` (exactamente una afiliación activa ⇒ mapping propuesto), `AMBIGUOUS` (>1 ⇒ decisión humana), `ORPHAN` (0 ⇒ decisión humana), `ALREADY_MAPPED` (ya vinculada a su **propio** profesional ⇒ se omite), `INCONSISTENT` (vinculada a una afiliación de otro profesional o inexistente ⇒ **error**).
3. **Aplicación:** solo con un mapping **aprobado por humano** (`--apply mapping.json`). Valida existencia de la oferta, que la afiliación exista y esté `ACTIVE`, y que pertenezca al mismo profesional; escribe con `updateMany({ where: { id, affiliationId: null } })` ⇒ **idempotente** y sin reasignar ofertas ya vinculadas.

---

## Evidencia de Implementación

### 1. Modelo — [`prisma/schema.prisma`](file:///c:/Users/alanq/OneDrive/Documentos/trabajo/pasatiempo/Consultorios/app-backend/prisma/schema.prisma)

- `ProfessionalTenantAffiliation`: relación inversa `services Service[]` y `@@unique([id, professionalProfileId])`.
- `Service`: `affiliationId Int?`, relación `affiliation` con **FK compuesta** `(affiliationId, profileId) -> (id, professionalProfileId)`, `@@unique([affiliationId, name])`, `@@index([affiliationId, specialtyId])`; comentarios de bloque (`///`) documentan D3, la migración en dos etapas, la garantía de ownership y la deprecación de `profileId`.

### 2. Migraciones versionadas

- [`20261113120000_service_offer_affiliation/migration.sql`](file:///c:/Users/alanq/OneDrive/Documentos/trabajo/pasatiempo/Consultorios/app-backend/prisma/migrations/20261113120000_service_offer_affiliation/migration.sql): `affiliationId` nullable, índices y FK simple.
- [`20261113130000_service_offer_affiliation_ownership/migration.sql`](file:///c:/Users/alanq/OneDrive/Documentos/trabajo/pasatiempo/Consultorios/app-backend/prisma/migrations/20261113130000_service_offer_affiliation_ownership/migration.sql): corrección P1 — índice único `(id, professionalProfileId)` + FK compuesta. Ambas con **plan de rollback documentado** en comentarios.

### 3. Tooling de backfill — `src/modules/catalog/infrastructure/legacy/`

- [`offer-affiliation-mapping.ts`](file:///c:/Users/alanq/OneDrive/Documentos/trabajo/pasatiempo/Consultorios/app-backend/src/modules/catalog/infrastructure/legacy/offer-affiliation-mapping.ts): clasificador **puro** (sin Prisma) + resumen del dry-run. Verifica la correspondencia profesional↔afiliación antes de aceptar un vínculo como `ALREADY_MAPPED`; si no corresponde (o no existe) marca `INCONSISTENT`.
- [`offer-affiliation-backfill.ts`](file:///c:/Users/alanq/OneDrive/Documentos/trabajo/pasatiempo/Consultorios/app-backend/src/modules/catalog/infrastructure/legacy/offer-affiliation-backfill.ts): `buildOfferAffiliationInventory` (Etapa 1–2, sin escritura) y `applyOfferAffiliationMappingEntries` (Etapa 3, con validaciones). CLI: sin args = **dry-run**; `--apply <mapping.json>` (formato `[{ "serviceId": number, "affiliationId": number }]`).

### 4. Pruebas — `tests/catalog/`

- [`offer-affiliation-mapping.unit.test.ts`](file:///c:/Users/alanq/OneDrive/Documentos/trabajo/pasatiempo/Consultorios/app-backend/tests/catalog/offer-affiliation-mapping.unit.test.ts): 10 pruebas del clasificador puro y del resumen (incluye `INCONSISTENT`).
- [`offer-affiliation-integrity.integration.test.ts`](file:///c:/Users/alanq/OneDrive/Documentos/trabajo/pasatiempo/Consultorios/app-backend/tests/catalog/offer-affiliation-integrity.integration.test.ts): 8 pruebas de integración contra PostgreSQL (incluye la FK compuesta).

---

## Hallazgos de Revisión Resueltos

1. **[P1 Resuelto] La base permitía asociar una oferta con la afiliación de otro profesional:**
   - `prisma/schema.prisma` reemplaza la FK simple por la **FK compuesta** `(affiliationId, profileId) -> (id, professionalProfileId)`, de modo que el modelo —y no solo el tooling— impide el vínculo cruzado. Migración [`20261113130000_service_offer_affiliation_ownership`](file:///c:/Users/alanq/OneDrive/Documentos/trabajo/pasatiempo/Consultorios/app-backend/prisma/migrations/20261113130000_service_offer_affiliation_ownership/migration.sql).
   - `offer-affiliation-mapping.ts` deja de tratar todo vínculo existente como `ALREADY_MAPPED`: solo lo hace si la afiliación pertenece al mismo profesional; en caso contrario marca `INCONSISTENT` (error contabilizado en el dry-run).
   - Nuevas pruebas: [`offer-affiliation-integrity.integration.test.ts`](file:///c:/Users/alanq/OneDrive/Documentos/trabajo/pasatiempo/Consultorios/app-backend/tests/catalog/offer-affiliation-integrity.integration.test.ts#L264-L287) intenta persistir la combinación inválida y espera `P2003` sin escribir; los casos unitarios `INCONSISTENT` (otro profesional / afiliación inexistente) viven en el test unitario del clasificador.

---

## Pruebas ejecutadas

| Archivo | Pruebas |
|---|---|
| [`tests/catalog/offer-affiliation-mapping.unit.test.ts`](file:///c:/Users/alanq/OneDrive/Documentos/trabajo/pasatiempo/Consultorios/app-backend/tests/catalog/offer-affiliation-mapping.unit.test.ts) | 10 (UNIQUE, AMBIGUOUS, ORPHAN, ALREADY_MAPPED, INCONSISTENT ×2, no reasignación, contabilidad ×2, inventario vacío) |
| [`tests/catalog/offer-affiliation-integrity.integration.test.ts`](file:///c:/Users/alanq/OneDrive/Documentos/trabajo/pasatiempo/Consultorios/app-backend/tests/catalog/offer-affiliation-integrity.integration.test.ts) | 8 (mismo nombre en dos afiliaciones, unicidad por afiliación, integridad referencial, garantía profesional↔afiliación, clasificación real, rechazo de afiliación ajena, apply idempotente, aislamiento por tenant) |
| **Total Misión 3** | **18 pruebas** |

Comandos de validación:

```powershell
npx tsc --noEmit
npx vitest run tests/catalog/offer-affiliation-mapping.unit.test.ts tests/catalog/offer-affiliation-integrity.integration.test.ts
npx vitest run
npx prisma migrate status --schema prisma/schema.prisma   # contra TEST_DATABASE_URL_PSG
```

Resultados:

- `npx tsc --noEmit` → exit 0.
- Misión 3 (2 archivos) → **18 passed**.
- Suite completa → **62 archivos, 512 tests passed** (baseline previo 60/494).
- `prisma migrate status` sobre la BD de pruebas → **6 migraciones**, `Database schema is up to date!` (ambas migraciones de Misión 3 quedaron aplicadas a la BD de pruebas).

---

## Aceptación

- [x] La base impide oferta huérfana o ligada a afiliación equivocada (FK compuesta `(affiliationId, profileId)` + unicidad por afiliación + validación en el tooling).
- [x] Un profesional con varias afiliaciones puede tener términos distintos por consultorio (unicidad por afiliación; mismo nombre permitido en afiliaciones distintas).
- [x] Dry-run contabiliza filas que se crearán, omitirán o requieren decisión humana (incluye los errores `INCONSISTENT`).
- [x] La aplicación del mapping es repetible/segura e idempotente; sin mappings aprobados no se ejecuta.

## Veredicto de revisión

**Pendiente.** A la espera de la revisión independiente de la 2.ª iteración. Misiones siguientes ya planificadas: Misión 4 (ciclo de vida de la oferta) y Misión 5 (`BookableService` / reader de Appointments).
