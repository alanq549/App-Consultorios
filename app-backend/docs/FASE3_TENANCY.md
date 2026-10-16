# Diseno tecnico — Fase 3: Tenancy y autorizacion contextual

## 1. Estado y proposito

**Diseno:** `APPROVED`.

**Implementacion del primer vertical slice:** `APPROVED` por el Code Reviewer.

El primer vertical slice de Fase 3 implementa exclusivamente la frontera de contexto `Tenant/Membership`, mediante `GET /api/tenancy/current`. El veredicto de aprobacion se limita a este alcance y no certifica el aislamiento multi-tenant de los modulos operativos.

La evidencia de implementacion y validacion se registra en la seccion 19. Las decisiones de diseno aprobadas permanecen documentadas en las secciones 3 a 16.

**Diseño Profiles–Tenancy:** [FASE3_PROFILES_TENANCY.md](FASE3_PROFILES_TENANCY.md) está `APPROVED` por Code Reviewer. Los tres gates de diseño están cerrados y el slice operativo se desglosa en [FASE3_PROFILES_TENANCY_SLICE.md](FASE3_PROFILES_TENANCY_SLICE.md): su **Slice A** (directorio público tenant-scoped) está `APPROVED` e implementado, mientras el **Slice B** (ciclo de vida de afiliación, comandos `OWNER`, backfill y retención) permanece pendiente de implementación.

Fase 2 — Identity permanece `CLOSED / APPROVED`. Los slices operativos posteriores de Tenancy requieren sus propias decisiones de diseno, implementacion, pruebas y revision antes de considerarse aprobados.

El objetivo del **primer vertical slice** de Fase 3 es establecer y validar exclusivamente la frontera de contexto tenant:
- Resolucion del selector de transporte inicial (`X-Tenant-ID`).
- Verificacion de membresia asociativa M:N (`TenantMembership`) con restriccion `unique(userId, tenantId)`.
- Autorizacion contextual basada en estados (`ACTIVE`, `SUSPENDED`) y roles iniciales (`OWNER`, `MEMBER`).
- Denegacion horizontal cross-tenant sobre el propio contexto tenant.

**Delimitacion critica:** El primer slice **no demuestra ni declara aislamiento general de datos** en los modulos operativos (`Appointment`, `Service`, `Schedule`, perfiles, catalogo, resenas, notificaciones ni cron worker). Estas superficies permanecen formalmente clasificadas como **pendientes** y no habilitadas para multi-tenancy, requiriendo slices independientes posteriores.

## 2. Evidencia y principios

La propuesta se basa en:

- [FASE1_SHARED_KERNEL.md](FASE1_SHARED_KERNEL.md): `ActorContext` es el contrato autenticado transversal actual.
- [FASE2_IDENTITY.md](FASE2_IDENTITY.md): Identity es la autoridad de usuario, credenciales y validacion de access tokens.
- [ADR_REGISTRATION_ONBOARDING.md](ADR_REGISTRATION_ONBOARDING.md): el registro es un proceso cross-context; no pertenece a Identity ni debe migrarse mecanicamente.
- [BASELINE_SECURITY.md](BASELINE_SECURITY.md): hoy no existen tenants, memberships ni autorizacion contextual; las verificaciones de ownership estan distribuidas.
- [BASELINE_OWNERSHIP.md](BASELINE_OWNERSHIP.md) y `prisma/schema.prisma`: `User.role` es global, las relaciones tenant-aware no existen y varios modelos operativos dependen de perfiles.
- [TENANCY.md](TENANCY.md) y [DB_SCHEMA.md](DB_SCHEMA.md) conservan recomendaciones preliminares; no son especificaciones aprobadas y quedan subordinados a este diseno para Fase 3.

Principios obligatorios:

1. El tenant seleccionado por el cliente es una **solicitud de contexto**, nunca una prueba de pertenencia o permiso. `X-Tenant-ID != autorizacion`.
2. Autenticacion identifica al usuario (`ActorContext`); Tenancy resuelve el tenant y valida membership activa; el caso de uso autoriza la accion y el repositorio limita los datos.
3. Toda lectura o escritura tenant-owned debe quedar acotada al tenant en la frontera de persistencia, no solo en el controller.
4. `User.role === ADMIN` es un rol global de Platform Operator y **no concede permisos de tenant ni bypass** en rutas tenant-protected.
5. No se introduce un Prisma wrapper global con filtros magicos. Cada port/repositorio tenant-owned exige el contexto de tenant de forma explicita.
6. Las lecturas publicas y los flujos guest no obtienen acceso a datos privados por carecer de usuario; reciben un tenant resuelto y politicas publicas explicitas cuando el recurso lo requiera.
7. Ownership conceptual, scope de datos y acceso de transicion son conceptos distintos. El acceso temporal legacy debe estar limitado y tener fecha/criterio de retiro.

## 3. Decisiones arquitectonicas aprobadas (Primer Vertical Slice)

### 3.1 Aislamiento de persistencia
Para el primer SaaS se aprueba PostgreSQL con **shared database / shared schema** y una clave `tenantId` en cada recurso que sea tenant-owned. `schema-per-tenant` y `database-per-tenant` quedan fuera de Fase 3.

### 3.2 Definicion de Tenant
- `Tenant` representa un **consultorio o clinica medica individual** que constituye una frontera independiente de operacion y autorizacion.
- Quedan explícitamente fuera del primer vertical slice: `Organization`, jerarquias padre/hijo, sucursales, multi-branch y consolidacion de varios consultorios. Estas estructuras podran incorporarse de forma aditiva en el futuro si el producto lo requiere.

### 3.3 Estado de Tenant (`Tenant.status`)
Para el primer vertical slice se define el ciclo de vida minimo:
- `Tenant.status === ACTIVE` representa un tenant resoluble y operativo.
- No se introducen estados adicionales complejos prematuros (`ARCHIVED`, `DELETED`, `SUSPENDED`, `PENDING`) en esta fase inicial.

**Addendum Profiles–Tenancy:** el directorio público requiere diferenciar tenant activo e inactivo. El slice Profiles–Tenancy amplía este enum con `INACTIVE` como estado binario no resoluble públicamente; `ACTIVE` sigue siendo el default. No introduce lifecycle administrativo adicional ni altera el slice inicial de `Tenant/Membership`.

### 3.4 Cardinalidad de Membership (User <-> Tenant)
- Un `User` puede pertenecer a multiples `Tenant` (cardinalidad **M:N**).
- La pertenencia se modela conceptualmente mediante la entidad asociativa `TenantMembership`.
- Restriccion obligatoria de unicidad:
  ```text
  unique(userId, tenantId)
  ```
- `User` permanece como una identidad global gobernada por Identity; la pertenencia permanece contextual gobernada por Tenancy.

### 3.5 Lifecycle inicial de TenantMembership
Se aprueban estrictamente los siguientes estados iniciales:
- `ACTIVE`: La membresia esta vigente y permite acceso contextual.
- `SUSPENDED`: La membresia existe, pero actualmente no permite acceso.
  - **Aclaracion semantica obligatoria:** `SUSPENDED` **no es sinonimo de `REVOKED`** ni de borrado; representa una suspension temporal de privilegios.

Roles contextuales iniciales aprobados:
- `OWNER`: Administrador y titular del consultorio.
- `MEMBER`: Miembro operativo base del consultorio.

**Elementos diferidos para slices posteriores:**
- Estados diferidos: `INVITED`, `PENDING`, `REVOKED`, `EXPIRED`, y cualquier flujo/workflow de invitacion por email.
- Roles diferidos: `STAFF`, `PROFESSIONAL`, `ADMIN` de consultorio u otros roles especializados.
- No se introduce ABAC configurable ni matriz dinamica de permisos en este slice.

**Revocacion en tiempo real:**
Identity emite un JWT que solo prueba la identidad del usuario (`ActorContext.id`, correspondiente al identificador de cuenta) y no contiene claims de tenant ni membresia. El contexto tenant se valida en base de datos en cada peticion protegida. Por tanto, el cambio de estado a `SUSPENDED` suspende el acceso de forma inmediata sin esperar expiracion de tokens.

### 3.6 Selector canónico de transporte del Tenant
- Se aprueba **`X-Tenant-ID`** como **selector de transporte inicial para el primer vertical slice de la API**.
- **No es una decision irreversible sobre la UX/SaaS final.** El producto podra evaluar subdominios o selectores alternativos en fases posteriores.
- La arquitectura mantiene conceptualmente separadas tres capas:
  1. **Resolucion de tenant:** Convertir un identificador candidato en un tenant activo existente.
  2. **Transporte utilizado para seleccionar el tenant:** Header HTTP `X-Tenant-ID` en este slice.
  3. **Autorizacion de membership:** Validar si el actor autenticado tiene membresia activa en ese tenant.
- El header recibido **nunca constituye evidencia de pertenencia**:
  ```text
  ActorContext (JWT autenticado con id y role)
      +
  Tenant seleccionado (X-Tenant-ID resuelto)
      +
  TenantMembership valida (status === ACTIVE)
      =
  TenantContext autorizado
  ```
  En ningun caso: `X-Tenant-ID = autorizacion`.

### 3.7 Politica transicional de `ADMIN` (Platform Operator vs Tenant Authorization)
- `User.role === ADMIN` representa un rol global de **Platform Operator** durante esta transicion.
- Principio vinculante de no-inferencia:
  ```text
  ADMIN != TenantMembership
  ADMIN != OWNER
  ADMIN != MEMBER
  ```
  `User.role === ADMIN` **no implica pertenencia** a ningun tenant.
- En rutas tenant-protected:
  - `User.role === ADMIN` **NO constituye bypass**.
  - La autorizacion contextual exige obligatoriamente una `TenantMembership` valida y activa para el tenant solicitado. Si un usuario con rol global `ADMIN` envia `X-Tenant-ID: 1` sin poseer una fila en `TenantMembership` para ese tenant, el acceso es denegado.
- Rutas de plataforma:
  - Las rutas administrativas actuales (`/api/admin/*`, `/api/specialties/*`) conservan temporalmente su politica global legacy gobernada por `ActorContext.role === 'ADMIN'`.
- Se documenta formalmente la distincion:
  - **Platform authorization:** Gobierna operaciones globales del sistema basadas en el actor autenticado.
  - **Tenant authorization:** Gobierna recursos y datos de un consultorio especifico basadas en `TenantMembership`.

### 3.8 Aprovisionamiento y bootstrap inicial
- El primer Tenant y sus Memberships se aprovisionaran mediante **mecanismo interno/controlado para pruebas y bootstrap**.
- **No se modifica** `POST /api/auth/register`.
- **No se crea** `POST /api/tenancy/register`.
- No se introduce onboarding publico en este slice (la creacion publica de consultorios queda reservada para un futuro slice/ADR de onboarding).
- El bootstrap permite construir escenarios de prueba deterministas con:
  - Tenant A y Tenant B;
  - Usuario miembro de A;
  - Usuario miembro de B;
  - Usuario miembro de ambos (M:N);
  - Usuario con membresia suspendida en A;
  - Usuario con rol global `ADMIN` sin membresia.

## 4. Ownership y alcance de datos

La tabla separa owner conceptual de scope propuesto. Las decisiones del primer vertical slice estan formalmente cerradas; los modelos operativos pendientes permanecen diferidos para sus propios slices.

| Entidad/modelo actual u objetivo | Owner conceptual | Scope propuesto / estado | Tratamiento en Fase 3 |
|---|---|---|---|
| `Tenant` | Tenancy | Global, raiz de consultorio | **Aprobado para el slice:** Consultorio o clinica medica individual; lifecycle inicial `status = ACTIVE`; sin `Organization` ni sucursales en este slice. Implementar tras aprobacion de diseno. |
| `TenantMembership` (nuevo) | Tenancy | Relacion asociativa M:N entre `User` global y `Tenant` | **Aprobado para el slice:** cardinalidad M:N con restriccion `unique(userId, tenantId)`; estados iniciales `ACTIVE` y `SUSPENDED`; roles iniciales `OWNER` y `MEMBER`. Sin invitaciones ni roles especializados en este slice. |
| `User` | Identity | Global | Identidad transversal en Identity; no agregar `tenantId`; `ActorContext.id` se utiliza como `TenantMembership.userId`; no tratar `role` global como permiso contextual. |
| `RefreshToken`, `VerificationAttempt`, `PasswordReset` | Identity | Global por cuenta de usuario | Fuera del scope tenant; no moverlos a Tenancy. |
| `AdminProfile` | Profiles/plataforma | Global de plataforma (legacy transicional) | Asociado al rol global `User.role === ADMIN` (Platform Operator). No concede pertenencia ni rol en ningun Tenant, ni otorga bypass en rutas tenant-protected. |
| `ClientProfile` | Profiles | Global/personal con participacion en citas vs perfil por tenant; pendiente | No asignar tenant sin regla de cliente multi-consultorio; resolver como se validara acceso a sus citas. |
| `ProfessionalProfile` | Profiles | Profesional compartido entre tenants, perfil por consultorio o relacion de afiliacion; pendiente | Resolver antes de asociarlo a Tenant o migrar Catalog/Scheduling. |
| `ProfessionalSpecialty` | Profiles | Relacion del perfil con `Specialty`; scope sigue al perfil | No convertir `Specialty` en tenant-owned por esta relacion. |
| `Specialty` | Catalog | Candidato global de plataforma; consistente con `name @unique` actual, pendiente de producto | Mantener global hasta decidir catalogo por tenant y su unicidad. |
| `Service` | Catalog | Tenant-owned si cada consultorio administra su oferta; pendiente de confirmar con el modelo profesional | Contrato/repo debe quedar tenant-aware antes de aceptar cambios operativos. |
| `Schedule` | Scheduling | Candidato a scope tenant por operacion/profesional; no decidido | Requiere scope y ownership verificados; el enlace al profesional depende de la decision sobre perfiles compartidos. |
| `Appointment` | Appointments | Candidato a scope tenant por reserva; no decidido | Si se aprueba como tenant-owned, servicio, profesional y cliente deben validarse dentro del mismo contexto; no confiar solo en IDs. |
| `GuestClient` | Appointments | Identidad de invitado local a la reserva/tenant, salvo decision distinta | No convertirlo en identidad global de Identity ni permitir lookup cruzado. |
| `Review` | Reviews | Scope heredado de `Appointment` | Lectura/escritura debe validar tenant a traves de la cita. |
| `Certificate`, `SocialLink` | Profiles | Scope heredado de `ProfessionalProfile` | No requieren necesariamente un `tenantId` duplicado si ownership se asegura mediante relacion/consulta. |
| `Notification` | Notifications | Personal/global o contextual por tenant segun origen; pendiente | Las notificaciones tenant-bound deben transportar y validar el contexto del tenant; la bandeja personal no otorga acceso al recurso origen. |
| `CustomConfig` | Preferences | Preferencia personal hoy; configuracion organizacional futura pendiente | No asumir que cada usuario tiene una configuracion por tenant sin decision de producto. |

**Regla de diseno:** no se debe elegir la forma fisica (columna duplicada, clave compuesta, relacion o derivacion) de `tenantId` antes de cerrar el owner y scope de cada entidad. El requisito de seguridad es que el tenant sea verificable en cada acceso; la estructura exacta se decide en el diseno de schema aprobado.

La ownership de tabla no equivale a quien puede leerla o interactuar con ella durante la transicion. Los adapters legacy pueden operar temporalmente sobre tablas existentes solo bajo contratos y limites documentados; eso no crea un segundo owner conceptual.

## 5. Estructura objetivo

No crear carpetas vacias. La estructura minima candidata es:

```text
src/modules/tenancy/
  http/                         # resolucion/adaptacion de contexto HTTP
  application/
    ports/                      # membership y tenant access contracts
    use-cases/                  # administrar tenant/membership si entra al producto
    policies/                   # capacidades/contextual authorization
  domain/                       # Tenant, Membership e invariantes si se justifican
  infrastructure/
    prisma/                     # persistencia concreta
```

La resolucion HTTP puede permanecer en el adapter de transporte compartido actual si mantiene una dependencia dirigida a un contrato publico de Tenancy. No debe hacer que `shared/` importe un modulo ni alojar reglas de membership en `shared`.

Dependencias permitidas:

```text
HTTP adapter -> Identity AccessTokenService
HTTP adapter -> Tenancy context resolver
Tenancy application -> Tenancy ports + shared ActorContext
operational use case -> TenantContext + sus propios repository ports
Tenancy infrastructure -> Prisma / shared database
```

No permitido:

```text
shared -> tenancy
controller -> query Prisma para comprobar tenant
tenantId del request -> repositorio sin validar membership/politica
modulo A -> tablas Prisma internas del modulo B para descubrir tenant
repositorio tenant-owned -> tenantId opcional o fallback global
```

Fase 3 no migra todas las rutas de negocio ni convierte a Tenancy en propietario de datos de Catalog, Profiles o Appointments. La matriz de la seccion 12 identifica una propuesta de primer slice y las rutas que quedan pendientes; hasta migrarse, esas rutas no deben presentarse como aisladas por tenant.

## 6. Estrategia de migracion segura

La implementacion debe ser aditiva e incremental:

1. **Cerrar decisiones y baseline:** cerrar primero los gates que afecten al primer slice y clasificar el resto como dependencias de fases futuras. Usar la matriz de la seccion 12, no una lista hipotetica.
2. **Aprobar modelo y migracion de Tenant/Membership:** solo despues de aprobar cardinalidad, lifecycle, constraints y una estrategia de datos existentes que no use tenant default.
3. **Demostrar contexto:** resolver un selector, validar Tenant/Membership para una request protegida, y exponer un TenantContext inmutable al caso de uso.
4. **Completar el primer vertical slice:** cumplir todos los criterios de la seccion 16, incluidos tests positivos y negativos con dos tenants.
5. **Revisar superficies restantes:** documentar cada endpoint/job fuera del slice como pendiente, con owner, gate de habilitacion y fase de migracion; no declarar aislamiento global.
6. **Migrar jobs y recursos posteriores por owner:** un job o modulo entra solo cuando su scope de datos, referencias y backfill estan aprobados y tiene tests cross-tenant.

No se propone aqui un tenant default. El backfill debe derivarse de una decision de negocio y de una asignacion de datos observada; filas no asignables deben reportarse y resolverse, no adjudicarse silenciosamente.

## 7. Criterios de aceptacion del primer vertical slice

> **Nota de estado:** El primer vertical slice fue aprobado por el Code Reviewer. Las casillas documentan los criterios verificados durante la implementacion y la revision. Esta aprobacion se limita exclusivamente al alcance del primer slice (frontera de contexto `Tenant/Membership`); los modulos operativos permanecen pendientes para slices posteriores de Fase 3.

- [x] Modelo conceptual `Tenant` (consultorio individual) y `TenantMembership` (M:N con `unique(userId, tenantId)`) y lifecycle minimo (`ACTIVE`/`SUSPENDED`, `OWNER`/`MEMBER`) formalmente aprobados por Producto e implementados en `schema.prisma` y migracion `20261013184542_add_tenancy`.
- [x] Selector `X-Tenant-ID` resuelto por adapter/middleware de Tenancy como transporte inicial; se mantiene estricta distincion entre seleccion y autorizacion.
- [x] La autenticacion de Identity solo provee `ActorContext`; la membresia contextual se valida estrictamente en persistencia.
- [x] `User.role === ADMIN` actua exclusivamente como Platform Operator; en rutas tenant-protected no otorga membresia ni bypass silencioso.
- [x] El aprovisionamiento inicial se realiza mediante mecanismo interno/controlado para pruebas y bootstrap, sin alterar `POST /api/auth/register` ni crear endpoints de onboarding publico.
- [x] Endpoint tecnico `GET /api/tenancy/current` implementado bajo contrato seguro con politica uniforme `{ "message": "Tenant context unavailable or access denied" }` (HTTP 403) para mitigar enumeracion de tenants, alineado al handler global `errorHandler.ts`.
- [x] Pruebas automatizadas con dos tenants (A y B) demuestran acceso valido, denegacion horizontal cross-tenant, denegacion por suspension y denegacion a admin sin membresia.
- [x] Rutas y jobs operativos (`Appointment`, `Service`, `Schedule`, perfiles, catalogo, cron) permanecen formalmente inventariados y pendientes para slices posteriores; no se declaran tenant-safe.
- [x] No se modifican contratos HTTP legacy existentes. El esquema de datos (`schema.prisma`) y la migracion `20261013184542_add_tenancy` fueron actualizados unicamente para incorporar `Tenant` y `TenantMembership`, conforme al diseno aprobado; ningun modelo operativo existente fue alterado.

## 8. Decisiones cerradas de producto vs Decisiones diferidas

### 8.1 Grupo A: Decisiones de Producto cerradas para el primer vertical slice
1. **Definicion de Tenant:** Consultorio o clinica medica individual (frontera operativa y de autorizacion autonoma). Excluye `Organization`, sucursales y jerarquias padre/hijo en este slice.
2. **Selector de transporte inicial:** `X-Tenant-ID` en el request HTTP para la API. No representa una decision irreversible sobre la UX final. El header nunca es autorizacion.
3. **Cardinalidad de Membership:** M:N mediante `TenantMembership` con restriccion de unicidad `unique(userId, tenantId)`. Identidad global de `User`, membresia contextual en `Tenant`.
4. **Lifecycle inicial de Membership:** Estados `ACTIVE` (vigente) y `SUSPENDED` (acceso temporalmente deshabilitado, no sinonimo de revocacion definitiva). Roles `OWNER` y `MEMBER`.
5. **Aprovisionamiento inicial:** Proceso interno/controlado para pruebas y bootstrap. Sin tocar `POST /api/auth/register` y sin `POST /api/tenancy/register`.
6. **Politica de `ADMIN`:** Rol global de Platform Operator. `ADMIN != TenantMembership`, `ADMIN != OWNER`, `ADMIN != MEMBER`. Sin bypass en rutas tenant-protected.
7. **Contrato tecnico del slice:** Endpoint de validacion `GET /api/tenancy/current` con politica uniforme de respuesta ante tenant inaccesible para mitigar enumeracion.
8. **Estado del Tenant:** `status: ACTIVE` para representar un tenant resoluble y operativo en este slice.

### 8.2 Grupo B: Decisiones diferidas para slices operativos posteriores (Post-Slice)
*(No se fuerzan en este primer slice; permanecen como superficies pendientes)*
- Scope y cardinalidad de `ProfessionalProfile` (afiliacion global vs perfil por consultorio).
- Scope y privacidad de `ClientProfile` (paciente global vs ficha medica local).
- Scope de `Specialty` (catalogo unificado de plataforma vs catalogo local por clinica).
- Scope de `Service` y `Schedule` (vinculacion relacional y validacion cruzada de profesionales).
- Scope de `Appointment` (aislamiento relacional de citas y participacion de actores).
- Scope de `Review` y `Notification` contextuales.
- Refactorizacion tenant-aware del cron worker de citas (`appointment.worker.ts`).
- Estrategia de migracion y backfill de datos legacy.

### 8.3 Grupo C: Fuera de alcance inmediato
- Jerarquias complejas multi-sucursal (`Organization` / `Branch`).
- Planes, billing y limites de uso (SaaS Tiering).
- Dominios personalizados y automatizacion TLS.
- Particionamiento fisico (Database-per-tenant / Schema-per-tenant / RLS).

## 9. Riesgos y mitigaciones

| Riesgo | Consecuencia | Mitigacion/gate |
|---|---|---|
| Mover `tenantId` solo al controller | Consultas olvidadas filtran datos entre tenants | Tenant requerido en ports/repositorios y pruebas cross-tenant. |
| Confiar en `X-Tenant-ID`, URL o claim | Suplantacion de contexto y acceso horizontal | Resolver selector, validar tenant y membership/politica por request. |
| Usar `User.role` como role de tenant | Escalada de privilegios y roles ambiguos | Roles/permisos de membership; admin de plataforma separado. |
| Agregar columnas antes de definir ownership | Datos duplicados o tenants imposibles de asignar | Matriz de scope y gates cerrados antes del schema. |
| Crear un tenant default durante backfill | Asignacion incorrecta y exposicion silenciosa | Mapeo explicito, reporte de excepciones, no fallback. |
| Membership dentro del JWT sin revocacion | Acceso conserva permisos retirados hasta expirar token | Resolver membership en request o aprobar cache con invalidacion formal. |
| Middleware universal con reglas implicitas | Rutas publicas, jobs o flujos guest quedan mal clasificados | Clasificacion por endpoint/caso de uso y politica explicita. |
| Migrar todas las tablas simultaneamente | Despliegue riesgoso y rollback complejo | Expand/contract, lote por modulo y compatibilidad temporal medible. |
| Mantener queries legacy globales | Falsa sensacion de aislamiento aunque existan memberships | Inventario de consumidores, guardas de transicion y criterio de retiro por modulo. |
| Introducir RLS, eventos o abstraccion multi-storage prematuramente | Complejidad y nueva superficie sin requerimiento | Fuera de alcance; reconsiderar con requerimiento concreto y ADR separado. |

## 10. Fuera de alcance

- Migracion de perfiles, catalogo, scheduling, appointments, reviews o preferences.
- Implementacion de registro/onboarding; su decision esta en [ADR_REGISTRATION_ONBOARDING.md](ADR_REGISTRATION_ONBOARDING.md).
- Cambiar paths, cuerpos o respuestas HTTP.
- Agregar columnas `tenantId`, constraints, indices o migraciones Prisma antes de aprobar el schema y el backfill.
- Cambiar el access token de Identity para hacer del tenant una autoridad de seguridad.
- RBAC/ABAC completo, jerarquias, planes, billing o limites de uso.
- Row-Level Security (RLS), schema-per-tenant, database-per-tenant, eventos, outbox o sistema de permisos configurable.
- Corregir riesgos de seguridad no relacionados fuera de las superficies que se migren.

## 11. Revision de la implementacion

La revision de diseno fue completada y aprobada por Producto, lo que habilito la implementacion del primer vertical slice. Posteriormente, el Code Reviewer realizo la **revision de la implementacion** y emitio veredicto `APPROVED`, verificando que el codigo, el esquema y las pruebas se ajustan fielmente a las decisiones de diseno aprobadas (secciones 3 a 16).

Aspectos verificados por el Code Reviewer:

- consistencia de la implementacion con los limites de Identity, Shared Kernel y ADR de onboarding;
- que `User.role` no actue como autorizacion contextual en el codigo implementado;
- que la resolucion del tenant no se confunda con membership en la cadena de ejecucion;
- que la matriz diferencie ownership, scope y acceso transicional;
- que el plan de backfill y enforcement no permita fallback global;
- que criterios de aislamiento cubran rutas, repositorios, jobs, caches y recursos publicos;
- que las decisiones abiertas esten claramente separadas de las recomendaciones tecnicas;
- que la implementacion de `Tenant` y `TenantMembership` en `schema.prisma` y la migracion `20261013184542_add_tenancy` se ajusten al diseno aprobado sin alterar modelos operativos existentes;
- que el caso de uso `GetCurrentTenantUseCase` permanezca desacoplado de `AppError` y utilice errores de dominio del modulo de tenancy.

El veredicto `APPROVED` se limita al alcance del primer vertical slice. Los modulos operativos y slices posteriores de Fase 3 requieren sus propias revisiones antes de considerarse aprobados.

## 12. Matriz de rutas montadas y clasificacion de acceso

La matriz refleja el registro actual en `src/app.ts` y los middlewares visibles en los routers. “Actual” describe controles observados, no certifica que el ownership sea suficiente. “Destino” es una clasificacion para planear tenancy, no un cambio aprobado de politica.

Fuentes de registro: [`app.ts`](../src/app.ts), [`identity.routes.ts`](../src/modules/identity/http/identity.routes.ts), [`auth.routes.ts`](../src/modules/auth/auth.routes.ts), [`admin.routes.ts`](../src/modules/admin/admin.routes.ts), [`specialty.routes.ts`](../src/modules/specialty/specialty.routes.ts), [`users.routes.ts`](../src/modules/users/users.routes.ts), [`professionalprofile.routes.ts`](../src/modules/users/professionalprofile/professionalprofile.routes.ts), [`service.routes.ts`](../src/modules/services/service.routes.ts), [`schedule.routes.ts`](../src/modules/schedule/schedule.routes.ts), [`appointments.routes.ts`](../src/modules/appointments/appointments.routes.ts), [`notifications.routes.ts`](../src/modules/notifications/notifications.routes.ts) y [`reviews.routes.ts`](../src/modules/reviews/reviews.routes.ts).

| Rutas montadas (metodo y path) | Control actual observado | Clasificacion objetivo para tenancy | Notas/gates |
|---|---|---|---|
| `POST /api/auth/login`, `GET /api/auth/verify`, `POST /api/auth/refresh`, `POST /api/auth/forgot-password`, `POST /api/auth/reset-password` | Publicas; login/refresh/verify/reset validan sus credenciales/tokens de Identity | **Global Identity**, sin TenantContext | El tenant activo no es claim de autorizacion en esta fase. |
| `POST /api/auth/register` | Publica; flujo legacy de onboarding | **Global Identity/onboarding** hasta decision de creacion de tenant | No crea Tenant/Membership hoy. No asignar tenant implicito ni mover register como parte de este diseno. |
| `PATCH /api/admin/profiles/:profileId/review`, `GET /api/admin/professionals`, `GET /api/admin/profiles/pending`, `PATCH /api/admin/profiles/:profileId/status`, `PATCH /api/admin/:professionalId/specialties/:specialtyId/status` | Router completo requiere JWT y `User.role = ADMIN` global | **Plataforma global legacy (transicional)**; autorizada por `ActorContext.role === 'ADMIN'` | Aprobado transicionalmente: Administracion global de plataforma. Esta autorizacion legacy NO concede acceso a rutas tenant-protected ni declara tenant-safe a estas operaciones administrativas. |
| `GET /api/specialties/`, `GET /api/specialties/professional/:profileId` | Publicas | **Global o public-tenant, pendiente** | `Specialty.name` tiene unicidad global hoy; el producto decide si se conserva. |
| `GET /api/specialties/soft-deleted`, `POST /api/specialties/`, `PATCH /api/specialties/:id`, `PATCH /api/specialties/:id/restore`, `DELETE /api/specialties/:id` | JWT y rol global `ADMIN` | **Plataforma global legacy (transicional)**; autorizada por `ActorContext.role === 'ADMIN'` | Aprobado transicionalmente: Mantenimiento del catalogo global legacy. NO concede acceso a rutas tenant-protected ni declara tenant-safe al catalogo. |
| `GET /api/users/me`, `PATCH /api/users/profile`, `PATCH /api/users/email`, `PATCH /api/users/password`, `PATCH /api/users/avatar` | JWT; opera con actor autenticado | **Global Identity / personal Profiles** | No hacer estas rutas tenant-owned sin decidir si algun dato del perfil se configura por consultorio. |
| `GET /api/config/me`, `PUT /api/config/me` | JWT | **Personal/global o tenant-specific, pendiente** | `CustomConfig` es hoy uno por usuario; preferencias organizacionales requeririan otra decision. |
| `POST /api/appointments/create` | JWT; controller deriva `ClientProfile` del actor, no restringe rol en el router | **Tenant-protected, propuesta** | Membership y tenant del servicio/profesional deben validarse; no se implementan hoy. |
| `GET /api/appointments/history`, `GET /api/appointments/upcoming` | JWT; consulta por actor y perfiles asociados | **Tenant-protected y participant-scoped, propuesta** | Resolver privacidad multi-consultorio para clientes y profesionales. |
| `PATCH /api/appointments/:id/status` | JWT y rol global `PROFESSIONAL`; el service compara perfil profesional del actor con la cita | **Tenant-protected + participant/role policy, propuesta** | El rol global no demuestra membership; query/update actual usa cita por ID antes de validar ownership. |
| `POST /api/appointments/create-guest`, `GET /api/appointments/availability` | Publicas; IDs de profesional/servicio llegan en body/query | **Guest/public-tenant, pendiente** | Exigen tenant resoluble y referencias del mismo tenant si el producto aprueba citas tenant-owned. |
| `GET /api/professionals/Allprofiles`, `GET /api/professionals/:id` | Publicas; se filtra perfil aprobado, no tenant | **Public-tenant o directorio global, pendiente** | Requiere decidir visibilidad, selector de tenant y si un perfil puede listarse en varios consultorios. |
| `POST /api/professionals/social-links`, `PATCH /api/professionals/social-links/:id`, `DELETE /api/professionals/social-links/:id` | JWT; controller pasa el actor y el service comprueba ownership del perfil/registro | **Tenant-protected si el perfil tiene scope tenant** | El ownership personal actual no sustituye membership del consultorio. |
| `POST /api/professionals/certificates`, `DELETE /api/professionals/certificates/:id` | JWT; no hay guard de rol en el router; el service deriva el perfil del actor | **Tenant-protected si el perfil tiene scope tenant** | El comentario del controller menciona rol profesional, pero la ruta no aplica `authorizeRole`/`requireRole`. |
| `PATCH /api/professionals/:professionalId/specialties/:specialtyId/status` | JWT y rol global `ADMIN` | **Plataforma global legacy (transicional)**; autorizada por `ActorContext.role === 'ADMIN'` | Aprobado transicionalmente: Mismo caso de negocio que en /api/admin; autorizacion global de plataforma, sin privilegios contextuales de tenant. |
| `POST /api/professionals/specialties/:specialtyId` | JWT y rol global `PROFESSIONAL`; controller usa al actor | **Tenant-protected si la afiliacion profesional es tenant-scoped** | La policy depende de si el perfil profesional es global, afiliado o per-tenant. |
| `GET /api/services/professional/:profileId` | Publica por ID de perfil | **Public-tenant o catalogo global, pendiente** | No tiene resolver/contexto tenant actual. |
| `POST /api/services/`, `PATCH /api/services/:id`, `DELETE /api/services/:id` | JWT y rol global `PROFESSIONAL`; perfil se deriva del actor y mutaciones comparan `profileId` | **Tenant-protected, propuesta** | Definir perfil compartido/afiliacion y comprobar que servicio, perfil y especialidad coincidan en tenant. |
| `GET /api/schedules/professional/:profileId` | Publica por ID de perfil | **Public-tenant, pendiente** | El alcance publico y la pertenencia del horario siguen el modelo de perfil/consultorio por decidir. |
| `POST /api/schedules/`, `PUT /api/schedules/:id`, `DELETE /api/schedules/:id` | JWT y rol global `PROFESSIONAL`; perfil se deriva del actor y las mutaciones comparan `profileId` | **Tenant-protected, propuesta** | Membership y el tenant operativo del perfil deben validarse. |
| `GET /api/notifications/` | JWT; filtra por `userId` del actor | **Personal/global; tenant metadata opcional segun origen** | Ver la pertenencia del usuario a una notificacion no debe conceder acceso al recurso origen. |
| `PUT /api/notifications/:id/read` | JWT; el service observado actualiza por `notificationId`, sin `userId` en el filtro | **Personal/global + ownership obligatorio** | Hallazgo de seguridad existente que debe corregirse antes de incluir el endpoint en una superficie SaaS; no es una politica ya satisfecha. |
| `PUT /api/notifications/read-all` | JWT; filtra por `userId` | **Personal/global; tenant metadata opcional segun origen** | Las notificaciones tenant-bound requieren validar tambien el origen/contexto. |
| `POST /api/reviews/` | JWT y rol global `CLIENT`; el service deriva el cliente y consulta la cita | **Tenant-protected por la cita, propuesta** | Decidir modelo de cliente y membership; validar que la cita sea del contexto. |
| `GET /api/reviews/professional/:professionalProfileId`, `GET /api/reviews/appointment/:appointmentId`, `POST /api/reviews/batch/by-appointments` | JWT; IDs recibidos por URL/body; no membership tenant | **Tenant-protected por la cita/perfil, propuesta** | Definir si reviews son publicas; hoy requieren autenticacion, y lecturas multi-ID deben comprobar scope individual. |
| `GET /img/*`, `GET /avatars/*`, `GET /certificates/*` | Servido por Express static, sin auth ni tenant | **Publico/global hasta politica de archivos aprobada** | No incluir certificados privados/tenant-bound en rutas publicas sin diseno de storage y autorizacion. |

### Routers y superficies no montadas

- `src/modules/specialty/ProfessionalSpecialty/professionalSpecialty.routes.ts` define `POST /me/specialties/:specialtyId/request` y `PATCH /:professionalId/specialties/:specialtyId/status`, pero `src/app.ts` no monta ese router. No son endpoints HTTP activos en el baseline actual.
- La ruta de estado de `ProfessionalSpecialty` si esta montada dentro de `/api/admin` y `/api/professionals` por otros routers; ambas rutas deben permanecer diferenciadas en el inventario.
- No se encontro otro router HTTP montado en `src/app.ts` en el inventario revisado.

## 13. Matriz de jobs y tareas programadas

| Proceso observado | Estado y arranque | Acceso a datos actual | Clasificacion y condicion tenant |
|---|---|---|---|
| Cron de appointments (`cron.schedule("* * * * *")`) | **Activo**; `bootstrap/server.ts` importa `appointment.worker.ts`, lo que registra la tarea en el proceso backend | Cada minuto consulta globalmente citas `PENDING`/`CONFIRMED`, carga perfiles y actualiza cada cita por ID; emite notificaciones | **Tenant-owned candidate, no tenant-safe hoy.** Antes de habilitar citas multi-tenant debe recibir/derivar scope verificable, actualizar dentro de ese scope y probar no-cruce entre tenants. Alternativamente se debe excluir/deshabilitar mientras las citas no esten migradas. |
| BullMQ worker `cancel*` / `complete*` en `appointment.worker.ts` | **Inactivo/comentado**; no crea Worker ni Queue ejecutable mientras siga dentro del comentario | El bloque comentado actualiza citas por ID sin tenant | No clasificar como job desplegado. Si se reactiva, debe redisenarse tenant-aware antes de procesar datos tenant-owned. |
| `runSeeds()` y seeds de admin, specialty, professional, schedule y clients | Inicializacion al arrancar via `bootstrap/server.ts`; no es scheduler/job asincrono | Upserts/creaciones sobre modelos globales y datos de demostracion, incluyendo relaciones operativas | **Bootstrap legacy no tenant-aware.** Debe auditarse para entornos donde no corresponda sembrar datos; no es un mecanismo de backfill ni crea membership/tenants automaticamente. |

Fuentes: [`appointment.worker.ts`](../src/modules/appointments/appointment.worker.ts), [`server.ts`](../src/bootstrap/server.ts) y [`seed/index.ts`](../src/seed/index.ts).

No se encontro otro scheduler/worker activo en el codigo fuente inspeccionado. La existencia de la dependencia BullMQ no significa que el bloque comentado este desplegado.

## 14. Matriz de hallazgos y decisiones: evidencia vs producto

La columna “resolucion de diseno” refleja las decisiones de producto formalmente aprobadas para cerrar los gates del primer vertical slice.

| ID | Hallazgo verificable | Evidencia | Resolucion aprobada / diseno | Tipo |
|---|---|---|---|---|
| H-01 | El acceptance original pedia tenant para todo repository tenant-owned, todos los jobs y pruebas de aislamiento de datos, pero tambien excluia migrar las rutas de negocio y dejaba el scope de modelos abierto. | Roadmap/Fase 3 y matriz de ownership de este documento. | **Cerrado para el slice:** Se delimita el primer slice exclusivamente a la frontera de contexto (resolucion, membership M:N, autorizacion contextual y denegacion cross-tenant). Los modulos operativos permanecen formalmente clasificados como pendientes para slices independientes posteriores. | Correccion arquitectonica |
| H-02 | La matriz anterior no enumeraba los routers montados ni diferenciaba middleware de ownership efectivo; existe una ruta escrita pero no montada. | `src/app.ts` y routers; seccion 12. | **Cerrado:** Se utiliza la matriz de rutas montadas; el router no montado permanece catalogado aparte; no se trata un guard de rol global como autorizacion contextual. | Evidencia de codigo |
| H-03 | El diseno exigia `tenantId` en jobs como si fueran jobs con payload; el proceso activo es un cron global, mientras el worker BullMQ es comentario. | `appointment.worker.ts`; seccion 13. | **Diferido:** Cron activo queda formalmente excluido del primer slice y permanece no habilitado para multi-tenancy hasta su propia migracion aprobada. | Correccion de hecho |
| H-04 | El selector tenant se dejaba abierto entre header, host y path mientras se afirmaba que el cliente no cambiaria contrato HTTP y la matriz de rutas no tenia contexto tenant actual. | `src/app.ts` no monta resolver; rutas existentes no declaran selector. | **Cerrado para el slice:** Producto aprobo `X-Tenant-ID` como selector de transporte inicial para la API en este slice. Se separa conceptualmente transporte, resolucion y autorizacion. | Gate de producto cerrado |
| H-05 | Se dibujaba TenantContext con membership/rol/permisos opcionales como forma aparentemente resuelta, aunque membership y permisos siguen abiertos. | No hay modelos/contratos Tenant ni Membership en `schema.prisma`/`src`. | **Cerrado para el slice:** Se aprueba cardinalidad M:N con `unique(userId, tenantId)`, estados iniciales `ACTIVE` y `SUSPENDED`, y roles `OWNER` y `MEMBER`. TenantContext se construye inmutable tras validar persistencia. | Correccion de diseno |
| H-06 | `Appointment`/`Schedule` y otros modelos se presentaban como tenant-owned pese a decisiones abiertas de perfil, cliente y catalogo. | Relaciones actuales de Prisma no contienen Tenant; baseline ownership declara decisiones abiertas. | **Diferido:** Permanecen catalogados como scope pendiente/no decidido para slices posteriores. El primer slice no los toca. | Correccion documental |
| H-07 | Los documentos preliminares recomendaban agregar `tenantId` a perfiles, citas, especialidades, etc., un wrapper Prisma global y `DEFAULT_TENANT_ID`, contradiciendo la regla de no asignar por default ni filtrar globalmente. | `TENANCY.md` y `DB_SCHEMA.md` existentes. | **Cerrado:** Marcados como notas historicas no aprobadas y subordinadas a esta matriz; no se ejecutan sus snippets. | Correccion documental |
| H-08 | El diseño indicaba que `User.role` no basta, pero no separaba con precision `ADMIN` plataforma vs administrador de consultorio. | Enum `Role` y middlewares actuales solo comparan rol global. | **Cerrado para el slice:** Se aprueba politica: `User.role === ADMIN` es Platform Operator global y no constituye bypass en rutas tenant-protected. En rutas tenant-protected se exige `TenantMembership` activa. | Gate de producto cerrado |
| H-09 | Datos actuales no contienen `tenantId`; el cron y seeds operan sobre filas globales. | `schema.prisma`, `appointment.worker.ts`, `seed/index.ts`. | **Cerrado para el slice:** El primer slice se prueba con aprovisionamiento interno/controlado para bootstrap de pruebas (Tenant A y B). No se realiza backfill ni asignacion por default. | Gate de producto/datos |

### Que puede afirmarse solo con el codigo

> Las afirmaciones siguientes corresponden al estado del codigo al momento de la revision de diseno (pre-implementacion). El estado actual de la implementacion del primer vertical slice se documenta en la seccion 19.

- Identity tiene `User` con email unico y rol global `Role`; al momento del diseno no habia Tenant, Membership ni selector tenant en persistencia.
- `ClientProfile.userId` y `ProfessionalProfile.userId` son unicos, lo cual demuestra una relacion actual uno-a-uno con User, no el modelo futuro de pertenencia a consultorios.
- `Specialty.name` es globalmente unico en el schema actual.
- Rutas y guardias actuales, ownership local observado y cron global quedan inventariados en las secciones 12 y 13.
- El backend no prueba aislamiento operativo ni compatibilidad multi-tenant en modulos de negocio operativos (perfiles, catalogo, citas, etc.); la frontera de contexto tenant del primer vertical slice si esta probada (seccion 19).

## 15. Estado de decisiones de producto: Cerradas para el slice vs Diferidas

| Decision | Alternativa aprobada / Estado | Justificacion e impacto |
|---|---|---|
| **1. Que representa Tenant** | **Aprobada: Consultorio o clinica medica individual** *(Opcion A)* | Frontera autonoma de operacion y autorizacion. Se descartan `Organization`, jerarquias padre/hijo y multi-branch en este slice. |
| **2. Selector de Tenant** | **Aprobada: Header `X-Tenant-ID` como transporte inicial** *(Opcion C)* | Selector de transporte para la API en el primer slice. No es decision irreversible de UX/SaaS. Transporte, resolucion y autorizacion se mantienen separados. El header nunca equivale a autorizacion. |
| **3. Cardinalidad de Membership** | **Aprobada: M:N con `unique(userId, tenantId)`** *(Opcion B)* | Un usuario puede pertenecer a multiples consultorios. Identidad global en Identity, pertenencia contextual en Tenancy. |
| **4. Lifecycle de Membership** | **Aprobada: Estados `ACTIVE`, `SUSPENDED`; Roles `OWNER`, `MEMBER`** | `ACTIVE` permite acceso; `SUSPENDED` deshabilita temporalmente (no es sinonimo de `REVOKED`). Revocacion en tiempo real por no almacenar membership en JWT. Invitaciones, roles especializados y ABAC quedan diferidos. |
| **5. Politica de ADMIN** | **Aprobada: Platform Operator global sin bypass** | `ADMIN != TenantMembership`, `ADMIN != OWNER`, `ADMIN != MEMBER`. En rutas tenant-protected se exige membership activa en el tenant solicitado. Rutas de plataforma (`/api/admin/*`, `/api/specialties/*`) conservan temporalmente su politica legacy. |
| **6. Creacion del primer Tenant** | **Aprobada: Aprovisionamiento interno / controlado** | Sin tocar `POST /api/auth/register`, sin `POST /api/tenancy/register` y sin onboarding publico en este slice. |
| **7. Contrato tecnico del slice** | **Aprobada: `GET /api/tenancy/current` con anti-enumeracion** | Sonda tecnica para verificar la cadena de contexto. No demuestra aislamiento general de datos. Politica uniforme de error para evitar enumeracion de tenants. |
| **8. Estado del Tenant** | **Aprobada: `status: ACTIVE` minimo para el slice** | Representa un tenant resoluble y operativo. Estados complejos (`ARCHIVED`, `DELETED`, etc.) quedan diferidos. |
| **Recursos operativos (Profiles, Catalog, Scheduling, Appointments, Reviews, Notifications, Cron)** | **Diferidas para slices operativos posteriores** | Permanecen formalmente pendientes; no se fuerza decision definitiva en este slice ni se declaran tenant-safe. |
| **Backfill de datos legacy** | **Diferido** | El primer slice opera con bootstrap controlado de pruebas; no se asignan datos legacy a tenants por defecto. |

## 16. Primer vertical slice: Especificacion tecnica y limites

### 16.1 Proposito del slice
El primer vertical slice implementa un **bootstrap y verificador de contexto tenant protegido** que demuestra la integracion de la frontera de contexto sin alterar los modulos operativos de negocio.

Demuestra exclusivamente la cadena:
```text
HTTP Request (Bearer JWT + X-Tenant-ID)
  ↓
Identity Auth Middleware (valida JWT -> ActorContext { id, role })
  ↓
Tenancy Context Resolver (lee X-Tenant-ID -> consulta Tenant en DB)
  ↓
Tenancy Membership Guard (consulta TenantMembership { userId: ActorContext.id, tenantId } en DB)
  ↓
TenantContext validado e inmutable { tenant, membership }
  ↓
Caso de uso GetCurrentTenantUseCase
  ↓
Response segura
```

### 16.2 Contrato conceptual: `GET /api/tenancy/current`

| Elemento | Especificacion |
|---|---|
| **Metodo y Path** | `GET /api/tenancy/current` |
| **Actor requerido** | Usuario autenticado por Identity (`ActorContext` con `{ id, role }` valido via Bearer JWT, conforme a [FASE1_SHARED_KERNEL.md](FASE1_SHARED_KERNEL.md); `ActorContext.id` representa el identificador de usuario y se utiliza como `TenantMembership.userId` en persistencia sin redefinir Shared Kernel). |
| **Selector requerido** | Header HTTP `X-Tenant-ID: <id_entero>` (ej. `X-Tenant-ID: 1`). |
| **Condicion de Tenant** | Registro existente en base de datos con `Tenant.status === 'ACTIVE'`. |
| **Condicion de Membership**| Registro existente en base de datos con `TenantMembership.status === 'ACTIVE'`. |
| **Respuesta minima exitosa (200 OK)** | ```json
{
  "tenant": {
    "id": 1,
    "name": "Consultorio Central",
    "slug": "consultorio-central",
    "status": "ACTIVE"
  },
  "membership": {
    "role": "OWNER",
    "status": "ACTIVE",
    "joinedAt": "2026-10-10T12:00:00.000Z"
  }
}
``` |

### 16.3 Politica de errores y mitigacion de enumeracion de tenants

Para evitar revelar si un ID de consultorio existe o no en la plataforma a actores no autorizados (ataques de enumeracion/fuerza bruta de `X-Tenant-ID`), se establece la siguiente politica formal de errores, **alineada con el middleware global de Express [`errorHandler.ts`](../src/shared/http/errorHandler.ts)** (el cual serializa las instancias de `AppError` enviando el código HTTP vía `res.status(err.statusCode)` y un cuerpo JSON con propiedad única `{ "message": err.message }`, sin duplicar `statusCode` en el payload):

1. **Autenticacion fallida (`401 Unauthorized`):**
   - Causas: Token ausente, token expirado, firma invalida o usuario revocado en Identity.
   - Respuesta: Error estandar de autenticacion de Identity (`res.status(401).json({ message: "..." })`).

2. **Selector ausente o malformado (`400 Bad Request`):**
   - Causas: Peticion a ruta tenant-protected sin header `X-Tenant-ID`, o valor con formato no numerico / entero positivo invalido.
   - Código HTTP: `400 Bad Request`
   - Cuerpo JSON:
     ```json
     {
       "message": "Tenant selector header 'X-Tenant-ID' is required and must be a valid positive integer."
     }
     ```

3. **Contexto no autorizado / Tenant inaccesible (`403 Forbidden` UNIFORME):**
   - **Causas agrupadas bajo respuesta indistinguible:**
     - El tenant con el `id` indicado no existe en la base de datos.
     - El tenant existe pero su estado no es `ACTIVE`.
     - El tenant existe y es `ACTIVE`, pero el actor autenticado **no tiene una membresia activa** en ese tenant (`TenantMembership` inexistente o con `status === 'SUSPENDED'`).
     - El actor autenticado tiene `User.role === ADMIN` global pero no tiene membresia activa en ese tenant.
   - Código HTTP: `403 Forbidden`
   - **Respuesta uniforme en el cuerpo JSON:**
     ```json
     {
       "message": "Tenant context unavailable or access denied"
     }
     ```
   - **Justificacion de seguridad:** Diferenciar con `404 Not Found` cuando el tenant no existe y `403 Forbidden` cuando el tenant existe pero el usuario no es miembro permitiria a cualquier usuario autenticado escanear secuencialmente IDs (`X-Tenant-ID: 1`, `2`, `3`...) y descubrir el mapa completo de consultorios registrados en el sistema. La respuesta uniforme neutraliza este vector.

### 16.4 Que NO devuelve este endpoint
- Otros tenants en los que el usuario tenga membresia.
- Lista de otros usuarios o miembros del consultorio.
- Datos operativos (citas, servicios, agendas, pacientes, historiales clinicos).
- Configuraciones tecnicas, variables de entorno o secretos de base de datos.

### 16.5 Que NO demuestra este primer slice
- **No demuestra** aislamiento de filas en `Appointment`, `Service`, `Schedule`, `ProfessionalProfile` ni `ClientProfile`.
- **No demuestra** seguridad multi-tenant en el cron worker asincrono (`appointment.worker.ts`).
- **No demuestra** soporte multi-tenant en rutas publicas o guest.
- **Solo demuestra:** Resolucion determinista del selector de transporte, validacion de pertenencia contextual activa y denegacion horizontal cross-tenant sobre el contexto tenant.

### 16.6 Escenarios minimos de prueba para el slice
El primer vertical slice debe acompanarse de tests automatizados que cubran deterministamente:
1. *Acceso permitido:* Usuario autenticado con membresia `ACTIVE` en Tenant A -> `200 OK` con contexto de Tenant A.
2. *Denegacion horizontal cross-tenant:* Usuario autenticado con membresia solo en Tenant A solicita `X-Tenant-ID: <id_Tenant_B>` -> `403 Forbidden` (respuesta uniforme).
3. *Denegacion por suspension:* Usuario autenticado con membresia `SUSPENDED` en Tenant A solicita Tenant A -> `403 Forbidden` (respuesta uniforme).
4. *Denegacion a Admin global sin membresia:* Usuario con `User.role === ADMIN` solicita Tenant A sin membresia activa en Tenant A -> `403 Forbidden` (respuesta uniforme, sin bypass).
5. *Tenant inexistente:* Usuario solicita un tenant inexistente -> `403 Forbidden` (respuesta uniforme anti-enumeracion).
6. *Selector ausente o invalido:* Peticion sin header `X-Tenant-ID` o con string no numerico -> `400 Bad Request`.
7. *Usuario multi-tenant:* Usuario autenticado con membresias activas en Tenant A y Tenant B puede obtener el contexto de cada uno enviando el respectivo header de forma independiente.

## 17. Validacion documental de esta revision

- Se inspeccionaron `src/app.ts`, todos los routers bajo `src/modules/**`, middlewares de auth/roles y los controladores/servicios necesarios para clasificar ownership observado.
- Se confirmaron las tareas activas/inactivas en `appointment.worker.ts`, el import del cron desde `bootstrap/server.ts` y el arranque de seeds.
- Se compararon las afirmaciones de `TENANCY.md`, `DB_SCHEMA.md`, `BASELINE_SECURITY.md`, `BASELINE_OWNERSHIP.md` y `REFACTOR_PHASES.md`.
- Esta revision actualiza el estado de la implementacion: el primer vertical slice fue implementado en `src/modules/tenancy/`, `schema.prisma` y la migracion `20261013184542_add_tenancy`. La evidencia detallada de implementacion y los resultados de validacion se registran en la seccion 19.

## 18. Estado actual de la implementacion

1. El diseno de Fase 3 fue formalmente aprobado por Producto con las decisiones de producto cerradas para el primer vertical slice.
2. Las decisiones operativas de perfiles, catalogo, citas y cron quedan formalmente catalogadas como diferidas para sus respectivos slices posteriores de Fase 3, evitando bloqueos cruzados.
3. El contrato de `GET /api/tenancy/current` y su politica de error uniforme anti-enumeracion quedan especificados con rigor e implementados.
4. Se mantiene la subordinacion de los documentos historicos preliminares (`TENANCY.md` y `DB_SCHEMA.md`).
5. La implementacion del primer vertical slice fue ejecutada, validada mediante pruebas automatizadas y verificacion de tipos, y aprobada por el Code Reviewer (evidencia en la seccion 19).

**Conclusion actual:** `PRIMER SLICE APROBADO; FASE 3 ABIERTA PARA SLICES OPERATIVOS POSTERIORES`. El primer vertical slice de Fase 3 (frontera de contexto `Tenant/Membership` y `GET /api/tenancy/current`) fue aprobado por el Code Reviewer. Fase 3 no se declara cerrada: los modulos operativos (citas, servicios, horarios, perfiles, catalogo, notificaciones, cron) permanecen pendientes de sus propios slices, decisiones de diseno, implementacion, pruebas y revision.

## 19. Evidencia de implementacion del primer vertical slice

> Esta seccion documenta la implementacion del primer vertical slice, la cual fue aprobada por el Code Reviewer. La evidencia se registra separada de las decisiones de diseno aprobadas (secciones 3 a 16). La aprobacion se limita exclusivamente al alcance del primer slice (frontera de contexto `Tenant/Membership`); no certifica el aislamiento multi-tenant de los modulos operativos.

### 19.1 Cambios de codigo

El modulo de tenancy se implemento bajo `src/modules/tenancy/` con la siguiente estructura:

| Capa | Archivo | Responsabilidad |
|---|---|---|
| HTTP | `http/tenancy.routes.ts` | Define `GET /current` protegido por `authMiddleware`. Montado en `/api/tenancy` desde `src/app.ts`. |
| HTTP | `http/tenancy.controller.ts` | Lee y valida `X-Tenant-ID`, verifica autenticacion (`req.user`), delega al caso de uso y mapea errores a respuestas HTTP (200, 400, 401, 403). |
| HTTP | `http/tenancy.dto.ts` | Constante `TENANT_SELECTOR_HEADER`, mensaje de error y `parseTenantId()` que valida entero positivo dentro del rango de PostgreSQL `INTEGER` (`<= 2,147,483,647`). |
| Application | `application/use-cases/get-current-tenant-use-case.ts` | `GetCurrentTenantUseCase` valida que el tenant y la membresia esten `ACTIVE`; lanza `TenantContextUnavailableError` en caso contrario. **Desacoplado de `AppError`.** |
| Application | `application/ports/tenant-context-repository.ts` | Contrato `TenantContextRepository` y tipo `TenantContextRecord`. |
| Domain | `domain/tenancy-errors.ts` | `TenantContextUnavailableError extends Error` con mensaje uniforme anti-enumeracion. |
| Infrastructure | `infrastructure/prisma/prisma-tenant-context-repository.ts` | Implementacion Prisma del puerto; consulta `tenantMembership.findUnique` por clave compuesta `userId_tenantId`. |

### 19.2 Cambios de esquema y migracion

- **`prisma/schema.prisma`:** Se agregaron los modelos `Tenant` y `TenantMembership`, y los enums `TenantStatus`, `TenantRole`, `MembershipStatus`. Ningun modelo operativo existente fue modificado.
- **`prisma/migrations/20261013184542_add_tenancy/migration.sql`:** Crea las tablas `Tenant` y `TenantMembership`, los enums correspondientes, indices (`Tenant.slug` unico, `TenantMembership.userId_tenantId` unico, indices por estado) y llaves foraneas con `ON DELETE CASCADE`.

### 19.3 Desacoplamiento del caso de uso con `AppError`

El hallazgo del Code Reviewer sobre el acoplamiento de `get-current-tenant-use-case.ts` con `AppError` fue corregido:

- El caso de uso importa y lanza `TenantContextUnavailableError` desde `@/modules/tenancy/domain/tenancy-errors`.
- `TenantContextUnavailableError` extiende `Error` (no `AppError`), manteniendo el dominio de tenancy independiente del shared kernel de errores HTTP.
- El controlador (`tenancy.controller.ts`) captura `TenantContextUnavailableError` y lo mapea a HTTP 403 con el mensaje uniforme, alineado con la politica anti-enumeracion definida en la seccion 16.3.

### 19.4 Resultados de validacion

| Validacion | Resultado | Comando ejecutado |
|---|---|---|
| Pruebas de Tenancy | **14/14** | `npx vitest run tests/tenancy/tenancy.http.test.ts` |
| Suite completa | **63/63, 12 archivos** | `npx vitest run` |
| TypeScript | **Sin errores** | `npx tsc --noEmit` |

**Cobertura de escenarios de prueba (`tests/tenancy/tenancy.http.test.ts`):**

1. Acceso permitido con membresia `ACTIVE` en Tenant A (200 OK).
2. Denegacion horizontal cross-tenant: usuario de A intenta acceder a B (403 uniforme).
3. Denegacion por membresia `SUSPENDED` (403 uniforme).
4. **401 sin autenticacion:** peticion sin token Bearer (401).
5. Denegacion a `ADMIN` global sin membresia (403 uniforme, sin bypass).
6. Tenant inexistente (403 uniforme anti-enumeracion).
7. Selector `X-Tenant-ID` invalido (7 variantes): ausente, texto, cero, negativo, decimal, fuera de rango seguro de JS y **fuera del rango de PostgreSQL `INTEGER` (`2147483648`)** (400).
8. Usuario multi-tenant: acceso independiente a Tenant A y Tenant B segun el header enviado.

**Nota sobre Vite:** La ejecucion de pruebas emite una advertencia de Vite sobre `configLoader: 'native'` (sintaxis ESM en `vitest.config.ts` cargado como CommonJS). Esta advertencia **no impide la ejecucion** de las pruebas ni afecta los resultados.

### 19.5 Veredicto del Code Reviewer

El Code Reviewer emitio veredicto `APPROVED` para la implementacion del primer vertical slice, con las siguientes precisiones:

- **Alcance del veredicto:** El `APPROVED` se limita exclusivamente a la frontera de contexto `Tenant/Membership` implementada mediante `GET /api/tenancy/current`. No certifica el aislamiento multi-tenant de los modulos operativos (citas, servicios, horarios, perfiles, catalogo, notificaciones, cron), los cuales permanecen pendientes de sus propios slices en Fase 3.
- **Ejecucion independiente de pruebas:** El Code Reviewer declaro que **no ejecuto** los comandos de prueba de forma independiente; los resultados de la seccion 19.4 corresponden a la ejecucion realizada durante la implementacion.
- **Hallazgo P3 (corregido):** El comentario `@throws {AppError}` en la documentacion del metodo `execute` de `GetCurrentTenantUseCase` era inconsistente con la implementacion, ya que el caso de uso lanza `TenantContextUnavailableError` (error de dominio) y no `AppError`. Este hallazgo fue corregido actualizando el comentario JSDoc para reflejar la excepcion real lanzada.
- **Desacoplamiento de `AppError`:** Se verifico que `get-current-tenant-use-case.ts` permanece desacoplado de `AppError`, utilizando `TenantContextUnavailableError` del dominio de tenancy.

### 19.6 Estado de migraciones por entorno

La migracion del esquema (`20261013184542_add_tenancy`) esta implementada y aplicada. Sin embargo, existe un **antecedente de discrepancia en la base de pruebas respecto al historial de migraciones**: la base de pruebas puede no reflejar fielmente el historial de migraciones registrado.

- Esta discrepancia **no fue resuelta por las pruebas HTTP** del primer slice, las cuales operan sobre el esquema ya aplicado.
- La reconciliacion del historial de migraciones en la base de pruebas debe validarse **antes de declarar la estrategia de despliegue completamente lista**.
- Hasta esa reconciliacion, el estado de migraciones por entorno debe considerarse pendiente de verificacion.

### 19.7 Limites explicitos de esta implementacion

Conforme al diseno aprobado, esta implementacion:

- **No modifica** contratos HTTP legacy existentes.
- **No migra** modulos operativos (`Appointment`, `Service`, `Schedule`, perfiles, catalogo, notificaciones, cron); estos corresponden a slices posteriores de Fase 3.
- **No implementa** aislamiento de datos en superficies operativas; solo demuestra la frontera de contexto tenant.
- El `APPROVED` del Code Reviewer se limita al primer vertical slice; Fase 3 permanece abierta para los slices operativos posteriores.
