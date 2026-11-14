# Fases ejecutables y protocolo de revisión

## Propósito

Este documento divide el refactor del backend en fases pequeñas y revisables. Cada fase debe implementarse y revisarse por separado antes de iniciar la siguiente.

El objetivo no es reescribir el backend completo, sino migrarlo gradualmente desde la estructura actual hacia un monolito modular con DDD pragmático y preparación para SaaS.

## Cómo trabajar con Code Reviewer

Para cada fase:

1. Implementar únicamente el alcance de la fase.
2. No mezclar cambios de fases posteriores.
3. Ejecutar las validaciones indicadas.
4. Entregar al reviewer:
   - resumen de cambios;
   - archivos modificados;
   - decisiones tomadas;
   - comandos ejecutados;
   - resultados de pruebas;
   - dudas o deuda técnica conocida.
5. Code Reviewer evalúa los criterios de aceptación.
6. La fase queda `APPROVED`, `CHANGES_REQUESTED` o `BLOCKED`.

No se debe iniciar la siguiente fase con la anterior en estado `CHANGES_REQUESTED` o `BLOCKED`, salvo autorización explícita.

## Estados de revisión

### APPROVED

La fase cumple el alcance, no introduce regresiones conocidas y puede usarse como base para la siguiente.

### CHANGES_REQUESTED

Hay problemas corregibles sin cambiar el diseño de la fase. Se deben atender los hallazgos antes de continuar.

### BLOCKED

Existe una decisión arquitectónica pendiente, riesgo de seguridad, regresión crítica o dependencia que impide continuar.

## Reglas generales para todas las fases

- No hacer cambios masivos sin una razón documentada.
- No modificar contratos HTTP sin registrar compatibilidad o migración.
- No agregar microservicios.
- No agregar un framework nuevo para resolver problemas de organización.
- No usar `any` para evitar diseñar un contrato.
- No mover archivos sin clasificar antes su responsabilidad.
- No aplicar tenancy parcialmente a una operación y dejar otra ruta equivalente sin aislamiento.
- No ocultar errores con `catch` vacíos o fallbacks silenciosos.
- Cada fase debe dejar el proyecto compilable.

---

## Fase 0 — Baseline y límites del sistema

### Objetivo

Establecer una fotografía confiable del backend actual antes de modificar su arquitectura.

### Alcance

- inventario de rutas;
- inventario de middleware;
- inventario de servicios y métodos;
- inventario de DTOs, tipos e interfaces;
- inventario de queries Prisma;
- mapa de roles y permisos actuales;
- identificación de módulos propietarios de cada endpoint.

### No hacer todavía

- no crear `Tenant`;
- no mover todos los archivos;
- no refactorizar servicios;
- no cambiar el contrato de autenticación.

### Entregables

- matriz de endpoints;
- matriz de módulos y modelos;
- lista de duplicaciones;
- lista de riesgos conocidos;
- decisión sobre el significado de `ADMIN`.

### Criterios de aceptación

- [ ] cada ruta tiene un módulo propietario;
- [ ] cada ruta tiene middleware de autenticación y autorización identificado;
- [ ] cada modelo Prisma tiene un contexto propietario;
- [ ] se conocen los puntos de acceso directo a Prisma;
- [ ] se conocen los usos de `any`;
- [ ] se conocen los side effects por módulo.

### Evidencia para Code Reviewer

- tabla o documento con endpoints;
- salida de búsqueda de `prisma.`;
- salida de búsqueda de `any`;
- lista de módulos modificados, si hubo cambios.

### Riesgos que debe buscar el reviewer

- inventario incompleto;
- endpoints administrativos sin autorización;
- modelos asignados a más de un contexto sin contrato;
- confusión entre rol global y rol dentro de tenant.

---

## Fase 1 — Shared kernel mínimo y estándares

### Objetivo

Consolidar las piezas transversales justificadas por el código actual, un contrato interno mínimo del actor y una salida controlada de `core/`. El alcance detallado queda definido en [FASE1_SHARED_KERNEL.md](FASE1_SHARED_KERNEL.md), que sustituye el alcance anterior de esta fase.

### Alcance

Crear o consolidar únicamente:

```text
src/shared/
  errors/
  database/
  http/
  types/
```

Además:

- un único contrato `ActorContext` compatible con los campos actuales `id` y `role`;
- validar `userId` y `role` actuales antes de crear `ActorContext`, sin rediseñar roles;
- mantener JWT dentro de Auth/Identity;
- mover la instancia Prisma sin centralizar queries de negocio;
- conservar `AppError` como error técnico/HTTP legado, sin cambiar `statusCode`, `isOperational` ni respuesta;
- mover el bootstrap a `src/bootstrap/server.ts`, manteniendo `src/index.ts` como entrypoint;
- registrar los elementos restantes de `core/` con su destino e hito en el informe de Fase 1.

No crear `shared/config/` ni `shared/events/`; no agregar `tenantId`, memberships, scopes o permisos. El fail-fast de `JWT_SECRET`, la configuración global validada al arranque y la separación ejecutable de errores de dominio/HTTP quedan fuera de Fase 1, salvo aprobación explícita de cambio de alcance. La política de configuración JWT ante ausencia o valor inválido es precondición de Fase 2.

### Contrato transicional del actor

```ts
export interface ActorContext {
  id: number;
  role: "ADMIN" | "PROFESSIONAL" | "CLIENT";
}
```

`role` contiene únicamente uno de los valores actuales aceptados; la unión representa el contrato existente y no define la autorización futura. La validación detallada del contrato Identity/JWT se completa en Fase 2 y es una precondición de esa fase. La validación mínima de estructura/valores antes de formar `ActorContext` es necesaria en Fase 1.

### Criterios de aceptación

- [ ] existe una sola declaración de `Request.user`;
- [ ] `src/shared/http/express.d.ts` es la única augmentation canónica y no queda un segundo archivo equivalente;
- [ ] `tsc --noEmit` termina exitosamente;
- [ ] una revisión de imports/propiedad confirma que `shared/` no referencia módulos ni DTOs, schemas, services, controllers, entidades, modelos o lógica de negocio de módulos, y que cada elemento tiene justificación transversal propia;
- [ ] `userId` y `role` se validan antes de construir `ActorContext`;
- [ ] la asignación de `role` no usa `as any`;
- [ ] `AppError` sigue siendo un error técnico/HTTP legado y conserva sus propiedades actuales;
- [ ] el error handler conserva status y formato de respuesta actuales;
- [ ] Prisma se provee desde `shared/database` sin centralizar queries de negocio;
- [ ] el bootstrap está en `src/bootstrap/server.ts` y el entrypoint conserva el comportamiento;
- [ ] cada elemento que permanezca en `core/` tiene destino e hito documentados;
- [ ] `core/` no se elimina hasta estar vacío y haber migrado todos sus consumidores;
- [ ] `shared` no contiene lógica específica de citas, usuarios o perfiles;
- [ ] `shared/` solo depende de librerías/frameworks técnicos y tipos primitivos o contratos propios de `shared`, sin importar módulos, DTOs, services, controllers o modelos de negocio.

### Revisión específica

El reviewer debe rechazar:

- un `BaseService` genérico que esconda lógica;
- un `BaseRepository` que elimine la semántica de cada agregado;
- tipos globales que importen modelos de todos los módulos;
- utilidades que dependan de Prisma y se presenten como `shared`;
- `shared/events/`, `shared/config/` o JWT genérico añadidos sin una necesidad transversal aprobada;
- `tenantId`, memberships, scopes o permisos añadidos al actor en esta fase;
- presentar `AppError` como error de dominio.

### Estado de Fase 1

**`CLOSED / APPROVED`**. Code Reviewer aprobó la implementación; la observación menor de ruta de bootstrap quedó alineada con `src/bootstrap/server.ts`. La validación local `npm run build` pasó. El resultado remoto de CI se consulta en GitHub Actions y no se presume por este registro.

---

## Fase 2 — Identity y autenticación

### Objetivo

Separar autenticación, credenciales y sesiones de la creación y actualización de perfiles.

**Diseño:** `APPROVED` por Code Reviewer.

**Estado:** `CLOSED / APPROVED`.

La revisión final posterior a R4 quedó aprobada. Pasaron `npm test` (11 archivos, 49 tests), `npx tsc --noEmit` y `npm run build`; el estado y la checklist están registrados en [FASE2_IDENTITY.md](FASE2_IDENTITY.md).

La extracción futura de `POST /api/auth/register` es un hito transversal posterior, no parte de Fase 2. Su ownership, coordinador, atomicidad y gates se definen en [ADR_REGISTRATION_ONBOARDING.md](ADR_REGISTRATION_ONBOARDING.md).

### Contexto propietario

```text
src/modules/identity/
```

### Casos de uso

- sanitización del response del registro legacy (sin migrar el onboarding a Identity);
- `Login`;
- `VerifyEmail`;
- `RefreshSession`;
- `ForgotPassword`;
- `ResetPassword`;
- `ChangePassword`;
- `ChangeEmail`.

### Responsabilidades resultantes

| Responsabilidad | Componente |
|---|---|
| hash de contraseña | `PasswordHasher` |
| firma y validación de JWT | `AccessTokenService` |
| persistencia de cuentas | `UserAccountRepository` |
| refresh tokens | `SessionRepository` |
| verificación | `VerificationRepository` |
| correo | `MailPort` / adapter |
| HTTP | controllers y routes |

### Migración desde el código actual

El actual `auth.service.ts` contiene registro, perfiles, configuración, tokens, correo y notificaciones. No se debe copiar el archivo completo a la nueva carpeta. Cada método debe clasificarse y migrarse a su responsabilidad.

### Criterios de aceptación

- [ ] el controller no contiene lógica de persistencia;
- [ ] el caso de uso no recibe `Request` ni `Response`;
- [ ] el dominio no importa Prisma, Express ni Nodemailer;
- [ ] el registro no depende directamente de `NotificationService`;
- [ ] los refresh tokens se rotan y revocan correctamente;
- [ ] no se registran contraseñas, tokens planos ni correos sensibles;
- [ ] los errores de credenciales no revelan si el usuario existe;
- [ ] el contrato JWT está documentado.

### Bloqueadores

- cambiar el formato JWT sin compatibilidad;
- dejar dos flujos de login activos con reglas diferentes;
- mover autenticación a tenant sin definir membresías.

---

## Fase 3 — Tenancy y autorización contextual

El contexto `Tenant/Membership` y el directorio público Profiles–Tenancy (Slice A) están `APPROVED`. Los gates de diseño están cerrados para el portafolio. La Fase 3 está **CERRADA (2026-10-28)** para su alcance aprobado; el ciclo de vida de afiliación (Slice B) está cerrado (2026-10-23); la retención de auditoría (C1) y la purga de auditoría vencida (C2) están cerradas y probadas (2026-10-24); el aislamiento de Catalog/Services (Slice D) y de Scheduling (Slice E) está cerrado y probado por derivación de afiliación activa (2026-10-27); el de Appointments (Slice F), con endpoints, worker y cron, está cerrado y probado (2026-10-28); el de Reviews (Slice G), con listado público por afiliación y lecturas/escritura por propiedad, también (2026-10-28); el inventario de jobs (Slice H) se cerró el 2026-10-28 sin hallazgos de tenancy (un único cron, de alcance global por diseño; la purga de auditoría es explícitamente por tenant y no tiene cron); su estado real está en [FASE3_PROFILES_TENANCY_SLICE.md](FASE3_PROFILES_TENANCY_SLICE.md). El **backfill** queda **formalmente diferido** (mappings perfil–tenant explícitos y aprobados; hoy no hay fuente, y no se asignan tenants por defecto). La **verificación del historial de migraciones contra el entorno objetivo** se ejecutó el 2026-10-28 y se **resolvió** aplicando la migración `20261024120000_affiliation_audit_hold` con `prisma migrate deploy`: la base objetivo pasó de 3/4 a 4/4 ("Database schema is up to date!").

**Pendientes acotados con los que se cierra la fase:** (a) el backfill diferido arriba indicado; (b) superficies fuera del alcance de los slices A–H —`users`/`clientprofile`/`adminprofile`, `config` (`CustomConfig`), `notifications`, `admin` e `identity`—, que **no se declaran tenant-safe** y quedan asignadas a una fase posterior (ver el detalle y la tabla en [FASE3_TENANCY.md](FASE3_TENANCY.md)). La fase se cierra con esa deuda acotada y documentada, no por ausencia de ella.

**Alcance del cierre:** Fase 3 queda cerrada **dentro de su alcance**, no como una declaración de que toda la aplicación sea tenant-safe. Los módulos operativos fuera de los slices A–H siguen sin aislamiento de tenancy verificado y no deben tratarse como tenant-safe hasta que su propia fase lo implemente y lo pruebe.

### Objetivo

- **Primer vertical slice:** Establecer y validar exclusivamente la frontera de contexto y autorización tenant (resolución del selector `X-Tenant-ID` de transporte inicial, verificación de membresía M:N activa, autorización contextual y denegación horizontal cross-tenant sobre el propio contexto tenant).
- **Fase 3 completa / aislamiento general:** Aislamiento incremental de datos en los módulos operativos antes de habilitar el uso SaaS en producción. El modelo aprobado **no** introduce `tenantId` en las tablas operativas (`Appointment`, `Service`, `Schedule`, perfiles, catálogo): el aislamiento ya está implementado **por derivación de afiliación activa** (slices D–G, con el cron como orquestador global tenant-safe). Lo que permanece **diferido** es la **denormalización de `tenantId` y el backfill**, no el aislamiento de esas superficies.
- **Slice operativo cerrado:** comandos de afiliación y revisión OWNER completados y cerrados (Slice B, 2026-10-23); catalog (Slice D) y scheduling (Slice E) cerrados por derivación de afiliación activa (2026-10-27); appointments (Slice F, endpoints/worker/cron) cerrado con el cron como orquestador global y reviews (Slice G) cerrado con listado público por afiliación y acceso por propiedad; inventario de jobs (Slice H) clasificado sin hallazgos de tenancy (2026-10-28). El directorio público ya fue aprobado; los perfiles de clientes siguen fuera de estos slices.

### Contexto propietario

```text
src/modules/tenancy/
```

### Modelo objetivo mínimo del primer slice

```text
Tenant (representa consultorio o clínica médica individual; status inicial ACTIVE)
TenantMembership (relación asociativa M:N, unique(userId, tenantId), status: ACTIVE | SUSPENDED, roles: OWNER | MEMBER)
User (identidad global de referencia en Identity)
```

`Tenant` representa una frontera independiente de operación y autorización sin organizaciones jerárquicas ni sucursales en esta etapa. `User` permanece como identidad global. `User.role === ADMIN` actúa estrictamente como Platform Operator global transicional y **no concede pertenencia ni bypass** en rutas tenant-protected.

### Alcance del primer vertical slice

- Resolución de tenant a partir del selector de transporte inicial (`X-Tenant-ID`).
- Verificación de pertenencia contextual activa (`TenantMembership.status === ACTIVE`).
- Construcción de `TenantContext` inmutable validado en runtime; el JWT de Identity solo autentica al actor.
- Política de autorización contextual que rechaza acceso sin membresía activa en el tenant solicitado.
- Endpoint técnico de validación conceptual: `GET /api/tenancy/current` con política de respuesta uniforme para mitigar enumeración de tenants.
- Aprovisionamiento inicial mediante mecanismo interno/controlado para pruebas y bootstrap (sin modificar `POST /api/auth/register` ni crear registro público).
- Clasificación rigurosa de rutas/jobs reales; las superficies fuera del slice permanecen explícitamente pendientes y no se declaran tenant-safe.

### Criterios de aceptación del primer vertical slice

> **Nota de estado:** El contexto Tenant/Membership fue implementado y aprobado. El directorio público Profiles–Tenancy (Slice A) también fue aprobado. La lista siguiente registra la aceptación del primer slice de contexto, no el Slice B.

- [x] Modelo conceptual `Tenant` y `TenantMembership` con restricción `unique(userId, tenantId)` y lifecycle mínimo aprobados por Producto.
- [x] Selector `X-Tenant-ID` configurado como transporte inicial, sin declararlo permanente para UX.
- [x] Membership validada en base de datos; header y `User.role` no conceden acceso.
- [x] Tests cubren tenant activo/inactivo, membership activa/suspendida y acceso no autorizado.
- [x] `GET /api/tenancy/current` implementado bajo el contrato de error uniforme aprobado.
- [x] Rutas/jobs inventariados; módulos operativos fuera de alcance permanecen pendientes.
- [x] No se alteraron contratos HTTP legacy ni modelos operativos en el slice de contexto.

### Bloqueadores del slice

- cualquier endpoint que permita acceso a datos de otro tenant;
- considerar el header como autorización de pertenencia sin verificar base de datos;
- otorgar bypass o permisos contextuales basados en `User.role === ADMIN`;
- respuestas HTTP que permitan la enumeración de tenants existentes a actores no autorizados;
- declarar el backend o módulos operativos como tenant-safe antes de sus propios slices.

---

## Fase 4 — Profiles: división de `users`

La Fase 4 está **CERRADA Y APROBADA (2026-11-07)**. Las decisiones de diseño D1–D8 fueron aprobadas en Misión 0 y registradas en [FASE4_PROFILES/01-DECISIONES-ARQUITECTURA.md](FASE4_PROFILES/01-DECISIONES-ARQUITECTURA.md). Misiones 1–6 fueron aprobadas individualmente y la Misión 7 consolidó la integración, eliminó métodos y despachos legacy duplicados y verificó contratos e integración con Catalog mediante pruebas unitarias, HTTP y de concurrencia en base de datos real.

### Objetivo

Separar cuentas de identidad de perfiles de cliente, profesional y administración.

### Contexto propietario

```text
src/modules/profiles/
```

### Casos de uso

- `GetCurrentUser`;
- `UpdateClientProfile`;
- `UpdateProfessionalProfile`;
- `UpdateAvatar`;
- `GetPublicProfessionalProfile`;
- `ReviewProfessionalProfile`.

### Cambios esperados

- `UsersService` deja de ser dueño de todas las operaciones;
- `profileServiceMap: Record<Role, any>` desaparece;
- avatar usa `StoragePort`;
- cada perfil tiene su mapper y contrato de salida;
- administración valida el contexto correcto.

### Criterios de aceptación

- [x] no existe `any` para seleccionar servicios por rol;
- [x] cambiar contraseña no está mezclado con actualizar perfil;
- [x] actualizar avatar no conoce detalles del filesystem;
- [x] las respuestas públicas no exponen campos privados;
- [x] perfiles profesionales se filtran por tenant;
- [x] las transiciones de verificación están documentadas y probadas.

---

## Fase 5 — Catalog

El plano ejecutable se desglosa en misiones independientes de menos de 100 líneas en [FASE5_CATALOG/00-PLAN.md](FASE5_CATALOG/00-PLAN.md). La Misión 0 debe aprobar ownership y reglas de oferta/citas futuras antes de cambios de schema o backfill. Fase 4 ya aprobó Catalog como owner de `ProfessionalSpecialty` e implementó el port transaccional Profiles; Fase 5 debe integrarlo, no duplicarlo.

**Estado de implementación (2026-11-14):** Misiones 0–7 implementadas y validadas localmente. La Misión 6 ([07-CATALOGO-PUBLICO.md](FASE5_CATALOG/07-CATALOGO-PUBLICO.md)) publica las proyecciones públicas con DTOs explícitos y aislamiento por tenant. La Misión 7 ([08-INTEGRACION-CIERRE.md](FASE5_CATALOG/08-INTEGRACION-CIERRE.md)) retira el legacy `src/modules/specialty/`, confirma la ausencia de duplicación activa y registra las excepciones y riesgos de Fase 6/7. **Ambas aprobadas** en revisión independiente (2026-11-14); ver [Estado de Fase 5](#estado-de-fase-5).

### Objetivo

Consolidar servicios, especialidades y relaciones profesionales bajo un único contexto de catálogo.

### Contexto propietario

```text
src/modules/catalog/
```

### Casos de uso

- `CreateService`;
- `UpdateService`;
- `DeactivateService`;
- `RequestSpecialty`;
- `ApproveSpecialty`;
- `ListPublicCatalog`.

### Contrato requerido para appointments

```ts
export interface CatalogReader {
  getBookableService(
    serviceId: number,
    professionalId: number,
    tenantId: number,
  ): Promise<BookableService | null>;
}
```

`appointments` no debe importar el repositorio Prisma del catálogo.

### Criterios de aceptación

- [x] servicios y especialidades tienen un contexto propietario;
- [x] el servicio reservado pertenece al profesional y tenant correctos;
- [x] el precio y duración se leen desde un contrato estable;
- [x] no se exponen modelos Prisma como respuesta pública;
- [x] catálogo global y tenant-owned están diferenciados.

### Estado de Fase 5

**`CLOSED / APPROVED` — 2026-11-14.** El Code Reviewer aprobó el cierre sin hallazgos bloqueantes (revisión independiente sobre el árbol de `feature/fase5-catalog`). Misiones 0–7 implementadas y validadas localmente: `npx tsc --noEmit` exit 0, suite `69 archivos / 569 tests` PASS, `npm run build` exit 0 y `prisma migrate status` "Database schema is up to date!". La fase se integra en `develop` (fast-forward) y queda cerrada.

**Brechas trasladadas a fases posteriores (no resueltas por el contrato Catalog):**

- Backfill de afiliación (Fase 3, diferido) — `catalog/infrastructure/legacy/*` permanece; requiere inventario, mapeos aprobados y dry-run antes de `--apply`.
- Frontera de elegibilidad Profiles↔Catalog — `PrismaCatalogSpecialtyChecker` lee `professionalSpecialty` (owner Catalog) como puerto de Profiles; aceptado y documentado en [08-INTEGRACION-CIERRE.md](FASE5_CATALOG/08-INTEGRACION-CIERRE.md).
- Snapshots y concurrencia de citas — corresponden a Fase 6/7.

**Fase 6 — Scheduling** permanece **PLANIFICADA**: a la espera de planos y de las decisiones de timezone, convención de `dayOfWeek`, recurrencia/excepciones, autoridad de disponibilidad, política ante cambios con citas existentes y estrategia de concurrencia.

---

## Fase 6 — Scheduling

### Objetivo

Separar horarios, disponibilidad y políticas de slots del caso de uso de reservar.

### Contexto propietario

```text
src/modules/scheduling/
```

### Casos de uso

- `CreateSchedule`;
- `UpdateSchedule`;
- `GetAvailability`;
- `ValidateBookableSlot`.

### Criterios de aceptación

- [ ] horarios son tenant-aware;
- [ ] cálculo de disponibilidad no crea citas;
- [ ] la zona horaria está definida explícitamente;
- [ ] fechas y minutos tienen validación consistente;
- [ ] solapamientos se validan en una capa de dominio/aplicación;
- [ ] existe una estrategia contra reservas concurrentes.

### Bloqueador

No aprobar esta fase si la disponibilidad parece libre pero dos requests concurrentes pueden reservar el mismo slot.

---

## Fase 7 — Appointments

### Objetivo

Dividir el `AppointmentService` actual en casos de uso y proteger el ciclo de vida de la cita.

### Contexto propietario

```text
src/modules/appointments/
```

### Casos de uso

- `CreateAppointment`;
- `ConfirmAppointment`;
- `CancelAppointment`;
- `CompleteAppointment`;
- `GetUpcomingAppointments`;
- `GetAppointmentHistory`.

### Dependencias permitidas

- `CatalogReader`;
- `AvailabilityReader`;
- `AppointmentRepository`;
- `EventPublisher`.

### No permitido

- `AppointmentService` como dueño de todos los casos;
- `appointments` creando directamente notificaciones;
- filtros `where: any`;
- includes Prisma duplicados en cada método;
- filtrado en memoria de grandes listados cuando puede hacerse en DB.

### Criterios de aceptación

- [ ] las transiciones de estado están centralizadas;
- [ ] cada operación verifica tenant y autorización;
- [ ] el cliente solo puede operar sus citas;
- [ ] el profesional solo puede operar sus citas;
- [ ] las reservas concurrentes tienen protección;
- [ ] la transacción principal no depende de que un email se envíe;
- [ ] se publica un evento después de confirmar la operación.

---

## Fase 8 — Notifications

### Objetivo

Convertir notificaciones en un consumidor de eventos y separar persistencia de canales de entrega.

### Contexto propietario

```text
src/modules/notifications/
```

### Componentes

- `NotificationRepository`;
- `NotificationApplicationService`;
- `NotificationChannel`;
- handlers de eventos;
- adapter BullMQ/email si corresponde.

### Criterios de aceptación

- [ ] citas no importan detalles internos de notificaciones;
- [ ] crear una notificación y entregarla son operaciones diferenciadas;
- [ ] un fallo de canal no borra el evento de negocio;
- [ ] reintentos son seguros e idempotentes;
- [ ] las notificaciones están aisladas por tenant;
- [ ] marcar como leída verifica la pertenencia al usuario.

---

## Fase 9 — Reviews y Preferences

### Reviews

- validar que la cita es reseñable;
- impedir reseñas duplicadas;
- separar actualización de rating;
- publicar evento de reseña;
- verificar acceso por tenant.

### Preferences

- mover `CustomConfig` a `preferences`;
- separar lectura y actualización;
- definir si es dato personal o tenant-owned;
- validar que el usuario solo modifique su configuración.

### Criterios de aceptación

- [ ] una reseña solo puede provenir de una cita elegible;
- [ ] el profesional no puede reseñarse a sí mismo;
- [ ] rating y reseña tienen consistencia transaccional definida;
- [ ] preferencias no se usan como configuración global de tenant sin un modelo separado.

---

## Fase 10 — Endurecimiento SaaS

### Objetivo

Preparar operación multi-tenant confiable.

### Alcance

- outbox transaccional;
- jobs tenant-aware;
- storage con prefijo de tenant;
- límites por plan;
- auditoría;
- métricas y logs por tenant;
- backups y restauración;
- pruebas de aislamiento;
- revisión de índices y políticas de borrado.

### Criterios de aceptación

- [ ] todos los eventos importantes son recuperables;
- [ ] los workers no procesan datos sin tenant;
- [ ] los archivos no pueden cruzar tenants;
- [ ] existen métricas de errores por tenant;
- [ ] existe una estrategia de migración y rollback;
- [ ] se ha probado restauración en staging.

---

## Precondiciones de decisión por fase

Esta sección no implementa ninguna fase. Define qué decisiones deben estar cerradas antes de iniciar cada una. Si una decisión sigue pendiente, la fase debe limitar su alcance o quedar `BLOCKED`; no debe resolverse mediante supuestos silenciosos.

| Fase | Decisiones de negocio/arquitectura requeridas antes de iniciar |
|---|---|
| Fase 0 | Evidencia del baseline, clasificación de riesgos, estado de rutas, operaciones runtime/seed/cascade, y decisiones pendientes documentadas. El estado final debe ser `READY FOR FINAL REVIEW` hasta la aprobación del reviewer. |
| Fase 1 — Shared kernel | Se rige por el alcance redefinido en [FASE1_SHARED_KERNEL.md](FASE1_SHARED_KERNEL.md): contrato mínimo del actor y validación de claims actuales antes de crearlo; no congela tenant, memberships, permisos ni semántica futura de roles. No incluye `shared/events/`, configuración validada global al arranque ni separación ejecutable de errores de dominio/HTTP. La definición completa de claims/sesiones JWT es precondición de Fase 2. |
| Fase 2 — Identity | Diseño aprobado en [FASE2_IDENTITY.md](FASE2_IDENTITY.md); completar revisión final de implementación. Register permanece legacy con atomicidad preservada y response DTO sin hash; su extracción se rige por el hito transversal de [ADR_REGISTRATION_ONBOARDING.md](ADR_REGISTRATION_ONBOARDING.md), después de definir contratos mínimos de provisioning. Cambio de email y fallos de entrega siguen las políticas decididas; JWT/sesión conservan el contrato y rol legacy. El shape tenant/membership y semántica futura de roles pueden permanecer pendientes, pero no se debe introducir autorización tenant incompleta. |
| Fase 3 — Tenancy | Deben estar cerrados como mínimo: significado de `ADMIN`; membership simple o múltiple; estrategia de tenant resolution; ownership inicial de perfiles; y tratamiento de actores públicos/guest. También debe definirse qué superficies son tenant-owned antes de aplicar aislamiento. |
| Fase 4 — Profiles | Las decisiones D1–D8 de ownership global/tenant, roles, lifecycle, specialty, certificados y visibilidad fueron **aprobadas e implementadas** en [FASE4_PROFILES/00-PLAN.md](FASE4_PROFILES/00-PLAN.md). Se resolvieron los gaps de visibilidad, desacoplamiento de storage, entrega autenticada de certificados y el contrato de suspensión coordinada con Catalog (D5). |
| Fase 5 — Catalog | Deben estar definidos catálogo global versus tenant-owned, propiedad de `Specialty`, regla para servicios reservables y efecto de cambios con citas futuras. Integrar el contrato Profiles de D5: al revocar la última `ProfessionalSpecialty` aprobada, suspender `ProfessionalProfile` en la misma unidad transaccional y probar que deja de publicarse. |
| Fase 6 — Scheduling | Deben estar definidos timezone del tenant/profesional, convención de `dayOfWeek`, modelo de horarios recurrentes/excepciones, autoridad de disponibilidad, política ante cambios con citas existentes y estrategia de concurrencia. |
| Fase 7 — Appointments | Deben estar definidos el invariant de participante cliente/guest, lifecycle de guest, snapshots históricos de servicio/precio/duración/profesional/clínica/timezone, políticas de cancelación y pago, autoridad de reserva y garantía contra doble booking. |
| Fase 8 — Notifications | Deben estar definidos canales, ownership tenant/usuario, eventos que producen notificaciones, retry, idempotencia, retención y comportamiento ante fallos parciales. `NotificationService` actual no debe confundirse con el bounded context candidato `Notifications`. |
| Fase 9 — Reviews y Preferences | Reviews requiere decisión sobre rating derivado/proyección, moderación/eliminación, visibilidad y retención. Preferences requiere decidir si `CustomConfig` es personal, tenant-owned o dividido. Preferences puede evolucionar parcialmente después de Identity si su alcance tenant queda explícitamente pendiente. |
| Fase 10 — Endurecimiento SaaS | Deben estar cerrados tenant resolution, retención/anonimización, auditoría administrativa, canales/eventos, storage tenant-aware, límites operativos y criterios de recuperación. |

Estas precondiciones distinguen dependencia conceptual, decisión de negocio y orden de migración. No constituyen implementación ni crean contratos ejecutables.

---

## Plantilla para solicitar revisión

Usar esta plantilla al terminar cada fase:

```md
# Revisión de Fase N — <nombre>

## Objetivo

<qué se implementó>

## Alcance

- <cambio 1>
- <cambio 2>

## Archivos modificados

- `src/...`

## Decisiones

- <decisión y motivo>

## Validaciones ejecutadas

- `npm run build` — PASS/FAIL
- `<comando de pruebas>` — PASS/FAIL

## Riesgos o pendientes

- <pendiente>

## Solicitud al Code Reviewer

Revisar arquitectura, seguridad, aislamiento tenant, tipos, regresiones y cumplimiento de los criterios de la Fase N.
```

## Plantilla de respuesta del Code Reviewer

```md
# Resultado de revisión — Fase N

## Estado

APPROVED | CHANGES_REQUESTED | BLOCKED

## Cumplimientos

- <criterio cumplido>

## Hallazgos

### [P0/P1/P2] <título>

- Archivo/línea:
- Problema:
- Impacto:
- Recomendación:

## Riesgos residuales

- <riesgo>

## Próximo paso

<corregir hallazgos | iniciar Fase N+1>
```

## Clasificación de severidad

- `P0`: riesgo crítico de seguridad, pérdida de datos, fuga entre tenants o regresión que impide operar.
- `P1`: incumplimiento importante de arquitectura, autorización, concurrencia o contrato que debe corregirse antes de avanzar.
- `P2`: deuda técnica o mejora importante que no bloquea la fase.
- `P3`: estilo, documentación o mejora no urgente.
