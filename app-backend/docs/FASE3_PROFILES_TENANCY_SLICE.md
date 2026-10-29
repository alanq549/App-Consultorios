# Slice Profiles–Tenancy — plan ejecutable

## Estado real

| Parte | Estado |
|---|---|
| A — directorio público tenant-scoped | **APPROVED** (2026-10-15); schema/migración y queries ya están. |
| B — afiliación propia, revisión OWNER y auditoría | **COMPLETED & TESTED** y cerrado (2026-10-23); dominio (33/33), casos de uso y UoW transaccional, HTTP (`/api/professionals/me/affiliations`, `/api/tenancy/affiliations`), validación de tenant activo, concurrencia pesimista en PostgreSQL verificada a nivel de repositorio y de caso de uso, y pruebas E2E (102/102). Sin hallazgos abiertos del Code Reviewer. |
| C — retención de auditoría (C1) | **COMPLETED & TESTED** (2026-10-24): migración, `CHECK`, adaptador Prisma, wiring del Unit of Work y pruebas de integración. |
| C2 — purga de auditoría | **COMPLETED & TESTED** (2026-10-24): puerto, adaptador Prisma, caso de uso y pruebas de integración. El backfill sigue diferido: requiere mappings perfil–tenant explícitos y hoy no hay fuente. |
| D — tenancy de Catalog/Services | **COMPLETED & TESTED** (2026-10-27): aislamiento por derivación de afiliación activa en `Service` y `specialty`/`ProfessionalSpecialty`, header `X-Tenant-ID` obligatorio en las rutas públicas, `404` uniforme y pruebas HTTP de acceso cruzado entre tenants. Sin migración ni backfill. |
| E — tenancy de Scheduling | **COMPLETED & TESTED** (2026-10-27): aislamiento por derivación de afiliación activa en `Schedule`, header `X-Tenant-ID` obligatorio en la lectura pública, `404` uniforme y escritura autenticada sin asignar tenant por defecto. Sin migración ni backfill. |
| F — tenancy de Appointments | **COMPLETED & TESTED** (2026-10-28): aislamiento por derivación de afiliación activa en reserva y disponibilidad (header + afiliación), lecturas propias sólo por propiedad, y cron reescrito como orquestador global (`processAppointmentLifecycle`) que procesa citas de todos los tenants sin asumir uno por defecto. Sin migración ni backfill. |
| G — tenancy de Reviews | **COMPLETED & TESTED** (2026-10-28): listado público por afiliación activa (header + afiliación, 404 uniforme) y lecturas/escritura acotadas por participación en la cita. El agregado `ratingAvg`/`ratingCount` permanece global y su agregación por tenant queda diferida. Sin migración ni backfill. |
| H — inventario de jobs | **COMPLETED** (2026-10-28): clasificación de todos los procesos no interactivos (cron, purga, holds, cola muerta, seeds). Ningún job asume un tenant por defecto, por lo que no hubo cambios de código de tenancy. Mitigado (2026-10-28): `processAppointmentLifecycle` usa `updateMany` con el estado esperado y notifica sólo si `count === 1` (idempotencia ante múltiples réplicas, sin infraestructura extra). |

El schema/migración aditiva ya contiene afiliación, revisiones, links y auditoría. No crear otra migración salvo que el diseño revisado detecte un gap concreto.

## Cierre del slice y de la Fase 3

A–H están cerrados. El **backfill** de mappings perfil–tenant queda **formalmente diferido** (sin fuente; no se asignan tenants por defecto). El cierre es **dentro del alcance de estos slices**, no una declaración de que toda la aplicación sea tenant-safe: las superficies no cubiertas —`users`/`clientprofile`/`adminprofile`, `config` (`CustomConfig`), `notifications`, `admin` e `identity`— **no se declaran tenant-safe** y quedan pendientes de una fase posterior; el detalle está en [FASE3_TENANCY.md](FASE3_TENANCY.md).

## Revisión de lo implementado para B

Existen estados/tipos, máquina de estados, puertos de membership/afiliación/revisión/auditoría/tenant-checker, casos de uso completos para profesional y OWNER, adaptadores Prisma transaccionales (`PrismaAffiliationUnitOfWork`), endpoints HTTP protegidos y pruebas unitarias, de integración PostgreSQL y HTTP E2E.

Validación observada:

- `npx tsc --noEmit`: pasa sin errores (0).
- `npm run build`: `tsc && tsc-alias` compila a `dist/` exitosamente (0).
- `npx vitest run tests/profiles/profiles-affiliations`: **102/102 tests aprobados** (10 archivos de prueba).
- `npx vitest run`: **185/185 tests aprobados** en toda la suite (23 archivos de prueba sin regresiones).
- `npx vitest run tests/profiles/profiles-affiliations/concurrency-and-locking.integration.test.ts`: **7/7 tests aprobados**; comprueba en `pg_stat_activity`/`pg_blocking_pids` que el `FOR UPDATE` sobre `ProfessionalTenantAffiliation` se emite tanto en el repositorio como en los casos de uso de envío de contenido y de decisión del OWNER.
- Falsación ejecutada (mutación temporal, revertida): al retirar el lock del caso de uso, la sesión competidora queda bloqueada por la FK del `INSERT` (`KEY SHARE`), no por el `FOR UPDATE`; la aserción exige la sentencia específica, por lo que un bloqueo incidental no satisface la prueba.

## Orden de implementación de B

1. **Aplicación/persistencia:** use cases de solicitar/reabrir, consultar/editar contenido; OWNER lista, aprueba, rechaza, suspende y reactiva. Persistir cada transición y evento de auditoría en una transacción. Revalidar tenant y membership en cada operación.
2. **HTTP:** rutas protegidas para profesional y OWNER bajo `/api/professionals` y `/api/tenancy`; mantener `/api/tenancy/current`, registro legacy y directorio A sin cambios.
3. **Integración/revisión:** pruebas A/B, roles, autoaprobación, concurrencia, rollback de auditoría, contrato HTTP; suite, typecheck y build; enviar B al reviewer.

## Contrato mínimo de B

- Profesional: solicitar/reabrir, leer su afiliación, proponer descripción/enlaces, retirarse.
- OWNER activo distinto: listar, aprobar/rechazar afiliación o revisión, suspender/reactivar/retirar con motivo cuando corresponda.
- Rechazo de postulación cambia afiliación a `REJECTED`; rechazo de edición conserva `ACTIVE` y la versión publicada.
- `ADMIN` global no da permisos tenant. MEMBER no revisa ni administra afiliaciones ajenas.
- Todo lookup/escritura incluye `tenantId` en persistencia; ID de otro tenant se trata como no encontrado.

## Fuera de B

Catalog/ofertas, Services, Scheduling, Appointments, Reviews, clientes, certificados públicos, onboarding, cron y administración global.

## Operación diferida (C)

Backfill solo con mappings explícitos aprobados y dry-run; hoy no hay fuente para asignar perfiles existentes. Purga de eventos implementada (C2, 2026-10-24): se ejecuta por tenant, de forma controlada e idempotente y sin cron automático, respetando `isEventOnHold()` y la retención de 24 meses desde `createdAt`.

### C1 — Retención de auditoría (`ProfessionalAffiliationAuditHold`)

Blueprint aprobado con ajustes (2026-10-23). Invariantes y dónde se garantizan:

| Regla | Dónde se garantiza |
|---|---|
| `auditEventId != null → affiliationId != null` | SQL `CHECK` |
| `releasedAt ↔ releasedByUserId` (ambos nulos o ambos presentes) | SQL `CHECK` |
| `releasedAt >= createdAt` | SQL `CHECK` |
| FK `tenantId` → `Tenant` (`onDelete: Restrict`) | PostgreSQL |
| FK `affiliationId` → `ProfessionalTenantAffiliation` (`onDelete: Restrict`) | PostgreSQL |
| FK `auditEventId` → `ProfessionalAffiliationAuditEvent` (`onDelete: SetNull`) | PostgreSQL |
| `tenantId == affiliation.tenantId` | aplicación/adaptador |
| `tenantId == event.tenantId` | aplicación/adaptador |
| `event.affiliationId == hold.affiliationId` | aplicación/adaptador |
| hold activo = no liberado (`releasedAt` nulo) y no expirado (`expiresAt` nulo o futuro) | dominio/consulta |
| múltiples holds permitidos | diseño (sin `UNIQUE`) |
| evento protegido de purga mientras exista hold activo | `isEventOnHold()` + purga |

Decisiones registradas:

- `auditEventId` usa `onDelete: SetNull` deliberadamente: un hold histórico ya liberado o expirado no debe bloquear la purga física del evento. Al purgar, PostgreSQL anula la referencia y el hold conserva `tenantId`, `affiliationId`, `reason`, actor y fechas, preservando la traza de que existió el hold.
- La consistencia entre `tenant`, `affiliation` y `auditEvent` cruza tablas y no es expresable con `CHECK`; es invariante obligatoria del caso de uso/adaptador antes de crear el hold.

Estado de C1 (2026-10-24): **COMPLETED & TESTED**.

Implementado:

- Migración `20261024120000_affiliation_audit_hold`: tabla, índices, `CHECK` (alcance, emparejamiento de liberación, `releasedAt >= createdAt`) y FKs. Aplicada al entorno de test.
- Puerto `AuditHoldRepository` con alcance normalizado en `audit-hold-scope.ts` y errores de dominio dedicados (`InvalidAuditHoldScopeError`, `AuditEventNotFoundError`, `AuditHoldScopeMismatchError`, `AuditHoldNotFoundError`, `AuditHoldAlreadyReleasedError`).
- Casos de uso `CreateAuditHoldUseCase` (autoriza OWNER activo, exige motivo, valida alcance y consistencia tenant/afiliación/evento, y toma el actor del contexto autenticado) y `ReleaseAuditHoldUseCase` (liberación condicional, sin sobrescribir la liberación original).
- Adaptador `PrismaAffiliationAuditHoldRepository`: `create`, `release` (actualización condicional atómica `UPDATE … WHERE releasedAt IS NULL`) e `isEventOnHold` (vigencia estricta por alcance), enlazado en `AffiliationTransactionalRepositories`.
- Hallazgo P2 resuelto: el instante de liberación lo asigna la base de datos con `statement_timestamp()` (la hora de la sentencia `UPDATE`), no el reloj de la aplicación, de modo que el `CHECK releasedAt >= createdAt` se evalúa con un único reloj y no depende de la deriva entre servidores. Se usa `statement_timestamp()` y no `CURRENT_TIMESTAMP` porque este último devuelve la hora de inicio de la transacción y podría ser anterior a `createdAt` en una transacción larga. El puerto `release(tenantId, holdId, releasedByUserId)` ya no recibe el instante.
- Hallazgo de reloj en la creación (2026-10-27): con la liberación ya en reloj de base, el `CHECK releasedAt >= createdAt` seguía violándose de forma intermitente (`23514`). Medición directa: Prisma resuelve `@default(now())` en el **cliente** (reloj del proceso Node), mientras `releasedAt` sale de PostgreSQL, y en esta máquina se midió una deriva ≈330 ms con Neon por detrás; el `CHECK` compara dos relojes distintos. Corrección: `create()` del adaptador usa un `INSERT` explícito que **omite `createdAt`**, dejando actuar el `DEFAULT CURRENT_TIMESTAMP` de la tabla, y asigna `updatedAt` (que no tiene `DEFAULT` en base porque Prisma lo resuelve con `@updatedAt`) con `statement_timestamp()` en la misma sentencia. Así ambos sellos son de PostgreSQL. Se descartó `dbgenerated("CURRENT_TIMESTAMP")` en el esquema: `prisma migrate diff` contra la BD de test emitía un `ALTER COLUMN … SET DEFAULT` perpetuo (deriva de esquema); con `@default(now())` el diff es vacío.

Validación observada:

- `npx tsc --noEmit`: 0 errores.
- `npm run build`: compila a `dist/` (0).
- `npx vitest run tests/profiles/profiles-affiliations/audit-hold.repository.integration.test.ts`: **13/13** (alcance, `CHECK` de alcance y de emparejamiento, liberación en flujo normal con instante de la base de datos, liberación dentro de una transacción iniciada antes de crear la retención, no sobrescritura, aislamiento por tenant y vigencia de `isEventOnHold`). Reejecutado el 2026-10-27 tras la corrección del reloj de creación: **13/13** en 15.59 s, sin violaciones de `23514`.
- `npx vitest run tests/profiles/profiles-affiliations/audit-hold.use-case.unit.test.ts`: **17/17**.
- `npx vitest run`: **231/231** en 27 archivos (22.28 s el 2026-10-27), sin regresiones ni violaciones del `CHECK`.

Estabilidad de CI (2026-10-27): la prueba de concurrencia rozaba el timeout por defecto con la latencia de Neon. Se fijó `testTimeout: 20_000` global en `vitest.config.ts` y `SUITE_TIMEOUT_MS = 20_000` en el `describe` de `concurrency-and-locking.integration.test.ts`. Con el timeout por defecto del CLI, `concurrency-and-locking.integration.test.ts` pasa **7/7** (15.9 s) y la suite completa queda **231/231**, de modo que la validación habitual de CI deja de ser intermitente.

Alcance de C1: no incluye endpoints HTTP ni la purga consumidora de `isEventOnHold` (C2).

### C2 — Purga de auditoría vencida

Estado (2026-10-24): **COMPLETED & TESTED**.

Reglas:

| Regla | Detalle |
|---|---|
| Retención por defecto | 24 meses desde `createdAt` (`AUDIT_RETENTION_MONTHS`). |
| Elegibilidad | `createdAt` estrictamente anterior al corte (comparación estricta: `createdAt == corte` no se purga). |
| Protección | Nunca se purga un evento cubierto por una retención vigente (`isEventOnHold`), en cualquiera de los tres alcances. Un hold liberado o expirado no protege. |
| Ejecución | Controlada y sin cron automático: el operador invoca el caso de uso por tenant, opcionalmente en seco (`dryRun`) y con lote acotado (`batchSize`, por defecto 500). |
| Idempotencia | Repetir la ejecución sólo elimina lo que siga siendo elegible; `purgeable` reporta el remanente pendiente. |
| Aislamiento | La purga siempre lleva `tenantId`; nunca cruza tenants. |

Implementado:

- Puerto `AffiliationAuditPurgeRepository` (`countPurgeable`, `purge`), separado del puerto append-only `AffiliationAuditRepository`.
- Adaptador `PrismaAffiliationAuditPurgeRepository`: un único predicado `NOT EXISTS` sobre `ProfessionalAffiliationAuditHold` que replica la semántica de `isEventOnHold`, aplicado tanto al conteo como al `DELETE`, de modo que un hold vigente nunca sea ignorado.
- Caso de uso `PurgeAffiliationAuditUseCase`: rechaza una política inválida antes de tocar la base de datos (`InvalidRetentionPolicyError`), calcula el corte desde `now` y `retentionMonths`, y sólo elimina cuando no es `dryRun`.
- Al purgar un evento retenido por un hold histórico liberado, PostgreSQL anula `auditEventId` (`onDelete: SetNull`) y el hold se conserva con su tenant, afiliación, motivo, actor y fechas.

Validación observada:

- `npx tsc --noEmit`: 0 errores.
- `npm run build`: compila a `dist/` (0).
- `npx vitest run tests/profiles/profiles-affiliations/purge-affiliation-audit.use-case.unit.test.ts`: **6/6** (retención por defecto, `dryRun`, política y lote personalizados, idempotencia, rechazo de política inválida).
- `npx vitest run tests/profiles/profiles-affiliations/audit-purge.repository.integration.test.ts`: **10/10** (vencidos vs. recientes, comparación estricta en el corte, los tres alcances de hold, hold liberado/expirado, supervivencia del hold histórico con `auditEventId` nulo, aislamiento por tenant, lote, idempotencia y `countPurgeable == purgado`).
- `npx vitest run`: **231/231** en 27 archivos (22.28 s el 2026-10-27), sin regresiones.

Fuera de C2: el backfill permanece diferido — requiere pares perfil–tenant explícitos y aprobados con dry-run, y hoy no hay fuente para asignar perfiles existentes. No se asignan tenants por defecto.

### D — Tenancy de Catalog/Services

Estado (2026-10-27): **COMPLETED & TESTED**.

Objetivo: aislar por tenant la primera superficie operativa (catálogo) sin introducir migración ni backfill, manteniendo la Fase 3 abierta para las superficies restantes.

Diseño del alcance:

- Las tablas operativas (`Service`, `Specialty`, `ProfessionalSpecialty`) **no** tienen `tenantId`; la pertenencia al tenant se **deriva** de una `ProfessionalTenantAffiliation` con `status = ACTIVE` sobre un `Tenant` con `status = ACTIVE`. La denormalización de `tenantId` en estas tablas queda diferida (Fase 10).
- Transporte del tenant: header `X-Tenant-ID` (`TENANT_SELECTOR_HEADER`), validado con `parseTenantId()`; `resolvePublicTenantMiddleware()` guarda `res.locals.tenantId`.
- Respuesta de no pertenencia: **`404` uniforme** ("Perfil profesional no encontrado") para no revelar existencia de tenants/perfiles (mitigación de enumeración).

Reglas:

| Regla | Detalle |
|---|---|
| Afiliación activa obligatoria | El profesional sólo expone su catálogo en tenants donde tiene afiliación `ACTIVE` y el tenant está `ACTIVE`. |
| Aislamiento por tenant | El catálogo de un profesional nunca es visible desde un tenant donde no está afiliado. |
| Selector obligatorio | Las rutas públicas de catálogo exigen `X-Tenant-ID` válido; sin él o inválido → `400`; tenant inexistente/inactivo o sin afiliación → `404`. |
| Sin backfill | No se asignan tenants por defecto; la resolución es por join con la afiliación activa. |

Implementado:

- Puerto `ActiveAffiliationChecker` (`hasActiveAffiliation(professionalProfileId, tenantId)`) en `profiles/affiliations/application/ports`.
- Adaptador `PrismaActiveAffiliationChecker`: busca una afiliación `ACTIVE` con tenant `ACTIVE` y devuelve booleano.
- `service.service.ts` / `specialty.service.ts`: `findByProfessional` / `listByProfessional` reciben `tenantId` y devuelven `null` sin afiliación activa.
- `service.controller.ts` / `specialty.controller.ts`: leen `res.locals.tenantId` y responden `404` uniforme ante `null`.
- `service.routes.ts` / `specialty.routes.ts`: `GET /professional/:profileId` ahora pasa por `resolvePublicTenantMiddleware()`.

Validación observada:

- `npx tsc --noEmit`: 0 errores.
- `npm run build`: `tsc && tsc-alias` compila a `dist/` (0).
- `npx vitest run tests/services/catalog-tenancy.http.test.ts`: **9/9** — expone servicios y especialidades del profesional sólo en su tenant; no expone el perfil de otro tenant (`404`); no expone el profesional desde el tenant propio si está afiliado a otro; sin selector o con selector inválido (`"abc"`, `"0"`) → `400`; tenant inexistente o inactivo → `404`; afiliación `SUSPENDED` → `404`.
- `npx vitest run`: **240/240** en 28 archivos, sin regresiones (base previa 231/231).

Fuera de D: no incluye Scheduling, Appointments, Reviews ni jobs; no denormaliza `tenantId`; no ejecuta backfill. La Fase 3 **permanece abierta**.

### E — Tenancy de Scheduling

Estado (2026-10-27): **COMPLETED & TESTED**.

Objetivo: aislar por tenant la superficie de agenda (`Schedule`) antes de Appointments, para no duplicar después la lógica de disponibilidad; sin migración ni backfill.

Diseño del alcance:

- `Schedule` **no** tiene `tenantId`: la pertenencia al tenant se **deriva** de una `ProfessionalTenantAffiliation` `ACTIVE` sobre un `Tenant` `ACTIVE`, con el mismo puerto `ActiveAffiliationChecker` que Catalog.
- Rutas: la lectura pública (`GET /api/schedules/professional/:profileId`) exige `X-Tenant-ID` válido vía `resolvePublicTenantMiddleware()`; las escrituras (`POST /`, `PUT /:id`, `DELETE /:id`) siguen autenticadas como el propio profesional (`req.user!.id` → su perfil) y **no** asignan ni exigen tenant: la agenda pertenece al perfil.
- Respuesta de no pertenencia: **`404` uniforme** ("Perfil profesional no encontrado").

Implementado:

- `schedule.service.ts`: `findByProfessional(profileId, tenantId)` devuelve `null` sin afiliación activa.
- `schedule.controller.ts`: `listByProfessional` lee `res.locals.tenantId` y responde `404` uniforme ante `null`.
- `schedule.routes.ts`: `GET /professional/:profileId` pasa por `resolvePublicTenantMiddleware()`.

Validación observada:

- `npx tsc --noEmit`: 0 errores.
- `npm run build`: OK.
- `npx vitest run tests/schedules/schedule-tenancy.http.test.ts`: **9/9** — expone la agenda sólo en el tenant con afiliación activa; no expone la del profesional ajeno desde el tenant propio (`404`); sin selector/selector inválido → `400`; tenant inexistente/inactivo o afiliación `SUSPENDED` → `404`; el profesional crea su bloque autenticado sin selector y el bloque resulta visible en su tenant y no en otro.
- `npx vitest run`: **249/249** en 29 archivos, sin regresiones.

Fuera de E: no incluye Appointments, Reviews ni jobs; no denormaliza `tenantId`; no ejecuta backfill.

### F — Tenancy de Appointments

Estado (2026-10-28): **COMPLETED & TESTED**.

Objetivo: aislar por tenant las citas y su procesamiento (endpoints, worker y cron) sin migración ni backfill, conservando el criterio de que ningún flujo asigna un tenant por defecto.

Alcance del cron fijado **antes** de tocar código:

- El cron **sigue siendo un orquestador global** (no se filtra por tenant ni se ejecuta por tenant): recorre las citas de todos los tenants y avanza su ciclo de vida.
- La lógica se extrajo a `processAppointmentLifecycle(now)` (función pura y testeable, con `now` inyectable); `appointment.worker.ts` sólo importa esa función y programa `cron.schedule("* * * * *", …)`.
- Ninguna lectura ni mutación de citas asume un tenant por defecto: el aislamiento lo garantiza la afiliación del profesional.

Diseño del alcance (decisiones del usuario):

| Superficie | Regla |
|---|---|
| `POST /api/appointments/create` | `authMiddleware` + `resolvePublicTenantMiddleware()`: exige `X-Tenant-ID` válido y afiliación `ACTIVE` del profesional; sin header válido → `400`; sin afiliación/tenant inactivo → `404` uniforme. |
| `POST /api/appointments/create-guest` | `resolvePublicTenantMiddleware()`: mismo contrato de selector + afiliación. |
| `GET /api/appointments/availability` | `resolvePublicTenantMiddleware()`: mismo contrato de selector + afiliación. |
| `GET /api/appointments/history` | **Sólo por propiedad**: no exige header; devuelve únicamente las citas del propio usuario autenticado. |
| `GET /api/appointments/upcoming` | **Sólo por propiedad**: no exige header. |
| `PATCH /api/appointments/:id/status` | **Sólo por propiedad**: muta únicamente citas del propio usuario; no exige header. |

Implementado:

- `appointments.service.ts`: instancia `PrismaActiveAffiliationChecker`; `create(clientProfileId, data, tenantId)`, `createGuest(professionalProfileId, data, tenantId)` y `getAvailability(professionalProfileId, serviceId, startOfDay, endOfDay, tenantId)` devuelven `null` sin afiliación activa. `getAppointmentsByUser` y `getUpcomingAppointmentsByUser` sin cambios (acotados por el usuario autenticado).
- `appointments.controller.ts`: `create`, `createGuest` y `availability` leen `res.locals.tenantId` y responden `404` uniforme ante `null`.
- `appointments.routes.ts`: `POST /create` → `authMiddleware` + `resolvePublicTenantMiddleware()`; `POST /create-guest` y `GET /availability` → `resolvePublicTenantMiddleware()`; lecturas propias y `PATCH /:id/status` sin cambios.
- `appointment-lifecycle.ts` (nuevo): `processAppointmentLifecycle(now = new Date())` busca las citas `PENDING`/`CONFIRMED`, calcula inicio/fin en UTC (`buildUTCDate`) y avanza el ciclo de vida (`PENDING` vencida → `CANCELLED`; `CONFIRMED` terminada → `COMPLETED`), sin filtrar por tenant.
- `appointment.worker.ts`: sólo programa el cron y delega en `processAppointmentLifecycle`; eliminado el bucle inline y el helper local.

Validación observada:

- `npx vitest run tests/appointments/appointments-tenancy.http.test.ts`: **14/14** — disponibilidad (200 del tenant propio, 404 cross-tenant, 400 sin selector/selector inválido, 404 tenant inactivo, 404 afiliación `SUSPENDED`); `create-guest` (404 cross-tenant, 400 sin selector, **201 de creación exitosa** con `GuestClient` persistido); `create` autenticado (201 en su tenant, 404 en tenant ajeno, 400 sin selector); `history` propio sin selector; aislamiento entre profesionales.
- `npx vitest run tests/appointments/appointment-lifecycle.integration.test.ts`: **3/3** — siembra citas vencidas `PENDING`/`CONFIRMED` de profesionales en **dos tenants** más una futura y confirma que `processAppointmentLifecycle` procesa indistintamente las de ambos tenants y deja intacta la futura; verifica la **idempotencia** (al reprocesar una transición ya aplicada, `changes === 0` y no se genera ninguna notificación adicional) y la **concurrencia** (dos ejecuciones simultáneas sobre la misma cita, con una **barrera de sincronización** sobre `findMany` que garantiza que ambas lecturas ocurren antes de cualquier `updateMany`, de modo que las dos parten del mismo estado `PENDING`: la transición ocurre una sola vez, `first + second === 1`, y hay exactamente **2** notificaciones —una por destinatario— sin duplicados). El spy sobre `findMany` se restaura en un **`afterEach` del `describe`** y no en un `finally` del cuerpo: si la barrera no se libera, el `Promise.all` no resuelve, el runner agota el timeout y el `finally` no llega a ejecutarse, de modo que el spy quedaría instalado sobre el Prisma compartido y contaminaría las pruebas posteriores. La efectividad del hook se verificó de forma empírica (prueba temporal con timeout forzado: el spy quedó restaurado y el Prisma operativo). La limpieza también **espera a que se asienten las ejecuciones en vuelo** (`pendingRuns`), usando `Promise.allSettled` sobre **las promesas individuales**: al liberar la barrera, las llamadas pendientes continúan hacia su `updateMany` y sus notificaciones, y sin ese `await` ese trabajo seguiría corriendo durante las pruebas posteriores o el teardown. Se usa `allSettled` y no `Promise.all` porque éste rechaza en cuanto **una** falla y la limpieza terminaría mientras la otra sigue procesando; el cuerpo del test sí propaga errores con `Promise.all`. Verificado de forma empírica con dos pruebas discriminantes: (a) prueba que expira dejando trabajo con retardo posterior a la liberación de la barrera — el test siguiente lo encontró terminado; (b) prueba en la que una ejecución falla de inmediato mientras la otra sigue procesando 300 ms — el test siguiente encontró terminada la lenta, pese a que el cuerpo falló al instante.
- `npx tsc --noEmit`: 0 errores.
- `npm run build` (`tsc && tsc-alias`): OK.
- `npx vitest run`: **282/282** en 32 archivos, sin regresiones (base previa al slice: 249/249).

Corregido (2026-10-28, hallazgo P1 del review): `CreateGuestAppointmentSchema.date` exigía ISO `datetime` mientras `createGuest` concatenaba `"T00:00:00Z"` a un valor de sólo fecha, produciendo `Invalid Date` para todo input válido. Se alineó el DTO al mismo formato calendario `YYYY-MM-DD` que `CreateAppointmentSchema`; `POST /create-guest` ahora procesa una fecha válida y se añadió la prueba HTTP positiva de creación exitosa.

Fuera de F: no incluye Reviews ni el inventario de jobs; no denormaliza `tenantId`; no ejecuta backfill. La Fase 3 **permanece abierta**.

### G — Tenancy de Reviews

Estado (2026-10-28): **COMPLETED & TESTED**.

Objetivo: aislar por tenant el listado público de reseñas y cerrar las fugas cruzadas entre usuarios en las lecturas por cita, sin migración ni backfill.

Decisiones registradas (elegidas por el usuario):

| Tema | Decisión |
|---|---|
| Agregado de calificación | `ratingAvg`/`ratingCount` de `ProfessionalProfile` permanece **global**. Sin `tenantId` en `Review`/`Appointment` la agregación por tenant no es derivable; se difiere a la denormalización de la Fase 10. |
| Contrato de rutas | Listado público con **header + afiliación**; el resto **sólo por propiedad** (participación en la cita), sin header y descartando IDs ajenos. |

Diseño del alcance:

| Superficie | Regla |
|---|---|
| `GET /api/reviews/professional/:id` | `authMiddleware` (contrato de autenticación sin cambios) + `resolvePublicTenantMiddleware()`: exige `X-Tenant-ID` válido y afiliación `ACTIVE` del profesional; sin selector/selector inválido → `400`; tenant inexistente/inactivo o afiliación suspendida → `404` uniforme. |
| `GET /api/reviews/appointment/:appointmentId` | Sólo por propiedad: se exige que el usuario autenticado sea el cliente dueño de la cita o su profesional; cualquier otro → `404` uniforme. Sin header. |
| `POST /api/reviews/batch/by-appointments` | Sólo por propiedad: el filtro descarta en la consulta los IDs de citas en las que el usuario no participa. Sin header. |
| `POST /api/reviews/` | Sólo por propiedad (`requireRole("CLIENT")`): únicamente el cliente dueño puede reseñar su cita. Sin header; no asume tenant. |

Implementado:

- `reviews.service.ts`: instancia `PrismaActiveAffiliationChecker`; `getProfessionalReviews(professionalProfileId, tenantId)` devuelve `null` sin afiliación activa; `getByAppointment(appointmentId, userId)` devuelve `null` sin participación (helper privado `isAppointmentParticipant`); `getByAppointments(appointmentIds, userId)` filtra por participación en la propia consulta.
- `reviews.service.ts` (`create`): los rechazos pasan de `Error` genérico (que el `errorHandler` convertía en `500`) a `AppError`, para que la denegación por propiedad sea el `404` uniforme del resto del slice: cita inexistente → `404`; perfil de cliente inexistente → `404`; cita ajena → `404` ("Cita no encontrada", sin revelar existencia); cita no completada → `400`; reseña duplicada → `409`. La autorización, la transacción y la actualización del agregado no cambian.
- `reviews.controller.ts`: `getProfessionalReviews` lee `res.locals.tenantId` y responde `404` uniforme ante `null`; `getByAppointment` y `getByAppointments` pasan `req.user!.id` y responden `404` cuando no hay participación.
- `reviews.dto.ts`: nuevo `GetReviewsByAppointmentsDTO` (`appointmentIds: number[]`) para validar el borde del lote en lugar de aceptar el cuerpo sin tipar.
- `reviews.routes.ts`: `GET /professional/:professionalProfileId` incorpora `resolvePublicTenantMiddleware()`; el resto sin cambios.
- `reviews.service.ts` (`getProfessionalReviews`): proyección pública explícita del cliente (`name`, `lastName`, `avatar`); se excluyen `phone` y `userId`, que el middleware de tenant no limita (hallazgo P1 del review).

Validación observada:

- `npx vitest run tests/reviews/reviews-tenancy.http.test.ts`: **16/16** — listado público (200 en el tenant con afiliación, 404 en tenant ajeno, 400 sin selector y con selector inválido `"0"`, 404 con tenant inactivo, 404 con afiliación suspendida; la proyección **no expone `phone` ni `userId` del cliente**); lectura por cita (200 para el cliente dueño, 200 para el profesional de la cita, 404 para otro cliente, 404 cuando la cita propia aún no tiene reseña); lote (devuelve sólo las propias, descarta las ajenas); escritura (404 al reseñar una cita ajena **sin crear** la reseña, 409 en la segunda reseña, 403 al profesional por rol, **201 en la creación exitosa con reseña persistida, rating incrementado y notificación al usuario del profesional**).
- `npx tsc --noEmit`: 0 errores.
- `npm run build` (`tsc && tsc-alias`): OK.
- `npx vitest run`: **282/282** en 32 archivos, sin regresiones (base previa 278/278).

Corregido (2026-10-28, hallazgo P1 del review): `ReviewsService.create` enviaba `appointment.professionalProfileId` a `NotificationService.notifyReview`, pero `createNotification` espera un **`userId`**; además la notificación ocurría **después** de la transacción, de modo que un fallo dejaba la reseña y el rating persistidos con respuesta de error. Ahora se pasa el `userId` del profesional (resuelto en la consulta) y el envío es **best-effort** (envuelto en `try/catch` y registrado en log), por lo que un fallo de notificación no revierte ni falla la respuesta. La prueba de creación exitosa valida el flujo completo.

Fuera de G: no incluye el inventario de jobs; no denormaliza `tenantId`; no agrega calificaciones por tenant; no ejecuta backfill. La Fase 3 **permanece abierta**.

### H — Inventario de jobs

Estado (2026-10-28): **COMPLETED**. Sin cambios de código: **ningún job asume un tenant por defecto**.

Búsqueda realizada sobre el repositorio completo (`node-cron`, `cron.schedule`, `setInterval`, `new Queue`, `bullmq`, `Worker(`, `.process(`, `src/seed/**`, `package.json` y `docker-compose.yml`). Existe **un único cron** en todo el backend y **ningún** bucle temporizado propio.

| Proceso no interactivo | Punto de entrada | Disparo | Alcance de tenancy | Clasificación |
|---|---|---|---|---|
| Ciclo de vida de citas | [appointment.worker.ts](appointment.worker.ts) → `processAppointmentLifecycle(now)` | `cron.schedule("* * * * *")`, registrado al arrancar el servidor (`src/bootstrap/server.ts`) | **Global por diseño**: `findMany({ status in [PENDING, CONFIRMED] })` sin filtro ni contexto de tenant; `Appointment` no tiene `tenantId` y el alcance se deriva de la afiliación del profesional | **GLOBAL — tenant-safe** |
| Purga de auditoría vencida (C2) | `PurgeAffiliationAuditUseCase` + `PrismaAffiliationAuditPurgeRepository` | **Sin disparador automático**: invocación manual por tenant, opcionalmente `dryRun` y por lotes | **Tenant-scoped**: el `tenantId` es parámetro obligatorio y el predicado `NOT EXISTS` replica `isEventOnHold` | **TENANT-SCOPED — sin cron** |
| Retenciones de auditoría (holds) | `CreateAuditHoldUseCase` / `ReleaseAuditHoldUseCase` | Ninguno | Tenant, afiliación y evento explícitos y validados | **SIN PUNTO DE ENTRADA** (sólo casos de uso y pruebas; no hay ruta HTTP ni cron) |
| Cola BullMQ de citas | Bloque comentado en `appointment.worker.ts`; deps `bullmq`/`ioredis`; servicio `redis` en `docker-compose.yml`; script `dev:worker` | Ninguno | No aplica | **INACTIVO** (código muerto; la cancelación/confirmación real ocurre en el cron y en `appointments.service.ts`) |
| Seeds de arranque | `runSeeds()` (`src/seed/*`) invocado en `startServer()` | Al arrancar el servidor, en cualquier entorno | **No tenant-aware**: no crea tenants, membresías ni afiliaciones; los profesionales sembrados quedan **sin afiliación** y por tanto **invisibles** en las rutas tenant-scoped (catálogo, agenda, reseñas y reserva) | **DEV/DEMO — no es backfill** |
| Correo transaccional (reset, verificación, notificaciones) | Mailers y `NotificationService`, invocados en línea | Dentro de la petición o del cron | Recibe `userId`s, nunca tenants | **Sin job propio** (síncrono) |

Hallazgos del inventario:

- **Ningún job infiere un tenant**: la cancelación/completado automático es global, la purga es explícita por tenant, los holds no se disparan solos y los seeds no asignan tenants. No procede corrección de código.
- **`notifyReviewRequest`** existe en `NotificationService` y **no se invoca en ningún punto**: la notificación de "deja tu reseña" quedó huérfana. Se registra para decisión posterior; no es un job de tenancy.
- **Doble registro del cron**: `npm run dev:worker` ejecuta el mismo archivo que `server.ts` importa, de modo que correr servidor y `dev:worker` a la vez dejaría **dos** programaciones del ciclo de vida. No ocurre en el arranque normal (un solo `startServer`) y se registra como riesgo operativo, no como defecto de aislamiento.
- **Cron por proceso y escalado horizontal** (hallazgo P2 del review): `appointment.worker.ts` agenda el cron **al importar el módulo**, esto es, una programación **por proceso**. Además del caso `dev:worker`, un despliegue con **varias réplicas** del backend programaría el ciclo de vida N veces y podría procesar las mismas citas en paralelo, **duplicando notificaciones**. No es un defecto de aislamiento de tenant.
- **Mitigación aplicada (2026-10-28, opción b)**: `processAppointmentLifecycle` cambia de estado con `updateMany` filtrando por `id` **y el estado esperado**, y envía la notificación **sólo si `count === 1`**. De este modo, si dos instancias ejecutan el ciclo a la vez, únicamente la que gana la transición notifica; la otra obtiene `count === 0` y no notifica de nuevo. **No se añade Redis ni lock distribuido.** Verificado con `appointment-lifecycle.integration.test.ts`: la prueba de **idempotencia** (tras reprocesar, `changes === 0` y no aumentan las notificaciones) y la de **concurrencia** (dos ejecuciones simultáneas sobre la misma cita con **barrera de sincronización** que garantiza que ambas leen antes de competir: `first + second === 1` y exactamente una notificación por destinatario, sin duplicados).
- **Limitación residual documentada**: si el proceso cae **después** de confirmar el cambio de estado y **antes** de enviar la notificación, esta puede perderse. La idempotencia protege contra el doble envío, **no** contra la pérdida; para entrega garantizada el paso adecuado sería un **outbox transaccional** (un lock distribuido por sí solo no cierra esa ventana).
- **Deriva `README`/deps**: `bullmq` e `ioredis` siguen en `dependencies` y `redis` en `docker-compose.yml` aunque la cola está deshabilitada; limpieza pendiente, sin impacto en tenancy.

Fuera de H: no se modificó ningún job (no había ninguno que asumiera tenant), no se habilitó la cola, no se cableó la purga a un cron y no se hizo backfill.

### Hallazgo del arnés de pruebas (reloj) — 2026-10-27

Durante la validación de E, `audit-purge.repository.integration.test.ts` falló de forma intermitente con el mismo `23514`. Causa raíz **medida** con una sonda temporal (ya eliminada): el reloj del cliente iba **≈189 ms por detrás** de la base; en un `create` de Prisma, `createdAt` lo asigna **PostgreSQL** (`DEFAULT CURRENT_TIMESTAMP`) mientras `updatedAt` lo envía el cliente (`@updatedAt`). El test liberaba holds con `releasedAt: new Date()` (reloj del cliente) sobre un `createdAt` de base, violando el `CHECK releasedAt >= createdAt`. Corrección: el test libera con `statement_timestamp()` (reloj de la base), igual que el adaptador de producción. No se tocó código de aplicación.

## Aceptación de B

33/33 pruebas de dominio; integración HTTP y persistencia multi-tenant; auditoría atómica; suite completa, `tsc`, build y migración verificados; Code Reviewer: P2 de concurrencia (lock del repositorio) resuelto, cobertura de lock por caso de uso añadida y sin hallazgos abiertos en la revisión final (2026-10-23).
