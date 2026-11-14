# Misión 2 — Migrar elegibilidad ProfessionalSpecialty

## Estado

**✅ APROBADA — 2.ª iteración — 2026-11-13.** La solicitud y la revisión global de `ProfessionalSpecialty` pasan a `src/modules/catalog/`, con reconciliación transaccional contra Profiles (D5), bloqueo pesimista por fila para la cuota de solicitudes, `REJECTED` como estado terminal y notificaciones post-commit *best-effort*. No quedan controllers/rutas legacy activos de elegibilidad.

| Iteración | Resultado | Hallazgos |
|-----------|-----------|-----------|
| 1ª | No aprobada | P2×3: (1) `ProfessionalSpecialtyAlreadyExistsError` no mapeado a HTTP 409; (2) `lockProfileForUpdate` con fallback silencioso al cliente Prisma global y contrato tipado `unknown`; (3) la prueba de concurrencia usaba un lock serializado en memoria y no verificaba el bloqueo real de PostgreSQL |
| **2ª** | **✅ Aprobada** | P2×3 resueltos: mapeo explícito a 409 (con prueba HTTP), contrato transaccional estricto tipado con `TransactionContext` (sin fallback global), y prueba de integración contra PostgreSQL con `SELECT ... FOR UPDATE` real y `pg_blocking_pids` |

---

## Objetivo

Consolidar solicitudes y revisión global de `ProfessionalSpecialty` en Catalog, sin confundir elegibilidad con oferta ni afiliación.

## Por qué

La lógica vivía en `src/modules/specialty/ProfessionalSpecialty/`, disparaba notificaciones dentro/fuera de transacción y podía cambiar el estado global del perfil. Además, la cuota de solicitudes pendientes no estaba serializada de forma demostrable.

## Límites

- `ProfessionalSpecialty` es global; no recibe `tenantId`.
- ADMIN global revisa; OWNER tenant no aprueba elegibilidad global.
- Aprobación no crea afiliación ni oferta reservable.
- Reglas de Fase 4 respetadas: solo perfiles APPROVED sin specialties aprobadas pasan a SUSPENDED; `PENDING`/`REJECTED` no se altera.
- La notificación no determina el commit de elegibilidad (post-commit best-effort).

## Aceptación

- [x] Última specialty revocada suspende el perfil con el contrato transaccional compartido ([`SuspendOnSpecialtyRevokedUseCase`](file:///c:/Users/alanq/OneDrive/Documentos/trabajo/pasatiempo/Consultorios/app-backend/src/modules/profiles/application/use-cases/suspend-on-specialty-revoked.use-case.ts) invocado en la misma transacción de Catalog).
- [x] Fallo de suspensión revierte la revisión; la concurrencia no deja perfil publicable sin elegibilidad.
- [x] Rutas y respuestas legacy probadas; sin controllers duplicados activos.

---

## Hallazgos de Revisión Resueltos

1. **[P2 Resuelto] Solicitud duplicada devolvía HTTP 400 en lugar de 409:**
   - [`catalog-error-mapper.ts`](file:///c:/Users/alanq/OneDrive/Documentos/trabajo/pasatiempo/Consultorios/app-backend/src/modules/catalog/http/catalog-error-mapper.ts) mapea explícitamente `ProfessionalSpecialtyAlreadyExistsError` → **409 Conflict**, ubicando el handler **antes** del catch-all genérico de `CatalogDomainError` (el orden es crítico para que el error específico no sea absorbido).
   - Cubierto por [`professional-specialty.controller.unit.test.ts`](file:///c:/Users/alanq/OneDrive/Documentos/trabajo/pasatiempo/Consultorios/app-backend/tests/catalog/professional-specialty.controller.unit.test.ts) (assert de `statusCode === 409`).

2. **[P2 Resuelto] Contrato transaccional de Profiles con fallback silencioso al cliente global:**
   - [`prisma-profiles-eligibility-service.ts`](file:///c:/Users/alanq/OneDrive/Documentos/trabajo/pasatiempo/Consultorios/app-backend/src/modules/profiles/infrastructure/prisma/prisma-profiles-eligibility-service.ts) tipa `txContext: TransactionContext` (antes `unknown`) y usa `requireTransactionalClient()`, que **lanza `InvalidTransactionContextError` si el contexto falta o no es válido**; se eliminó el `(txClient as any) ?? prisma`.
   - El fallback global queda reservado solo al lookup opcional `findProfileIdByUserId` (lectura que sí admite no-transacción).
   - [`app.wiring.ts`](file:///c:/Users/alanq/OneDrive/Documentos/trabajo/pasatiempo/Consultorios/app-backend/src/app.wiring.ts) propaga el `TransactionContext` sellado en lugar de extraer el cliente crudo; la extracción queda dentro de Profiles.
   - El contrato inter-módulo [`profiles-eligibility-contract.port.ts`](file:///c:/Users/alanq/OneDrive/Documentos/trabajo/pasatiempo/Consultorios/app-backend/src/modules/profiles/application/ports/profiles-eligibility-contract.port.ts) y los puertos de Catalog [`professional-profile-lookup.port.ts`](file:///c:/Users/alanq/OneDrive/Documentos/trabajo/pasatiempo/Consultorios/app-backend/src/modules/catalog/application/ports/professional-profile-lookup.port.ts) / [`profile-suspension.port.ts`](file:///c:/Users/alanq/OneDrive/Documentos/trabajo/pasatiempo/Consultorios/app-backend/src/modules/catalog/application/ports/profile-suspension.port.ts) exigen `TransactionContext`.
   - Evidencia unitaria: [`profiles-eligibility-service.unit.test.ts`](file:///c:/Users/alanq/OneDrive/Documentos/trabajo/pasatiempo/Consultorios/app-backend/tests/profiles/profiles-eligibility-service.unit.test.ts) (contexto ausente/impostor rechazado; `FOR UPDATE` sobre el cliente del contexto).

3. **[P2 Resuelto] La prueba de concurrencia no verificaba el lock real de PostgreSQL:**
   - [`professional-specialty-quota-concurrency.integration.test.ts`](file:///c:/Users/alanq/OneDrive/Documentos/trabajo/pasatiempo/Consultorios/app-backend/tests/catalog/professional-specialty-quota-concurrency.integration.test.ts) ejercita el cliente transaccional real, el `SELECT ... FOR UPDATE` del motor y el conteo real: una transacción retenedora bloquea la fila, se lanzan dos solicitudes concurrentes, se confirma con `pg_blocking_pids` que una sesión competidora queda bloqueada por el motor, se libera el lock y se verifica **exactamente 1 éxito + 1 `MaxPendingSpecialtiesExceededError`** con conteo final de pendientes = 2.
   - La prueba unitaria previa ([`professional-specialty.use-cases.unit.test.ts`](file:///c:/Users/alanq/OneDrive/Documentos/trabajo/pasatiempo/Consultorios/app-backend/tests/catalog/professional-specialty.use-cases.unit.test.ts)) se conserva como verificación del **orden del caso de uso**.

---

## Archivos creados y adaptados

### 1. Dominio — `src/modules/catalog/domain/`
- [`professional-specialty.entity.ts`](file:///c:/Users/alanq/OneDrive/Documentos/trabajo/pasatiempo/Consultorios/app-backend/src/modules/catalog/domain/professional-specialty.entity.ts): entidad con `createRequest`, `approve`, `reject` y `transitionTo` (idempotente; `REJECTED` es terminal → `InvalidSpecialtyTransitionError`).
- [`repositories/professional-specialty.repository.ts`](file:///c:/Users/alanq/OneDrive/Documentos/trabajo/pasatiempo/Consultorios/app-backend/src/modules/catalog/domain/repositories/professional-specialty.repository.ts): contrato de repositorio.
- [`catalog-errors.ts`](file:///c:/Users/alanq/OneDrive/Documentos/trabajo/pasatiempo/Consultorios/app-backend/src/modules/catalog/domain/catalog-errors.ts): errores de dominio añadidos (duplicado, cuota, transición, no encontrado).

### 2. Aplicación — `src/modules/catalog/application/`
- Casos de uso:
  - [`request-professional-specialty.use-case.ts`](file:///c:/Users/alanq/OneDrive/Documentos/trabajo/pasatiempo/Consultorios/app-backend/src/modules/catalog/application/use-cases/request-professional-specialty.use-case.ts): transacción con `lockProfileForUpdate` **antes** del conteo; valida especialidad activa, duplicado y cuota (máx. 2 pendientes).
  - [`review-professional-specialty.use-case.ts`](file:///c:/Users/alanq/OneDrive/Documentos/trabajo/pasatiempo/Consultorios/app-backend/src/modules/catalog/application/use-cases/review-professional-specialty.use-case.ts): transición de estado + reconciliación con Profiles en la misma unidad de trabajo (D5).
- Puertos:
  - [`professional-profile-lookup.port.ts`](file:///c:/Users/alanq/OneDrive/Documentos/trabajo/pasatiempo/Consultorios/app-backend/src/modules/catalog/application/ports/professional-profile-lookup.port.ts) (`findProfileIdByUserId`, `lockProfileForUpdate`).
  - [`profile-suspension.port.ts`](file:///c:/Users/alanq/OneDrive/Documentos/trabajo/pasatiempo/Consultorios/app-backend/src/modules/catalog/application/ports/profile-suspension.port.ts).
  - [`catalog-notification.port.ts`](file:///c:/Users/alanq/OneDrive/Documentos/trabajo/pasatiempo/Consultorios/app-backend/src/modules/catalog/application/ports/catalog-notification.port.ts).
- [`dto/professional-specialty.dto.ts`](file:///c:/Users/alanq/OneDrive/Documentos/trabajo/pasatiempo/Consultorios/app-backend/src/modules/catalog/application/dto/professional-specialty.dto.ts): esquemas de entrada y DTO de respuesta.

### 3. Infraestructura y HTTP — `src/modules/catalog/`
- [`prisma/prisma-professional-specialty-repository.ts`](file:///c:/Users/alanq/OneDrive/Documentos/trabajo/pasatiempo/Consultorios/app-backend/src/modules/catalog/infrastructure/prisma/prisma-professional-specialty-repository.ts).
- [`adapters/notifications-service.adapter.ts`](file:///c:/Users/alanq/OneDrive/Documentos/trabajo/pasatiempo/Consultorios/app-backend/src/modules/catalog/infrastructure/adapters/notifications-service.adapter.ts): implementación de `CatalogNotificationPort`.
- [`http/professional-specialty.controller.ts`](file:///c:/Users/alanq/OneDrive/Documentos/trabajo/pasatiempo/Consultorios/app-backend/src/modules/catalog/http/professional-specialty.controller.ts) y [`http/professional-specialty.routes.ts`](file:///c:/Users/alanq/OneDrive/Documentos/trabajo/pasatiempo/Consultorios/app-backend/src/modules/catalog/http/professional-specialty.routes.ts) (fábrica `createProfessionalSpecialtyRouter`).
- [`http/catalog-error-mapper.ts`](file:///c:/Users/alanq/OneDrive/Documentos/trabajo/pasatiempo/Consultorios/app-backend/src/modules/catalog/http/catalog-error-mapper.ts): mapeo de conflictos a 409.

### 4. Frontera Profiles — contrato transaccional (D5)
- [`application/ports/profiles-eligibility-contract.port.ts`](file:///c:/Users/alanq/OneDrive/Documentos/trabajo/pasatiempo/Consultorios/app-backend/src/modules/profiles/application/ports/profiles-eligibility-contract.port.ts).
- [`infrastructure/prisma/prisma-profiles-eligibility-service.ts`](file:///c:/Users/alanq/OneDrive/Documentos/trabajo/pasatiempo/Consultorios/app-backend/src/modules/profiles/infrastructure/prisma/prisma-profiles-eligibility-service.ts).

### 5. Composition Root e integración de rutas
- [`src/app.wiring.ts`](file:///c:/Users/alanq/OneDrive/Documentos/trabajo/pasatiempo/Consultorios/app-backend/src/app.wiring.ts): ensambla los adaptadores Catalog↔Profiles y los routers inyectados.
- [`src/modules/catalog/catalog.wiring.ts`](file:///c:/Users/alanq/OneDrive/Documentos/trabajo/pasatiempo/Consultorios/app-backend/src/modules/catalog/catalog.wiring.ts).
- [`src/app.ts`](file:///c:/Users/alanq/OneDrive/Documentos/trabajo/pasatiempo/Consultorios/app-backend/src/app.ts), [`admin/admin.routes.ts`](file:///c:/Users/alanq/OneDrive/Documentos/trabajo/pasatiempo/Consultorios/app-backend/src/modules/admin/admin.routes.ts) y [`users/professionalprofile/professionalprofile.routes.ts`](file:///c:/Users/alanq/OneDrive/Documentos/trabajo/pasatiempo/Consultorios/app-backend/src/modules/users/professionalprofile/professionalprofile.routes.ts): consumo por inyección (`createAdminRouter`, `createProfessionalProfileRouter`).

### 6. Retiro de duplicación legacy
- Eliminados [`professionalSpecialty.controller.ts`](file:///c:/Users/alanq/OneDrive/Documentos/trabajo/pasatiempo/Consultorios/app-backend/src/modules/specialty/ProfessionalSpecialty/professionalSpecialty.controller.ts) y [`professionalSpecialty.routes.ts`](file:///c:/Users/alanq/OneDrive/Documentos/trabajo/pasatiempo/Consultorios/app-backend/src/modules/specialty/ProfessionalSpecialty/professionalSpecialty.routes.ts).
- [`ProfessionalSpecialty.Service.ts`](file:///c:/Users/alanq/OneDrive/Documentos/trabajo/pasatiempo/Consultorios/app-backend/src/modules/specialty/ProfessionalSpecialty/ProfessionalSpecialty.Service.ts) reducido a *facade* de compatibilidad que delega a los casos de uso de Catalog.

### 7. Transversales
- [`shared/types/transaction-context.ts`](file:///c:/Users/alanq/OneDrive/Documentos/trabajo/pasatiempo/Consultorios/app-backend/src/shared/types/transaction-context.ts) y [`shared/database/prisma-transaction-context.ts`](file:///c:/Users/alanq/OneDrive/Documentos/trabajo/pasatiempo/Consultorios/app-backend/src/shared/database/prisma-transaction-context.ts) (extracción sellada / `InvalidTransactionContextError`).

---

## Pruebas ejecutadas

| Archivo | Pruebas |
|---|---|
| [`tests/catalog/professional-specialty.use-cases.unit.test.ts`](file:///c:/Users/alanq/OneDrive/Documentos/trabajo/pasatiempo/Consultorios/app-backend/tests/catalog/professional-specialty.use-cases.unit.test.ts) | 12 (orden del caso de uso, cuota, duplicado, transiciones) |
| [`tests/catalog/professional-specialty.controller.unit.test.ts`](file:///c:/Users/alanq/OneDrive/Documentos/trabajo/pasatiempo/Consultorios/app-backend/tests/catalog/professional-specialty.controller.unit.test.ts) | 12 (incluye HTTP 409 para duplicado) |
| [`tests/catalog/professional-specialty.routes.test.ts`](file:///c:/Users/alanq/OneDrive/Documentos/trabajo/pasatiempo/Consultorios/app-backend/tests/catalog/professional-specialty.routes.test.ts) | 8 (enrutador y middlewares) |
| [`tests/profiles/profiles-eligibility-service.unit.test.ts`](file:///c:/Users/alanq/OneDrive/Documentos/trabajo/pasatiempo/Consultorios/app-backend/tests/profiles/profiles-eligibility-service.unit.test.ts) | 4 (contrato transaccional estricto) |
| [`tests/catalog/professional-specialty-quota-concurrency.integration.test.ts`](file:///c:/Users/alanq/OneDrive/Documentos/trabajo/pasatiempo/Consultorios/app-backend/tests/catalog/professional-specialty-quota-concurrency.integration.test.ts) | 1 (integración PostgreSQL) |
| **Total Misión 2** | **37 pruebas** |

Comandos de validación:

```powershell
npx tsc --noEmit
npx vitest run tests/catalog/professional-specialty.use-cases.unit.test.ts tests/catalog/professional-specialty.controller.unit.test.ts tests/catalog/professional-specialty.routes.test.ts tests/catalog/professional-specialty-quota-concurrency.integration.test.ts tests/profiles/profiles-eligibility-service.unit.test.ts
npx vitest run
```

Resultados:

- `npx tsc --noEmit` → exit 0.
- Misión 2 (5 archivos) → **37 passed**.
- Suite completa → **60 archivos, 494 tests passed**.

## Veredicto de revisión

**APROBADA (2026-11-13).** La revisión independiente confirmó los tres hallazgos P2 resueltos. Continuar con la Misión 3 (Oferta tenant-scoped).
