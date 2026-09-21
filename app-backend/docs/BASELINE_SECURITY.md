# Baseline del backend — Bloque 3
# Autenticación, autorización y ownership

## Alcance

Este documento cubre el Bloque 3 de la Fase 0. Describe el flujo real de seguridad desde las rutas hasta la persistencia, sin modificar código ni proponer migraciones.

Se distingue entre:

- **Hecho observado:** comportamiento comprobable en el código.
- **Riesgo:** impacto posible bajo una condición concreta.
- **No confirmado:** el código sugiere una posibilidad, pero requiere prueba dinámica o revisar una parte no concluyente.
- **Implicación arquitectónica:** impacto para autorización contextual y futuro tenancy.

## Flujo actual de autenticación

### Generación del JWT

En `auth.service.ts`, los tokens de acceso se generan durante:

- login;
- verificación de cuenta;
- refresh token.

El payload enviado a `generateToken` es:

```ts
{
  userId: user.id,
  role: user.role,
}
```

La interfaz [auth.types.ts](../src/modules/auth/auth.types.ts) define:

```ts
interface JwtPayload {
  userId: number;
  role: Role;
}
```

El token se firma con `JWT_SECRET` y expira en `7d`.

### Refresh token

### Hecho observado

- se genera un token aleatorio de 64 bytes;
- se almacena únicamente su hash SHA-256 en `RefreshToken`;
- expira en 30 días;
- al refrescar, el token anterior se marca como revocado;
- se crea un nuevo refresh token;
- el nuevo access token vuelve a contener `userId` y `role`.

### Riesgo

No se observó detección explícita de reutilización de un refresh token ya revocado más allá del rechazo por `isRevoked: false`. Tampoco se observó una familia de tokens o registro de reutilización.

### No confirmado

No se puede afirmar una vulnerabilidad de rotación sin pruebas concurrentes o sin conocer el comportamiento esperado ante dos requests simultáneos.

### Implicación arquitectónica

El modelo de sesión actual está ligado a `User` global y no a una membresía de tenant. El futuro contexto de identidad deberá distinguir usuario, sesión y pertenencia a organización.

## Validación actual del JWT

### Hecho observado

El middleware [auth.middleware.ts](../src/middlewares/auth.middleware.ts):

1. exige el header `Authorization`;
2. exige el prefijo `Bearer `;
3. ejecuta `jwt.verify(token, JWT_SECRET)`;
4. castea el resultado a un `JwtPayload` local;
5. construye `req.user` con:

```ts
{
  id: payload.userId,
  role: payload.role as any,
}
```

No consulta la existencia del usuario en la base de datos durante cada request.

### Hecho observado: diferencias de contrato

Existen dos definiciones de payload:

- `auth.types.ts`: `role: Role`;
- `auth.middleware.ts`: `role: string`.

Además, el middleware usa `as JwtPayload` y `as any` sin validar la forma del payload con un schema.

### Riesgo

Si existe un JWT firmado válido con claims malformados, el middleware puede construir un `req.user` con:

- `userId` no numérico;
- `role` fuera del enum esperado;
- claims ausentes.

El impacto depende de cada service y de si posteriormente consulta con ese valor. Esto no permite por sí solo asumir bypass de firma.

### No confirmado

No se demuestra que un atacante externo pueda generar un token firmado. La condición requiere conocer o comprometer `JWT_SECRET`, otro componente que firme tokens, o una configuración insegura.

### Implicación arquitectónica

La identidad autenticada es un objeto técnico mínimo, no un contexto de autorización completo. Faltan:

- `tenantId`;
- membership;
- permisos/scopes;
- versión de sesión;
- validación de claims centralizada.

## Middlewares de autenticación y roles

### `authMiddleware`

Responsabilidades observadas:

- validar Bearer token;
- verificar firma y expiración implícita de JWT;
- asignar `req.user`.

No hace:

- consulta de usuario;
- verificación de `isVerified`;
- validación de membership;
- tenant resolution;
- ownership;
- permisos por recurso.

### `authorizeRole`

Ubicación: `src/middlewares/auth.middleware.ts`.

Características:

- recibe `string[]`;
- verifica que exista `req.user`;
- compara `req.user.role` contra los strings permitidos;
- devuelve `401` si no hay usuario;
- devuelve `403` si el rol no coincide.

### `requireRole`

Ubicación: `src/middlewares/role.middleware.ts`.

Características:

- recibe `Role[]` del enum Prisma;
- verifica `req.user`;
- compara contra los roles permitidos;
- devuelve `403` tanto para usuario ausente como para rol no permitido.

### Diferencia arquitectónica

Ambos middlewares resuelven autorización por rol, pero tienen contratos y respuestas diferentes:

| Aspecto | `authorizeRole` | `requireRole` |
|---|---|---|
| Tipo de roles | `string` | `Role` |
| Ubicación | auth middleware | role middleware |
| Usuario ausente | `401` | `403` |
| Tenant | no | no |
| Ownership | no | no |
| Permisos granulares | no | no |

## Matriz de endpoints y seguridad

| Endpoint/grupo | Auth | Rol | Ownership observado | Resultado |
|---|---|---|---|---|
| `/api/auth/*` | público | — | token de operación en verify/reset | autenticación por tokens de operación |
| `/api/users/me` | Bearer | cualquiera | deriva por `req.user.id` | ownership por usuario |
| `/api/users/profile` | Bearer | role switch en controller | deriva por `req.user.id` | control manual |
| `/api/users/email` | Bearer | cualquiera | deriva por `req.user.id` + contraseña | control por usuario |
| `/api/users/password` | Bearer | cualquiera | deriva por `req.user.id` + contraseña | control por usuario |
| `/api/users/avatar` | Bearer | cualquiera | deriva por `req.user.id` y role | control manual |
| `/api/professionals/*` públicos | ninguno | — | no aplica | validaciones de publicación |
| `/api/professionals/social-links/*` | Bearer | cualquiera | service compara `profileId` | ownership manual |
| `/api/professionals/certificates/*` | Bearer | cualquiera en router | service compara `profileId` en delete; create usa usuario | revisar rol explícito |
| `/api/professionals/:professionalId/specialties/:specialtyId/status` | Bearer | ADMIN | IDs recibidos, sin tenant | autorización por rol, ownership global |
| `/api/admin/*` | Bearer | ADMIN | IDs recibidos | rol global, sin tenant |
| `/api/services` mutaciones | Bearer | PROFESSIONAL | profile derivado y comparado | ownership manual |
| `/api/services/professional/:profileId` | público | — | no aplica | lectura por ID |
| `/api/schedules` mutaciones | Bearer | PROFESSIONAL | profile derivado y comparado | ownership manual |
| `/api/schedules/professional/:profileId` | público | — | no aplica | lectura por ID |
| `/api/appointments/create` | Bearer | no restringido por rol en ruta | client profile derivado del usuario | el service crea con ese profile |
| `/api/appointments/:id/status` | Bearer | PROFESSIONAL | service compara profesional | ownership manual |
| `/api/appointments/history` y `/upcoming` | Bearer | cualquiera | service consulta perfiles por usuario | ownership por usuario, revisar consultas |
| `/api/appointments/create-guest` | público | — | profesional y servicio llegan del body; reglas de servicio/horario | flujo guest intencional |
| `/api/appointments/availability` | público | — | IDs llegan por query | reglas de servicio, horario y citas |
| `/api/notifications/` | Bearer | cualquiera | filtra por userId | ownership por usuario |
| `/api/notifications/:id/read` | Bearer | cualquiera | update solo por notification ID | ownership no aplicado |
| `/api/notifications/read-all` | Bearer | cualquiera | filtra por userId | ownership por usuario |
| `/api/reviews/` | Bearer | CLIENT | cita comparada con cliente | ownership manual |
| `/api/reviews/professional/:id` | Bearer | cualquiera | filtra por profesional ID | acceso autenticado, tenant no aplicado |
| `/api/reviews/appointment/:id` | Bearer | cualquiera | consulta por appointment ID | ownership no observado |
| `/api/reviews/batch/by-appointments` | Bearer | cualquiera | lista de IDs del body | ownership no observado |

## Ownership por área

### Users y perfiles

### Hecho observado

- `me`, cambio de email, cambio de contraseña y avatar usan `req.user.id`.
- `ClientProfileService` actualiza por `userId`.
- `ProfessionalProfileService.updateProfile` actualiza por `userId`.
- social links y certificados se buscan por ID y luego se compara `profileId` con el perfil del usuario.

### Riesgo

El ownership existe en varios métodos, pero no está centralizado. Un nuevo endpoint puede omitirlo fácilmente.

### No confirmado

No se puede afirmar que todos los métodos internos de perfil tengan el mismo nivel de protección sin revisar cada método y sus pruebas.

### Implicación arquitectónica

El ownership debería formar parte del caso de uso/repositorio, no depender de que cada controller recuerde pasar el `userId`.

### Services

### Hecho observado

- El `profileId` de mutación se obtiene desde `req.user.id`.
- `update` y `remove` buscan `Service` por `{ id, profileId }`.
- `create` valida que el profesional tenga la especialidad aprobada.

### Riesgo

Las operaciones actuales protegen la propiedad del servicio respecto al perfil profesional, pero no hay una segunda dimensión de tenant.

### No confirmado

No se demuestra acceso cruzado actual entre consultorios porque no existe tenancy implementado.

### Schedules

### Hecho observado

- Las mutaciones resuelven el perfil profesional por usuario.
- `update` y `remove` buscan horario por `{ id, profileId }`.
- la lectura pública acepta `profileId` directamente.

### Riesgo

La lectura pública permite consultar cualquier perfil conocido por ID. Esto puede ser correcto para un directorio público, pero su alcance futuro requiere decidir si el perfil pertenece a un catálogo global o a un tenant.

### No confirmado

No se considera vulnerabilidad solo por ser público. No hay evidencia de que el endpoint exponga campos privados.

### Appointments autenticadas

### Hecho observado

- crear cita obtiene el `ClientProfile` desde el usuario autenticado;
- cambiar estado obtiene el `ProfessionalProfile` desde el usuario autenticado;
- el service compara el profesional de la cita con el profesional autenticado;
- historial y próximas citas se construyen a partir de perfiles asociados al usuario.

### Riesgo

El endpoint `create` no tiene `requireRole("CLIENT")`; el controller intenta encontrar un `ClientProfile`. Un usuario profesional/admin sin perfil cliente normalmente fallará, pero la regla depende de datos y errores del service, no del middleware.

### No confirmado

No se puede afirmar acceso a citas ajenas en historial/upcoming sin revisar todas las ramas de consulta y ejecutar pruebas con usuarios que tengan más de un perfil.

### Appointments guest

### Hecho observado

`create-guest` es público intencionalmente y valida:

- schema de guest;
- servicio activo perteneciente al profesional recibido;
- fecha futura;
- horario del profesional;
- solapamiento;
- creación o reutilización de `GuestClient`.

### Riesgo

- la búsqueda/reutilización de guest usa `email` y `name`;
- no se observó tenant;
- no se observó una validación explícita de que el profesional esté `APPROVED`;
- no se observó rate limiting en el flujo público.

### No confirmado

No se puede afirmar que crear una cita guest sea incorrecto: es una funcionalidad intencional. Tampoco se puede afirmar abuso sin rate-limit, logs y pruebas operativas.

### Implicación arquitectónica

El flujo guest necesita un contexto de consultorio/tenant aunque no requiera login. El tenant no puede depender de `req.user` en este caso.

### Notifications

### Hecho observado

- listado filtra por `userId`;
- mark-all filtra por `userId`;
- mark-one actualiza por `notificationId` únicamente.

### Riesgo confirmado

Un usuario autenticado que conozca o adivine el ID de una notificación puede marcar como leída una notificación que pertenece a otro usuario, porque `markAsRead` no recibe ni filtra por `userId`.

Impacto observado: modifica el estado de lectura. El código revisado no muestra lectura del contenido en esa operación, pero sigue siendo una violación de ownership.

### Implicación arquitectónica

Los métodos tenant/user-owned deben recibir el sujeto de ownership, no solo el ID global del recurso.

### Reviews

### Hecho observado

- crear review obtiene la cita por ID;
- obtiene el perfil cliente desde el usuario;
- compara `appointment.clientProfileId` con ese perfil;
- exige estado `COMPLETED`;
- impide review duplicada;
- las consultas de lectura por appointment/profesional/lista no reciben `userId`.

### Riesgo confirmado

Un usuario autenticado puede consultar una review por `appointmentId` si conoce el ID, sin que el service compruebe que sea cliente, profesional relacionado o administrador.

En `getProfessionalReviews`, además, la respuesta incluye `appointment.clientProfile`, por lo que un usuario autenticado podría obtener datos del perfil cliente asociado a reseñas de un profesional, sujeto a los campos efectivamente devueltos por Prisma.

### No confirmado

No se afirma que todos los datos sean sensibles o que exista explotación práctica sin revisar datos reales y políticas de privacidad. El defecto de autorización por ownership sí es observable en el código.

### Implicación arquitectónica

Las consultas de lectura también necesitan una política de acceso. No basta proteger mutaciones.

### Administración

### Hecho observado

- todas las rutas `/api/admin` requieren JWT y rol `ADMIN`;
- `profileId`, `professionalId` y `specialtyId` llegan desde la URL;
- no existe validación de membership o tenant;
- `ProfessionalProfileService` consulta y modifica por ID.

### Riesgo

En el sistema actual, cualquier usuario con rol `ADMIN` puede operar sobre cualquier perfil o relación identificable. Si `ADMIN` debía ser global, esto puede ser intencional; si debía ser administrador de consultorio, es una autorización excesiva.

### No confirmado

No se clasifica como vulnerabilidad actual sin una definición del significado de `ADMIN`. Sí es una ambigüedad crítica para SaaS.

## Endpoints públicos y sus invariantes

### Auth

Los endpoints públicos usan tokens de operación o credenciales:

- verificación: hash del token, expiración y `isUsed`;
- reset: hash, expiración y `isUsed`;
- login: bcrypt y verificación de cuenta;
- refresh: hash, expiración y revocación.

### Perfil profesional público

### Hecho observado

- `getPublicById` devuelve solo un shape público construido por el service;
- exige que el perfil esté `APPROVED` en el controller;
- `getAllPublic` filtra perfiles `APPROVED`.

### No confirmado

La lectura pública no es por sí misma insegura. Falta decidir si todos los perfiles aprobados pertenecen a un catálogo global o si deben filtrarse por tenant.

### Catálogo, horarios y disponibilidad

Las lecturas públicas reciben IDs y consultan recursos activos o reglas de disponibilidad. El código no tiene tenant, pero eso es una limitación arquitectónica conocida y no una vulnerabilidad demostrada del sistema single-tenant.

## Diferencias entre roles

| Rol | Capacidades actuales observadas | Limitación |
|---|---|---|
| `CLIENT` | registro público, crear reseñas, reservar como cliente, leer recursos autenticados | no existe scope de tenant |
| `PROFESSIONAL` | administrar servicios/horarios propios, cambiar estado de sus citas, solicitar especialidades | autorización por rol y ownership manual |
| `ADMIN` | revisar perfiles, administrar especialidades y relaciones profesionales | significado global/tenant no definido |

El rol se almacena en `User.role` y se copia al JWT. No existe un rol por organización.

## Hallazgos de severidad

### P0

No se confirma un P0 con el flujo estático revisado.

### P1

#### P1-SEC-001 — Marcar notificación ajena por ID

- Archivo: `src/modules/notifications/notifications.service.ts`
- Evidencia: `markAsRead(notificationId)` ejecuta `update({ where: { id: notificationId } })`.
- Condición: usuario autenticado conoce un ID de notificación ajena.
- Impacto: modifica estado de otro usuario.

#### P1-SEC-002 — Lecturas de reviews sin ownership observable

- Archivos: `src/modules/reviews/reviews.service.ts`.
- Evidencia: `getByAppointment` consulta por `appointmentId`; `getProfessionalReviews` consulta por profesional; ninguno recibe usuario/contexto.
- Impacto: lectura autenticada potencialmente no autorizada; `getProfessionalReviews` incluye perfil de cliente.

#### P1-SEC-003 — IDs administrativos sin contexto de organización

- Archivos: `admin.controller.ts`, `professionalprofile.service.ts`, `ProfessionalSpecialty.Service.ts`.
- Evidencia: operaciones por IDs y rol global.
- Impacto: si existen administradores de organizaciones, pueden operar fuera de su ámbito.
- Estado: riesgo de diseño actual, no vulnerabilidad demostrada sin definición de `ADMIN`.

### P2

#### P2-SEC-001 — Dos middlewares de rol incompatibles

La misma política conceptual tiene dos implementaciones con tipos y códigos HTTP distintos.

#### P2-SEC-002 — Claims JWT casteados sin validación estructural

La firma se verifica, pero el payload se fuerza mediante cast y se asigna `role as any`.

#### P2-SEC-003 — Ownership distribuido manualmente

Cada service implementa su propia forma de buscar el propietario. Esto eleva la probabilidad de omisiones.

#### P2-SEC-004 — `req.user` duplicado

Existen dos declaraciones globales equivalentes en:

- `src/types/express.d.ts`;
- `src/middlewares/types/express.d.ts`.

#### P2-SEC-005 — `create` de appointments no restringe explícitamente a CLIENT

La ruta usa autenticación, pero la regla de cliente depende de encontrar `ClientProfile`.

#### P2-SEC-006 — Público guest sin rate limiting observado

No se observó limitación de solicitudes en las rutas públicas. La ausencia por sí sola no demuestra abuso, pero incrementa superficie operativa.

### P3

#### P3-SEC-001 — Inconsistencia de respuestas 401/403

`authorizeRole` devuelve 401 sin usuario y `requireRole` devuelve 403.

#### P3-SEC-002 — Logs de autenticación

`AuthService.login` registra correo y eventos de credenciales fallidas. Debe revisarse contra la política de logs, aunque no se observó la contraseña en claro.

## Implicaciones arquitectónicas

1. El sujeto autenticado actual es `User + role`, no una identidad con membership.
2. La autorización se implementa en router, controller y service sin una política única.
3. Ownership no es parte obligatoria de los contratos de consulta.
4. Las lecturas protegidas reciben menos atención que las mutaciones.
5. Los endpoints guest necesitan tenant resolution independiente de login.
6. `ADMIN` debe dividirse conceptualmente entre plataforma y organización si ambos roles existen.
7. Los eventos/side effects no tienen contexto de usuario o tenant explícito.

## No se modifica en este bloque

- JWT;
- middleware;
- rutas;
- services;
- Prisma;
- contratos HTTP;
- roles existentes.

Este documento es únicamente el mapa de seguridad actual para la Fase 0.

