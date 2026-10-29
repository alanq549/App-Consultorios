# Fase 3 — Tenancy

## Estado

- Contexto Tenant/Membership (`GET /api/tenancy/current`): **APPROVED**.
- Profiles–Tenancy, diseño: **APPROVED**.
- Profiles–Tenancy Slice A, directorio público: **APPROVED**.
- Profiles–Tenancy Slice B, ciclo de vida de afiliación: **COMPLETED & TESTED y cerrado (2026-10-23)**; sin hallazgos abiertos del Code Reviewer.
- Profiles–Tenancy Slice C1/C2, retención y purga de auditoría: **COMPLETED & TESTED (2026-10-24)**.
- Catalog/Services Slice D, aislamiento por tenant: **COMPLETED & TESTED (2026-10-27)**.
- Scheduling Slice E, aislamiento por tenant: **COMPLETED & TESTED (2026-10-27)**.
- Appointments Slice F, aislamiento por tenant: **COMPLETED & TESTED (2026-10-28)**.
- Reviews Slice G, aislamiento por tenant: **COMPLETED & TESTED (2026-10-28)**.
- Inventario de jobs (H): **COMPLETED (2026-10-28)**; ningún job asume un tenant por defecto.
- Fase 3 (alcance Profiles–Tenancy / Catalog / Scheduling / Appointments / Reviews / Jobs): **CERRADA (2026-10-28)** bajo el modelo de derivación de afiliación activa. Verificación de migraciones **satisfecha** (base objetivo 4/4). El **backfill queda formalmente diferido** como dependencia externa y las superficies fuera de alcance quedan registradas como pendientes explícitas **no tenant-safe** (ver *Cierre de Fase 3*).

## Orden de trabajo

1. **Dominio B:** máquina de estados y tests unitarios 33/33 — completado.
2. Casos de uso, persistencia, autorización OWNER y auditoría transaccional — completado.
3. Rutas y pruebas de integración; revisión del Slice B — completado (2026-10-23), sin hallazgos abiertos.
4. Retención de auditoría (C1) y purga de auditoría vencida (C2) — completadas y probadas (2026-10-24). El backfill de mappings perfil–tenant queda **formalmente diferido**: no hay fuente de mappings y no se asignará ningún tenant por defecto.
5. Abrir slices separados para Catalog, Scheduling, Appointments, Reviews y demás superficies — **completado (2026-10-28)**: Slices D (Catalog/Services), E (Scheduling), F (Appointments) y G (Reviews) completados y probados. Inventario de jobs (H) cerrado el 2026-10-28: un único cron (ciclo de vida de citas), global por diseño; purga de auditoría explícitamente por tenant y sin cron; sin job alguno que asuma un tenant por defecto. Las superficies restantes (`users`/`clientprofile`/`adminprofile`, `config`, `notifications`, `admin`, `identity`) quedan fuera del alcance cerrado y pendientes en una fase posterior (ver *Cierre de Fase 3*).

## Límites

- `X-Tenant-ID` selecciona contexto; no concede acceso.
- Rutas públicas solo consultan afiliaciones publicables del tenant seleccionado.
- No inferir tenant por rol, especialidad, perfil único ni datos de citas.
- El `APPROVED` del directorio no volvió tenant-safe, por sí solo, Services, Schedule, Appointments ni Reviews: su aislamiento provino de los slices D–G. `admin`, `users`/perfiles (`clientprofile`, `adminprofile`), `config`, `notifications` e `identity` siguen sin ser tenant-safe y el cierre de Fase 3 no los alcanza.
- No crear membresías ni tenants automáticamente desde el registro legacy.

## Documentos de esta fase

- [FASE3_PROFILES_TENANCY.md](FASE3_PROFILES_TENANCY.md): decisiones aprobadas del límite.
- [FASE3_PROFILES_TENANCY_SLICE.md](FASE3_PROFILES_TENANCY_SLICE.md): estado real y siguiente slice.

## Evidencia vigente

- Slice A: 20 pruebas de directorio, suite reportada 83/83 y TypeScript sin errores al aprobarse (2026-10-15).
- Migración `20261015012759_profiles_tenancy` aplicada en base de pruebas.
- **Verificación del historial de migraciones contra el entorno objetivo** (2026-10-28, `npx prisma migrate status`): el datasource de Prisma usa `DATABASE_URL_psg`, que apunta a la base de dev/producción (`neondb`, host `...us-east-1.aws.neon.tech`). Estado inicial: **3 de 4 aplicadas**, con `20261024120000_affiliation_audit_hold` **pendiente** (la base de pruebas, `TEST_DATABASE_URL_PSG`, ya estaba 4/4). **Resuelto el 2026-10-28** con `npx prisma migrate deploy` sobre la base objetivo (solo `CREATE TABLE`/`CREATE INDEX`/`ALTER TABLE ... ADD CONSTRAINT`; sin alterar ni borrar datos): *"All migrations have been successfully applied"*. Verificación posterior: `npx prisma migrate status` → **"Database schema is up to date!"** (4/4) y `npx prisma db execute --schema prisma/schema.prisma --stdin` con `SELECT count(*) FROM "ProfessionalAffiliationAuditHold"` → *"Script executed successfully"* (exit 0), lo que confirma que la tabla existe y es consultable. Las pruebas de Vitest nunca tocaron la base objetivo: `tests/setup.ts` sobreescribe `DATABASE_URL_psg` con `TEST_DATABASE_URL_PSG`.
- Slice B cerrado (2026-10-23): dominio, casos de uso, UoW transaccional Prisma, rutas HTTP, validación de tenant activo, auditoría atómica y concurrencia pesimista en PostgreSQL verificada a nivel de repositorio y de caso de uso. Detalle en [FASE3_PROFILES_TENANCY_SLICE.md](FASE3_PROFILES_TENANCY_SLICE.md).
- Prueba local observada (2026-10-23): `domain-state-machine.unit.test.ts`, 33/33; módulo `profiles-affiliations`, 102/102; suite completa, 185/185.
- Slice C cerrado parcialmente (2026-10-24): C1 (retención de auditoría) y C2 (purga de auditoría vencida) **COMPLETED & TESTED**; el backfill de mappings perfil–tenant permanece diferido. Detalle en [FASE3_PROFILES_TENANCY_SLICE.md](FASE3_PROFILES_TENANCY_SLICE.md). Suite completa, 231/231.
- Slice D (Catalog/Services) **COMPLETED & TESTED** (2026-10-27): aislamiento por derivación de afiliación activa en `Service` y `specialty`/`ProfessionalSpecialty`, header `X-Tenant-ID` obligatorio en las rutas públicas y `404` uniforme; sin migración ni backfill. Prueba HTTP `catalog-tenancy.http.test.ts` 9/9 (acceso cruzado entre tenants, selector ausente/inválido, tenant inexistente/inactivo, afiliación suspendida). Suite completa, 240/240. Detalle en [FASE3_PROFILES_TENANCY_SLICE.md](FASE3_PROFILES_TENANCY_SLICE.md).
- Slice E (Scheduling) **COMPLETED & TESTED** (2026-10-27): aislamiento por derivación de afiliación activa en `Schedule`, header `X-Tenant-ID` obligatorio en la lectura pública y `404` uniforme; escrituras autenticadas sin tenant por defecto. Prueba HTTP `schedule-tenancy.http.test.ts` 9/9. Suite completa, 249/249. Detalle en [FASE3_PROFILES_TENANCY_SLICE.md](FASE3_PROFILES_TENANCY_SLICE.md).
- Slice F (Appointments) **COMPLETED & TESTED** (2026-10-28): aislamiento por derivación de afiliación activa en reserva (`POST /create`, `POST /create-guest`) y disponibilidad (`GET /availability`) con header + afiliación; lecturas propias (`GET /history`, `GET /upcoming`) y `PATCH /:id/status` sólo por propiedad, sin header. El cron se reescribió como orquestador global (`processAppointmentLifecycle(now)`), sin filtrar por tenant ni asumir uno por defecto. Corrección posterior (hallazgo P1 del review): `CreateGuestAppointmentSchema.date` se alineó al formato `YYYY-MM-DD` que espera el servicio, de modo que `POST /create-guest` procesa una fecha válida; se añadió prueba HTTP de creación exitosa. Pruebas `appointments-tenancy.http.test.ts` 14/14 y `appointment-lifecycle.integration.test.ts` 3/3 (citas de dos tenants, idempotencia y concurrencia determinista con barrera de sincronización: dos ejecuciones que leen la misma cita antes de competir → la transición ocurre una sola vez y no se duplican notificaciones). Suite completa, 282/282. Detalle en [FASE3_PROFILES_TENANCY_SLICE.md](FASE3_PROFILES_TENANCY_SLICE.md).
- Slice G (Reviews) **COMPLETED & TESTED** (2026-10-28): listado público por afiliación activa (`GET /professional/:id` con header + afiliación, `404` uniforme, con proyección pública del cliente sin `phone` ni `userId`) y lecturas/escritura acotadas por participación en la cita (`GET /appointment/:id`, `POST /batch/by-appointments`, `POST /`) sin header ni tenant por defecto. El agregado `ratingAvg`/`ratingCount` permanece global (agregación por tenant diferida). Corrección posterior (hallazgo P1 del review): la notificación de reseña pasa el `userId` del profesional y es best-effort tras el commit. Prueba HTTP `reviews-tenancy.http.test.ts` 16/16. Suite completa, 282/282. Detalle en [FASE3_PROFILES_TENANCY_SLICE.md](FASE3_PROFILES_TENANCY_SLICE.md).
- Inventario de jobs (H) **COMPLETED** (2026-10-28): un único cron — el ciclo de vida de citas (`appointment.worker.ts` → `processAppointmentLifecycle`), global por diseño y probado con citas de dos tenants; la purga de auditoría es explícitamente por tenant y sin cron; los holds no tienen disparador automático; la cola BullMQ está deshabilitada (código muerto); los seeds no son tenant-aware y no crean afiliaciones. **Ningún job asume un tenant por defecto**, por lo que no hubo cambios de código de tenancy. Riesgo operativo abordado (hallazgo P2 del review): el cron se agenda por proceso, de modo que un despliegue con varias réplicas podría duplicar notificaciones; se mitigó con idempotencia — `processAppointmentLifecycle` usa `updateMany` filtrando por `id` y estado esperado y notifica sólo si `count === 1` (sin Redis ni lock distribuido). Limitación residual documentada: si el proceso cae tras el cambio de estado y antes de notificar, la notificación puede perderse (para entrega garantizada haría falta un outbox transaccional). Detalle en [FASE3_PROFILES_TENANCY_SLICE.md](FASE3_PROFILES_TENANCY_SLICE.md).
- **Fase 3 CERRADA (2026-10-28)** para el alcance aprobado: la verificación del historial de migraciones se ejecutó y se **resolvió** el 2026-10-28 (migración aplicada en la base objetivo; 4/4). A, B, C1, C2, D, E, F, G y el inventario H quedan completados dentro del alcance Profiles–Tenancy/Catalog/Scheduling/Appointments/Reviews. El **backfill queda formalmente diferido** como dependencia externa y las superficies fuera de alcance quedan registradas como pendientes explícitas **no tenant-safe**.
- La aprobación del diseño del límite no equivale al cierre del código: el cierre de B se sostiene en la evidencia de suite registrada en el documento del slice.
- TypeScript local: `npx tsc --noEmit`, sin errores.

## Cierre de Fase 3

**Estado: CERRADA (2026-10-28)** para el alcance aprobado — Profiles–Tenancy, Catalog/Services, Scheduling, Appointments, Reviews y el inventario de jobs.

> **Alcance del cierre:** Fase 3 queda cerrada **dentro de su alcance**, no como una declaración de que toda la aplicación sea tenant-safe. Las superficies enumeradas en el punto 2 permanecen fuera del cierre, sin aislamiento de tenancy verificado y sin declararse tenant-safe.

El cierre se sostiene en: (i) aislamiento por **derivación de afiliación activa** implementado y probado en D–G; (ii) cron de citas reescrito como orquestador global tenant-safe (H); (iii) historial de migraciones verificado y aplicado en la base objetivo (4/4); y (iv) suite completa 282/282, `tsc --noEmit` sin errores y `npm run build` correcto.

### Pendientes acotados registrados en el cierre

**1. Backfill de `ProfessionalTenantAffiliation` — diferido formalmente.**
No existe fuente de mappings perfil–tenant y está prohibido asignar tenants por defecto. No se ejecutará backfill sin mappings explícitos y aprobados. La denormalización de `tenantId` en tablas operativas permanece diferida a Fase 10.

**2. Superficies fuera del alcance — pendientes explícitas y NO tenant-safe.**
Los siguientes módulos no fueron cubiertos por ningún slice de tenancy. **No se declaran tenant-safe** y su endurecimiento queda asignado a una fase posterior:

| Módulo | Superficie | Motivo de no cierre |
|---|---|---|
| `users` + `clientprofile` | cuenta y perfiles de cliente | Datos personales; los perfiles de cliente quedaron fuera de los slices A–H |
| `users` + `adminprofile` | perfil administrador | `ADMIN` es Platform Operator transicional, no pertenencia ni bypass |
| `config` | `CustomConfig` | Ownership personal/tenant-owned sin decidir (diseño de Fase 9) |
| `notifications` | bandeja por usuario | Riesgo cross-tenant si el destinatario se resuelve incorrectamente |
| `admin` | operación global | Autorización global, no contextual por tenant |
| `identity` | autenticación/JWT | Identidad global; el JWT autentica al actor, no autoriza el tenant |

La fase se cierra con estos pendientes acotados y documentados, no por ausencia de deuda. Ningún slice parcial equivale a declarar esas superficies tenant-safe.

### Deuda técnica fuera de Fase 3 (no bloqueante)

Registrada y no corregida: `notifyReviewRequest` huérfano, doble registro del cron al ejecutar `dev:worker`, limpieza de dependencias `bullmq`/`ioredis`/Redis, y el fallo intermitente preexistente de `tests/profiles/profiles-affiliations/concurrency-and-locking.integration.test.ts`.
