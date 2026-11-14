# Misión 4 — Ciclo de vida y reglas de Service

## Estado

**🧩 IMPLEMENTADA — pendiente de revisión independiente — 2026-11-13.** Alcance acordado:

| Decisión de alcance | Elección |
|---|---|
| PRE-D5 (unificación UTC de `Appointment.date`) | **Incluida** como prerrequisito bloqueante de la regla de desactivación de D5 |
| Regla de duración | **Legacy conservada**: `durationMin > 0` y múltiplo de `15`, con techo `max(480)` del DTO |
| Migración del CRUD | **CRUD completo a Catalog**: `CreateService`/`UpdateService`/`DeactivateService` + listado público |
| Módulo legacy `src/modules/services/` | **Eliminado**; `/api/services` ahora lo sirve Catalog |

## Objetivo

Migrar crear, editar y desactivar ofertas reservables con ownership, elegibilidad y protección de citas coherentes.

## Archivos a crear/tocar

- Casos de uso Catalog para `CreateService`, `UpdateService`, `DeactivateService`.
- Migrar `src/modules/services/service.service.ts`, controller, DTO y routes a adapters.
- Crear política/port de lectura de citas futuras hasta que Appointments exponga su contrato; no importar Prisma de Appointments.
- Añadir validación de datos y tests unitarios/HTTP en `tests/catalog/`.

## Reglas requeridas

- Validar que el actor sea dueño de la afiliación/oferta y tenga los permisos decididos en D0.
- Validar specialty activa y elegibilidad aprobada del profesional.
- Validar nombre, duración múltiplo de 15 dentro del rango aprobado, precio/moneda y límites de actualización.
- Aplicar D0 a servicios/especialidades con citas futuras; hasta snapshots de Fase 7, no alterar términos que cambiarían reserva/histórico.
- Soft deactivate; no borrar oferta referenciada por citas.

## Evidencia de Implementación

### 1. Dominio — [`service-offer.entity.ts`](file:///c:/Users/alanq/OneDrive/Documentos/trabajo/pasatiempo/Consultorios/app-backend/src/modules/catalog/domain/offer/service-offer.entity.ts)

- Entidad `ServiceOffer` con `fromPersistence`, `toSnapshot` y getters; `affiliationId: number | null` y `profileId` deprecado.
- Invariantes de duración (`assertDuration`: entero `> 0` y múltiplo de `OFFER_SLOT_MINUTES = 15`) y techo `OFFER_MAX_DURATION_MIN = 480`.
- **D7**: `normalizePrice` normaliza string/número a decimal canónico de 2 posiciones, **rechaza >2 decimales sin redondear** y exige `price > 0`; `formatPrice` evita aritmética de punto flotante para preservar `Decimal(10,2)`.
- `termsDiffer` (D5) determina si un cambio es efectivo sobre `price`/`durationMin`/`specialtyId`.
- Errores nuevos en [`catalog-errors.ts`](file:///c:/Users/alanq/OneDrive/Documentos/trabajo/pasatiempo/Consultorios/app-backend/src/modules/catalog/domain/catalog-errors.ts): `UnauthorizedAffiliationActionError`, `ServiceOfferNotFoundError`, `ServiceOfferNameAlreadyExistsError`, `InvalidServiceOfferDataError`, `ServiceImmutableTermsWithAppointmentsError`, `ServiceHasPendingAppointmentsError`.

### 2. Puertos — sin acoplar Catalog a Profiles ni Appointments

- [`offer-write-context.port.ts`](file:///c:/Users/alanq/OneDrive/Documentos/trabajo/pasatiempo/Consultorios/app-backend/src/modules/catalog/application/ports/offer-write-context.port.ts) (D4): agrupa `professionalProfileId`, `profileApproved`, `membershipActive` y `affiliationId`; se resuelven en una sola llamada dentro de la unidad de trabajo.
- [`offer-appointment-policy.port.ts`](file:///c:/Users/alanq/OneDrive/Documentos/trabajo/pasatiempo/Consultorios/app-backend/src/modules/catalog/application/ports/offer-appointment-policy.port.ts) (D5): `countByService` y `hasBlockingAppointments`.
- Contrato público de Profiles [`professional-tenant-context.port.ts`](file:///c:/Users/alanq/OneDrive/Documentos/trabajo/pasatiempo/Consultorios/app-backend/src/modules/profiles/application/ports/professional-tenant-context.port.ts) implementado en [`prisma-professional-tenant-context.ts`](file:///c:/Users/alanq/OneDrive/Documentos/trabajo/pasatiempo/Consultorios/app-backend/src/modules/profiles/infrastructure/prisma/prisma-professional-tenant-context.ts): resuelve perfil, membresía y afiliación ACTIVE con tenant ACTIVE; si no hay perfil devuelve todo `null`/`false`.
- Adaptador D5 [`prisma-offer-appointment-policy.ts`](file:///c:/Users/alanq/OneDrive/Documentos/trabajo/pasatiempo/Consultorios/app-backend/src/modules/catalog/infrastructure/prisma/prisma-offer-appointment-policy.ts): **no importa el módulo Appointments**; sólo reutiliza `buildUTCDate` de [`@/shared/time/appointment-datetime`](file:///c:/Users/alanq/OneDrive/Documentos/trabajo/pasatiempo/Consultorios/app-backend/src/shared/time/appointment-datetime.ts) para comparar `endDateTime > now` sobre citas `PENDING`/`CONFIRMED`.

### 3. DTO y casos de uso — `src/modules/catalog/application/`

- [`service-offer.dto.ts`](file:///c:/Users/alanq/OneDrive/Documentos/trabajo/pasatiempo/Consultorios/app-backend/src/modules/catalog/application/dto/service-offer.dto.ts): `CreateServiceOfferSchema`/`UpdateServiceOfferSchema` (name 3–120, description 5–500, duración entera múltiplo de 15 `<= 480`, `price` string|number, `specialtyId` entero positivo) y `toServiceOfferResponseDTO` (precio como `string` de 2 decimales).
- [`create-service-offer.use-case.ts`](file:///c:/Users/alanq/OneDrive/Documentos/trabajo/pasatiempo/Consultorios/app-backend/src/modules/catalog/application/use-cases/create-service-offer.use-case.ts): valida precio/duración **antes** de la transacción; resuelve D4, exige especialidad activa + elegibilidad APPROVED, verifica unicidad por afiliación y crea con `affiliationId` derivado de la afiliación activa.
- [`update-service-offer.use-case.ts`](file:///c:/Users/alanq/OneDrive/Documentos/trabajo/pasatiempo/Consultorios/app-backend/src/modules/catalog/application/use-cases/update-service-offer.use-case.ts): ownership estricto (oferta de otra afiliación o legacy `null` → 404 uniforme); revalida specialty/elegibilidad si cambian; **D5** bloquea términos con citas vía `termsDiffer` + `countByService`.
- [`deactivate-service-offer.use-case.ts`](file:///c:/Users/alanq/OneDrive/Documentos/trabajo/pasatiempo/Consultorios/app-backend/src/modules/catalog/application/use-cases/deactivate-service-offer.use-case.ts): soft-delete; **idempotente** (oferta ya inactiva se devuelve sin re-evaluar política); bloquea si `hasBlockingAppointments`.
- [`list-professional-public-offers.use-case.ts`](file:///c:/Users/alanq/OneDrive/Documentos/trabajo/pasatiempo/Consultorios/app-backend/src/modules/catalog/application/use-cases/list-professional-public-offers.use-case.ts): deriva la afiliación activa; sin afiliación devuelve `null` → 404 uniforme.

### 4. Infraestructura — [`prisma-service-offer-repository.ts`](file:///c:/Users/alanq/OneDrive/Documentos/trabajo/pasatiempo/Consultorios/app-backend/src/modules/catalog/infrastructure/prisma/prisma-service-offer-repository.ts)

- `toDomain` mapea `Decimal` a string de 2 decimales e incluye `specialty`; `findByNameInAffiliation` filtra por `affiliationId` (refleja `@@unique([affiliationId, name])`) con `excludeId`; `listActiveByAffiliation` filtra `isActive: true`.

### 5. HTTP — `src/modules/catalog/http/`

- [`service-offer.controller.ts`](file:///c:/Users/alanq/OneDrive/Documentos/trabajo/pasatiempo/Consultorios/app-backend/src/modules/catalog/http/service-offer.controller.ts): `create` 201, `update` 200, `remove` 204, `listByProfessional` 404 si `null`; `mapCatalogErrorToHttp` para traducir errores de dominio.
- [`service-offer.routes.ts`](file:///c:/Users/alanq/OneDrive/Documentos/trabajo/pasatiempo/Consultorios/app-backend/src/modules/catalog/http/service-offer.routes.ts): `GET /professional/:profileId` (público, `X-Tenant-ID`) y `POST`/`PATCH`/`DELETE` con `authMiddleware` + `requireRole("PROFESSIONAL")` + `resolvePublicTenantMiddleware()` (el tenant es requerido por D4, a diferencia del legacy).
- [`catalog-error-mapper.ts`](file:///c:/Users/alanq/OneDrive/Documentos/trabajo/pasatiempo/Consultorios/app-backend/src/modules/catalog/http/catalog-error-mapper.ts): `ServiceOfferNotFoundError`→404, `ServiceOfferNameAlreadyExistsError`→409, `UnauthorizedAffiliationActionError`→403, `InvalidServiceOfferDataError`/`ServiceImmutableTermsWithAppointmentsError`/`ServiceHasPendingAppointmentsError`→400.

### 6. Wiring y migración de rutas

- [`catalog.wiring.ts`](file:///c:/Users/alanq/OneDrive/Documentos/trabajo/pasatiempo/Consultorios/app-backend/src/modules/catalog/catalog.wiring.ts): `CatalogDependencies` incorpora `offerWriteContext` y `offerAppointmentPolicy`; instancia `PrismaServiceOfferRepository` y los 4 casos de uso.
- [`app.wiring.ts`](file:///c:/Users/alanq/OneDrive/Documentos/trabajo/pasatiempo/Consultorios/app-backend/src/app.wiring.ts): instancia `PrismaProfessionalTenantContext` y define los adaptadores `offerWriteContextAdapter`/`offerAppointmentPolicyAdapter`; **se elimina la inyección de `ServiceService`**.
- [`app.ts`](file:///c:/Users/alanq/OneDrive/Documentos/trabajo/pasatiempo/Consultorios/app-backend/src/app.ts#L60): `app.use("/api/services", serviceOfferRouter)`.
- Módulo legacy eliminado: `src/modules/services/{service.controller,service.dto,service.routes,service.service,service.types}.ts`.

### 7. Serialización de D5 frente a la creación de citas — hallazgo P1 (2026-11-13)

El ciclo de vida de la oferta (Catalog) y la creación de citas (Appointments) comprobaban/mutaban la oferta sin un punto de serialización común: una reserva concurrente podía entrar **después** de la comprobación de citas de Catalog (o leer la `durationMin` antes de un cambio de términos) y dejar una cita asociada a términos modificados o a una oferta desactivada.

**Resolución — unidad de trabajo/lock común por oferta.** Ambas rutas adquieren el mismo row-level lock dentro de su transacción:

- Nuevo transversal [`service-row-lock.ts`](file:///c:/Users/alanq/OneDrive/Documentos/trabajo/pasatiempo/Consultorios/app-backend/src/shared/database/service-row-lock.ts): `lockServiceRowForUpdate(serviceId, tx)` ejecuta `SELECT id FROM "Service" WHERE id = $1 FOR UPDATE`; **exige** un `TransactionContext` activo y **rechaza** el fallback al cliente Prisma global (`InvalidTransactionContextError`) para no tomar el lock fuera de la transacción prevista.
- Puerto [`service-offer.repository.ts`](file:///c:/Users/alanq/OneDrive/Documentos/trabajo/pasatiempo/Consultorios/app-backend/src/modules/catalog/domain/repositories/service-offer.repository.ts): nuevo método `lockForUpdate(id, tx?)`, implementado en [`prisma-service-offer-repository.ts`](file:///c:/Users/alanq/OneDrive/Documentos/trabajo/pasatiempo/Consultorios/app-backend/src/modules/catalog/infrastructure/prisma/prisma-service-offer-repository.ts).
- Catalog: [`update-service-offer.use-case.ts`](file:///c:/Users/alanq/OneDrive/Documentos/trabajo/pasatiempo/Consultorios/app-backend/src/modules/catalog/application/use-cases/update-service-offer.use-case.ts) y [`deactivate-service-offer.use-case.ts`](file:///c:/Users/alanq/OneDrive/Documentos/trabajo/pasatiempo/Consultorios/app-backend/src/modules/catalog/application/use-cases/deactivate-service-offer.use-case.ts) toman el lock **antes** de leer la oferta y de contar/comprobar citas.
- Appointments: [`appointments.service.ts`](file:///c:/Users/alanq/OneDrive/Documentos/trabajo/pasatiempo/Consultorios/app-backend/src/modules/appointments/appointments.service.ts) envuelve `create`/`createGuest` en una transacción y toma el **mismo** lock antes de leer la oferta (`getServiceById`) y de insertar la cita. La notificación queda fuera de la transacción (best-effort posterior al commit).

Con esto, las dos rutas se serializan en PostgreSQL: la que llega después espera al commit de la primera y observa el estado ya consolidado (términos actualizados o `isActive = false`).

### 8. Manejo post-commit de la notificación — hallazgo P2 (2026-11-13)

En [`appointments.service.ts`](file:///c:/Users/alanq/OneDrive/Documentos/trabajo/pasatiempo/Consultorios/app-backend/src/modules/appointments/appointments.service.ts), tras commitear la transacción de persistencia, el bloque post-commit podía fallar (guard de `clientProfile` faltante o rechazo de `notifyAppointmentCreated`, incluso al crear la segunda notificación). Como la excepción se propagaba, el cliente recibía un error pese a que la cita ya existía; un reintento podía entonces generar una **reserva duplicada**.

**Resolución — best-effort observable.** La notificación se mantiene FUERA de la transacción, ahora envuelta en `try/catch`: cualquier fallo se registra con `console.error` (observable) y **no** se propaga, de modo que el flujo devuelve siempre el DTO de la cita creada. Mismo patrón best-effort ya usado en [`auth.service.ts`](file:///c:/Users/alanq/OneDrive/Documentos/trabajo/pasatiempo/Consultorios/app-backend/src/modules/auth/auth.service.ts) para email y notificación de bienvenida.

El mismo tratamiento se extendió a `updateStatusByProfessional`: las notificaciones de confirmación y cancelación (`notifyAppointmentConfirmed`/`notifyAppointmentCancelled`) se envuelven en `try/catch` tras persistir el `update`, de modo que un fallo se registra (observable) sin propagarse y el endpoint devuelve el cambio de estado ya aplicado.

---

## Pruebas ejecutadas

| Archivo | Pruebas |
|---|---|
| [`tests/catalog/service-offer.use-cases.unit.test.ts`](file:///c:/Users/alanq/OneDrive/Documentos/trabajo/pasatiempo/Consultorios/app-backend/tests/catalog/service-offer.use-cases.unit.test.ts) | 25 (create con afiliación derivada y normalización `"150.5"→"150.50"`; rechazo de `"150.555"`/`150.555` sin escritura; duración no múltiplo de 15; denegaciones D4; especialidad inactiva; elegibilidad PENDING; nombre duplicado por afiliación vs. permitido en otra; update con citas (descripción permitida, términos bloqueados); **update/deactivate adquieren el lock de fila antes de comprobar citas**; 404 por ajena/legacy; deactivate + idempotencia + bloqueo por citas; listado público y `null` sin afiliación) |
| [`tests/catalog/service-offer-concurrency.integration.test.ts`](file:///c:/Users/alanq/OneDrive/Documentos/trabajo/pasatiempo/Consultorios/app-backend/tests/catalog/service-offer-concurrency.integration.test.ts) | 2 (integración PostgreSQL: reserva vs. actualización de términos —invariante `durationMin === endMin - startMin`— y reserva vs. desactivación —exactamente una operación triunfa—; verificadas con `pg_blocking_pids` sobre el lock `FOR UPDATE` de `Service`) |
| [`tests/catalog/service-offer.routes.test.ts`](file:///c:/Users/alanq/OneDrive/Documentos/trabajo/pasatiempo/Consultorios/app-backend/tests/catalog/service-offer.routes.test.ts) | 4 (estructura de middlewares y `requireRole("PROFESSIONAL")` → 403 a CLIENT / `next()` a PROFESSIONAL) |
| [`tests/services/catalog-tenancy.http.test.ts`](file:///c:/Users/alanq/OneDrive/Documentos/trabajo/pasatiempo/Consultorios/app-backend/tests/services/catalog-tenancy.http.test.ts) | 9 (integración HTTP del aislamiento multi-tenant; **actualizado** para sembrar ofertas con `affiliationId`, coherente con D3) |
| [`tests/appointments/appointments-tenancy.http.test.ts`](file:///c:/Users/alanq/OneDrive/Documentos/trabajo/pasatiempo/Consultorios/app-backend/tests/appointments/appointments-tenancy.http.test.ts) | 16 (integración HTTP del aislamiento multi-tenant de citas; **incluye las pruebas P2: `POST /create` devuelve 201 aunque `notifyAppointmentCreated` rechace post-commit, y `PATCH /:id/status` conserva el cambio de estado aunque rechace `notifyAppointmentConfirmed`, con el fallo registrado en ambos casos**) |

Comandos de validación:

```powershell
npx tsc --noEmit
npx vitest run tests/catalog/service-offer.use-cases.unit.test.ts tests/catalog/service-offer.routes.test.ts
npx vitest run tests/catalog/service-offer-concurrency.integration.test.ts
npx vitest run tests/services/catalog-tenancy.http.test.ts
npx vitest run tests/appointments/appointments-tenancy.http.test.ts
npx vitest run
npx prisma validate
```

Resultados:

- `npx tsc --noEmit` → **exit 0**.
- `tests/catalog/service-offer.use-cases.unit.test.ts` → **25 passed**.
- `tests/catalog/service-offer-concurrency.integration.test.ts` → **2 passed** (integración PostgreSQL real).
- `tests/catalog/service-offer.routes.test.ts` → **4 passed**.
- `tests/services/catalog-tenancy.http.test.ts` → **9 passed**.
- `tests/appointments/appointments-tenancy.http.test.ts` → **16 passed**.
- Suite completa → **66 archivos, 552 tests passed**.
- `npx prisma validate` → `The schema at prisma/schema.prisma is valid 🚀`.

---

## Aceptación

- [x] La consulta o mutación de un ID de otra afiliación o de otro tenant responde 404 uniforme sin modificar/leer datos ajenos (ownership estricto por `affiliationId`; las filas legacy `null` se tratan como inexistentes).
- [x] Las actualizaciones que violan la regla de inmutabilidad de términos con citas fallan con 400 y **sin escritura parcial** (validación dentro de la transacción, antes del `update`).
- [x] La desactivación exige ausencia de citas `PENDING`/`CONFIRMED` con `endDateTime > now` y es idempotente; el borrado es soft (`isActive = false`).
- [x] Todo error de dominio se traduce explícitamente al contrato HTTP en [`catalog-error-mapper.ts`](file:///c:/Users/alanq/OneDrive/Documentos/trabajo/pasatiempo/Consultorios/app-backend/src/modules/catalog/http/catalog-error-mapper.ts); sin `catch` ni fallbacks de éxito.
- [x] Los tests cubren límites de duración/precio, ownership por afiliación, especialidad/elegibilidad y citas futuras.
- [x] La comprobación de citas (update/deactivate) y la creación de citas comparten un lock de fila por oferta, de modo que una reserva concurrente queda serializada y nunca se asocia a términos ya modificados ni a una oferta desactivada (verificado con `pg_blocking_pids`).
- [x] Un fallo en la notificación post-commit no hace fallar la respuesta: `POST /create` devuelve 201 con la cita persistida y `PATCH /:id/status` conserva el cambio de estado, registrando el fallo como best-effort observable en ambos casos (verificado con `vi.spyOn(NotificationService, ...)`).

## Veredicto de revisión

**Pendiente.** A la espera de la revisión independiente de la Misión 4. Prerrequisito bloqueante PRE-D5 (unificación UTC de `Appointment.date`) resuelto e incluido en esta misión.

