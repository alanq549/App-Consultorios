# Baseline del backend — Fase 0

## Alcance de este documento

Este baseline registra el estado observado del backend antes de iniciar el refactor arquitectónico.

Esta versión cubre el **Bloque 1 de la Fase 0: inventario de endpoints**. No se modificó código de `src/`, Prisma ni contratos HTTP.

El **Bloque 2: inventario de módulos, modelos y responsabilidades** está documentado en [BASELINE_MODULES.md](BASELINE_MODULES.md).

El **Bloque 3: autenticación, autorización y ownership** está documentado en [BASELINE_SECURITY.md](BASELINE_SECURITY.md).

El **Bloque 4: DTOs, tipos, interfaces y contratos** está documentado en [BASELINE_CONTRACTS.md](BASELINE_CONTRACTS.md).

El **Bloque 5: Prisma, ownership de modelos y candidatos a bounded contexts** está documentado en [BASELINE_OWNERSHIP.md](BASELINE_OWNERSHIP.md).

El **Bloque 6: consolidación de riesgos, decisiones y arquitectura pendiente** está documentado en [BASELINE_DECISIONS.md](BASELINE_DECISIONS.md).

La trazabilidad utilizada para cada endpoint es:

```text
app.ts
  -> router
    -> controller
      -> service
        -> Prisma / side effects
```

## Método de levantamiento

Se revisaron:

- `src/app.ts`;
- todos los archivos `*.routes.ts`;
- controllers de los módulos montados;
- middleware de autenticación y roles;
- servicios invocados por los controllers;
- `prisma/schema.prisma` para identificar los modelos principales y sus relaciones.

## Convenciones de lectura

### Autenticación

- `Público`: no exige `authMiddleware`.
- `Bearer`: usa `authMiddleware`.

### Autorización

- `ADMIN`, `PROFESSIONAL` o `CLIENT`: middleware de rol explícito.
- `Todos autenticados`: tiene autenticación, pero no restricción de rol en router.
- `Manual`: la autorización se intenta dentro del controller/service.
- `No identificada`: no existe evidencia suficiente en el flujo revisado.

### Ownership

- `Usuario actual`: el recurso se deriva de `req.user.id`.
- `Propietario validado`: el service compara el recurso con el perfil del usuario.
- `Ownership manual`: existe una comprobación dentro de service/controller, no un guard central.
- `No verificado`: el endpoint recibe un ID y no se observó comprobación suficiente del usuario propietario.
- `No aplica`: endpoint público o acción global.
- `Tenant pendiente`: no existe aislamiento por tenant actualmente.

## Composición de rutas

Los prefijos se registran en [src/app.ts](../src/app.ts):

| Prefijo | Router | Módulo actual |
|---|---|---|
| `/api/auth` | `auth.routes.ts` | auth |
| `/api/admin` | `admin.routes.ts` | admin |
| `/api/specialties` | `specialty.routes.ts` | specialty |
| `/api/users` | `users.routes.ts` | users |
| `/api/config` | `config.routes.ts` | config |
| `/api/appointments` | `appointments.routes.ts` | appointments |
| `/api/professionals` | `professionalprofile.routes.ts` | users/professionalprofile |
| `/api/services` | `service.routes.ts` | services |
| `/api/schedules` | `schedule.routes.ts` | schedule |
| `/api/notifications` | `notifications.routes.ts` | notifications |
| `/api/reviews` | `reviews.routes.ts` | reviews |

### Router declarado pero no montado directamente

Existe [professionalSpecialty.routes.ts](../src/modules/specialty/ProfessionalSpecialty/professionalSpecialty.routes.ts), pero no se importa ni se monta en [src/app.ts](../src/app.ts).

Por tanto, sus rutas no deben contarse como endpoints activos independientes. Algunas operaciones equivalentes sí están expuestas mediante:

- [professionalprofile.routes.ts](../src/modules/users/professionalprofile/professionalprofile.routes.ts);
- [admin.routes.ts](../src/modules/admin/admin.routes.ts).

Esto representa duplicación de superficie declarada y debe resolverse en una decisión posterior, no durante este baseline.

## Inventario de endpoints activos

### Identity / auth

| Método | Ruta completa | Módulo actual | Controller | Service | Auth | Roles | Ownership | Modelo principal | Estado |
|---|---|---|---|---|---|---|---|---|---|
| POST | `/api/auth/register` | auth | `AuthController.register` | `AuthService.register` | Público | — | No aplica | `User` | Confirmado |
| POST | `/api/auth/login` | auth | `AuthController.login` | `AuthService.login` | Público | — | No aplica | `User`, `RefreshToken` | Confirmado |
| GET | `/api/auth/verify` | auth | `AuthController.verifyByToken` | `AuthService.verifyByToken` | Público | — | Token de verificación | `VerificationAttempt`, `User`, `RefreshToken` | Confirmado |
| POST | `/api/auth/refresh` | auth | `AuthController.refresh` | `AuthService.refresh` | Público | — | Refresh token | `RefreshToken`, `User` | Confirmado |
| POST | `/api/auth/forgot-password` | auth | `AuthController.forgotPassword` | `AuthService.forgotPassword` | Público | — | Correo/token | `PasswordReset`, `User` | Confirmado |
| POST | `/api/auth/reset-password` | auth | `AuthController.resetPassword` | `AuthService.resetPassword` | Público | — | Token de reset | `PasswordReset`, `User`, `RefreshToken` | Confirmado |

Observaciones:

- El JWT actual contiene `userId` y `role`; no contiene `tenantId`.
- El registro crea además perfil, configuración y token de verificación.
- Login, verificación y refresh crean o rotan sesiones.

### Users y perfiles

| Método | Ruta completa | Módulo actual | Controller | Service | Auth | Roles | Ownership | Modelo principal | Estado |
|---|---|---|---|---|---|---|---|---|---|
| GET | `/api/users/me` | users | `UsersController.me` | `UsersService.me` | Bearer | Todos autenticados | Usuario actual | `User`, perfil, `CustomConfig` | Confirmado |
| PATCH | `/api/users/profile` | users | `UsersController.updateProfile` | `UsersService.updateProfile` y servicio de perfil por rol | Bearer | Según `req.user.role` | Usuario actual | `ClientProfile` o `ProfessionalProfile` | Confirmado |
| PATCH | `/api/users/email` | users | `UsersController.changeEmail` | `UsersService.changeEmail` | Bearer | Todos autenticados | Usuario actual | `User` | Confirmado |
| PATCH | `/api/users/password` | users | `UsersController.changePassword` | `UsersService.changePassword` | Bearer | Todos autenticados | Usuario actual | `User`, `RefreshToken` | Confirmado |
| PATCH | `/api/users/avatar` | users | `UsersController.updateAvatar` | `UsersService.updateAvatar` y servicio de perfil | Bearer + multer | Todos autenticados | Usuario actual | `ClientProfile`, `ProfessionalProfile` | Confirmado |

Observaciones:

- `UsersController` decide el schema según el rol.
- El avatar se guarda en filesystem mediante `multer` y posteriormente se elimina el archivo anterior desde `UsersService`.
- El endpoint no tiene todavía una noción de tenant en la ruta, token o almacenamiento.

### Professional profiles

| Método | Ruta completa | Módulo actual | Controller | Service | Auth | Roles | Ownership | Modelo principal | Estado |
|---|---|---|---|---|---|---|---|---|---|
| GET | `/api/professionals/Allprofiles` | users/professionalprofile | `ProfessionalProfileController.getAllPublic` | `ProfessionalProfileService.getAllPublic` | Público | — | No aplica | `ProfessionalProfile` | Confirmado |
| GET | `/api/professionals/:id` | users/professionalprofile | `ProfessionalProfileController.getPublic` | `ProfessionalProfileService.getPublicById` | Público | — | No aplica | `ProfessionalProfile` | Confirmado |
| POST | `/api/professionals/social-links` | users/professionalprofile | `ProfessionalProfileController.createSocialLink` | `ProfessionalProfileService.createSocialLink` | Bearer | Todos autenticados en router | Ownership manual probable | `SocialLink`, `ProfessionalProfile` | Pendiente de revisar |
| PATCH | `/api/professionals/social-links/:id` | users/professionalprofile | `ProfessionalProfileController.updateSocialLink` | `ProfessionalProfileService.updateSocialLink` | Bearer | Todos autenticados en router | Ownership manual probable | `SocialLink`, `ProfessionalProfile` | Pendiente de revisar |
| DELETE | `/api/professionals/social-links/:id` | users/professionalprofile | `ProfessionalProfileController.deleteSocialLink` | `ProfessionalProfileService.deleteSocialLink` | Bearer | Todos autenticados en router | Ownership manual probable | `SocialLink`, `ProfessionalProfile` | Pendiente de revisar |
| POST | `/api/professionals/certificates` | users/professionalprofile | `ProfessionalProfileController.uploadCertificate` | `ProfessionalProfileService.createCertificate` | Bearer + multer | Todos autenticados en router | Ownership manual probable | `Certificate`, `ProfessionalProfile` | Riesgo |
| DELETE | `/api/professionals/certificates/:id` | users/professionalprofile | `ProfessionalProfileController.deleteCertificate` | `ProfessionalProfileService.deleteCertificate` | Bearer | Todos autenticados en router | Ownership manual probable | `Certificate`, `ProfessionalProfile` | Pendiente de revisar |
| PATCH | `/api/professionals/:professionalId/specialties/:specialtyId/status` | users/professionalprofile / specialty | `ProfessionalSpecialtyController.setStatus` | `ProfessionalSpecialtyService.setSpecialtyStatus` | Bearer | `ADMIN` | IDs recibidos; tenant no verificado | `ProfessionalSpecialty`, `ProfessionalProfile` | Riesgo |
| POST | `/api/professionals/specialties/:specialtyId` | users/professionalprofile / specialty | `ProfessionalSpecialtyController.requestSpecialty` | `ProfessionalSpecialtyService.requestSpecialty` | Bearer | `PROFESSIONAL` | Profesional derivado de usuario | `ProfessionalSpecialty`, `Specialty` | Confirmado |

Observaciones:

- La ruta `/api/professionals/:professionalId/specialties/:specialtyId/status` duplica conceptualmente una ruta administrativa.
- `ProfessionalProfileController.uploadCertificate` no declara `requireRole("PROFESSIONAL")`; la autorización real depende del service.
- Las rutas públicas exponen datos de perfiles y deben clasificarse posteriormente como catálogo global o tenant-owned.

### Administration

El router aplica a todas sus rutas:

```text
authMiddleware + authorizeRole("ADMIN")
```

| Método | Ruta completa | Módulo actual | Controller | Service | Auth | Roles | Ownership | Modelo principal | Estado |
|---|---|---|---|---|---|---|---|---|---|
| PATCH | `/api/admin/profiles/:profileId/review` | admin | `AdminController.reviewProfessionalProfile` | `ProfessionalProfileService.reviewProfile` | Bearer | `ADMIN` | Acción administrativa sobre perfil | `ProfessionalProfile` | Confirmado |
| GET | `/api/admin/professionals` | admin | `AdminController.getAllProfiles` | `ProfessionalProfileService.getAllProfiles` | Bearer | `ADMIN` | No aplica, listado global actual | `ProfessionalProfile` | Riesgo |
| GET | `/api/admin/profiles/pending` | admin | `AdminController.getPendingProfiles` | `ProfessionalProfileService.getPendingProfiles` | Bearer | `ADMIN` | No aplica, listado global actual | `ProfessionalProfile` | Riesgo |
| PATCH | `/api/admin/profiles/:profileId/status` | admin | `AdminController.setProfileStatus` | `ProfessionalProfileService.setProfileStatus` | Bearer | `ADMIN` | ID de perfil; tenant no verificado | `ProfessionalProfile` | Riesgo |
| PATCH | `/api/admin/:professionalId/specialties/:specialtyId/status` | admin | `ProfessionalSpecialtyController.setStatus` | `ProfessionalSpecialtyService.setSpecialtyStatus` | Bearer | `ADMIN` | IDs recibidos; tenant no verificado | `ProfessionalSpecialty`, `ProfessionalProfile` | Riesgo |

Observaciones:

- El significado de `ADMIN` no está definido: puede ser operador global de la plataforma o administrador de un consultorio.
- Actualmente cualquier `ADMIN` autenticado parece poder revisar perfiles y especialidades sin un tenant o membership.
- Los controllers administrativos manejan errores directamente con `500`, a diferencia de otros módulos que delegan al error handler.

### Catalog: services

| Método | Ruta completa | Módulo actual | Controller | Service | Auth | Roles | Ownership | Modelo principal | Estado |
|---|---|---|---|---|---|---|---|---|---|
| GET | `/api/services/professional/:profileId` | services | `ServiceController.listByProfessional` | `ServiceService.findByProfessional` | Público | — | No aplica | `Service`, `ProfessionalProfile` | Riesgo |
| POST | `/api/services/` | services | `ServiceController.create` | `ServiceService.getProfileIdByUser`, `ServiceService.create` | Bearer | `PROFESSIONAL` | Perfil derivado de usuario | `Service`, `ProfessionalSpecialty` | Confirmado |
| PATCH | `/api/services/:id` | services | `ServiceController.update` | `ServiceService.getProfileIdByUser`, `ServiceService.update` | Bearer | `PROFESSIONAL` | Propietario validado por `profileId` | `Service` | Confirmado |
| DELETE | `/api/services/:id` | services | `ServiceController.remove` | `ServiceService.getProfileIdByUser`, `ServiceService.remove` | Bearer | `PROFESSIONAL` | Propietario validado por `profileId` | `Service`, `Appointment` | Confirmado |

### Catalog: specialties

| Método | Ruta completa | Módulo actual | Controller | Service | Auth | Roles | Ownership | Modelo principal | Estado |
|---|---|---|---|---|---|---|---|---|---|
| GET | `/api/specialties/` | specialty | `SpecialtyController.list` | `SpecialtyService.list` | Público | — | No aplica | `Specialty` | Riesgo |
| GET | `/api/specialties/professional/:profileId` | specialty | `SpecialtyController.listByProfessional` | `SpecialtyService.listByProfessional` | Público | — | No aplica | `ProfessionalSpecialty`, `Specialty` | Riesgo |
| GET | `/api/specialties/soft-deleted` | specialty | `SpecialtyController.list_soft_delete` | `SpecialtyService.list_soft_delete` | Bearer | `ADMIN` | No aplica | `Specialty` | Confirmado |
| POST | `/api/specialties/` | specialty | `SpecialtyController.create` | `SpecialtyService.create` | Bearer | `ADMIN` | No tenant actual | `Specialty` | Riesgo |
| PATCH | `/api/specialties/:id` | specialty | `SpecialtyController.update` | `SpecialtyService.update` | Bearer | `ADMIN` | ID global | `Specialty` | Riesgo |
| PATCH | `/api/specialties/:id/restore` | specialty | `SpecialtyController.restore` | `SpecialtyService.restore` | Bearer | `ADMIN` | ID global | `Specialty` | Riesgo |
| DELETE | `/api/specialties/:id` | specialty | `SpecialtyController.remove` | `SpecialtyService.remove` | Bearer | `ADMIN` | ID global | `Specialty` | Riesgo |

### Scheduling

| Método | Ruta completa | Módulo actual | Controller | Service | Auth | Roles | Ownership | Modelo principal | Estado |
|---|---|---|---|---|---|---|---|---|---|
| GET | `/api/schedules/professional/:profileId` | schedule | `ScheduleController.listByProfessional` | `ScheduleService.findByProfessional` | Público | — | No aplica | `Schedule`, `ProfessionalProfile` | Riesgo |
| POST | `/api/schedules/` | schedule | `ScheduleController.create` | `ScheduleService.create` | Bearer | `PROFESSIONAL` | Perfil derivado de usuario | `Schedule` | Confirmado |
| PUT | `/api/schedules/:id` | schedule | `ScheduleController.update` | `ScheduleService.update` | Bearer | `PROFESSIONAL` | Propietario validado por `profileId` | `Schedule`, `Appointment` | Confirmado |
| DELETE | `/api/schedules/:id` | schedule | `ScheduleController.remove` | `ScheduleService.remove` | Bearer | `PROFESSIONAL` | Propietario validado por `profileId` | `Schedule`, `Appointment` | Confirmado |

### Appointments

| Método | Ruta completa | Módulo actual | Controller | Service | Auth | Roles | Ownership | Modelo principal | Estado |
|---|---|---|---|---|---|---|---|---|---|
| POST | `/api/appointments/create` | appointments | `AppointmentsController.create` | `AppointmentService.create` | Bearer | Todos autenticados en router | Cliente derivado de usuario | `Appointment`, `ClientProfile`, `Service` | Confirmado |
| GET | `/api/appointments/history` | appointments | `AppointmentsController.history` | `AppointmentService.getAppointmentsByUser` | Bearer | Todos autenticados | Usuario actual en query | `Appointment` | Pendiente de revisar |
| GET | `/api/appointments/upcoming` | appointments | `AppointmentsController.upcoming` | `AppointmentService.getUpcomingAppointmentsByUser` | Bearer | Todos autenticados | Usuario actual en query | `Appointment` | Pendiente de revisar |
| PATCH | `/api/appointments/:id/status` | appointments | `AppointmentsController.updateStatus` | `AppointmentService.updateStatusByProfessional` | Bearer | `PROFESSIONAL` | Profesional validado por perfil | `Appointment`, `ProfessionalProfile` | Confirmado |
| POST | `/api/appointments/create-guest` | appointments | `AppointmentsController.createGuest` | `AppointmentService.createGuest` | Público | — | Profesional recibido en body; no autenticado | `Appointment`, `GuestClient`, `Service` | Riesgo |
| GET | `/api/appointments/availability` | appointments | `AppointmentsController.availability` | `AppointmentService.getAvailability` | Público | — | IDs recibidos por query | `Schedule`, `Appointment`, `Service` | Riesgo |

Observaciones:

- `AppointmentsController.create` accede directamente a Prisma para resolver `ClientProfile`.
- `create-guest` permite reservar sin autenticación y recibe el profesional desde el body; requiere una decisión explícita de seguridad y tenancy.
- La disponibilidad consulta datos relacionados con scheduling, pero actualmente vive en `appointments`.

### Notifications

| Método | Ruta completa | Módulo actual | Controller | Service | Auth | Roles | Ownership | Modelo principal | Estado |
|---|---|---|---|---|---|---|---|---|---|
| GET | `/api/notifications/` | notifications | `NotificationController.getNotifications` | `NotificationService.getUserNotifications` | Bearer | Todos autenticados | Usuario actual | `Notification`, `User` | Confirmado |
| PUT | `/api/notifications/:id/read` | notifications | `NotificationController.markAsRead` | `NotificationService.markAsRead` | Bearer | Todos autenticados | ID de notificación no verificado en controller/service observado | `Notification` | Riesgo |
| PUT | `/api/notifications/read-all` | notifications | `NotificationController.markAllAsRead` | `NotificationService.markAllAsRead` | Bearer | Todos autenticados | Usuario actual | `Notification` | Confirmado |

### Reviews

| Método | Ruta completa | Módulo actual | Controller | Service | Auth | Roles | Ownership | Modelo principal | Estado |
|---|---|---|---|---|---|---|---|---|---|
| POST | `/api/reviews/` | reviews | `ReviewsController.create` | `ReviewsService.create` | Bearer | `CLIENT` | Cita comparada con perfil cliente | `Review`, `Appointment` | Confirmado |
| GET | `/api/reviews/professional/:professionalProfileId` | reviews | `ReviewsController.getProfessionalReviews` | `ReviewsService.getProfessionalReviews` | Bearer | Todos autenticados | ID público; tenant no verificado | `Review`, `Appointment` | Riesgo |
| GET | `/api/reviews/appointment/:appointmentId` | reviews | `ReviewsController.getByAppointment` | `ReviewsService.getByAppointment` | Bearer | Todos autenticados | Cita no verificada en controller | `Review`, `Appointment` | Riesgo |
| POST | `/api/reviews/batch/by-appointments` | reviews | `ReviewsController.getByAppointments` | `ReviewsService.getByAppointments` | Bearer | Todos autenticados | IDs recibidos en body; no verificado | `Review`, `Appointment` | Riesgo |

## Módulos actuales identificados

Módulos montados como API:

```text
admin
appointments
auth
config
notifications
reviews
schedule
services
specialty
users
users/professionalprofile
```

Submódulos o componentes funcionales adicionales:

```text
specialty/ProfessionalSpecialty
users/clientprofile
users/adminprofile
users/professionalprofile
```

Componentes transversales:

```text
core/prisma
core/errors
core/storage
core/server
middlewares/auth.middleware
middlewares/role.middleware
seed
```

## Relaciones de persistencia y dependencias aparentes

### Relaciones de persistencia observadas

| Modelo principal | Relaciones persistentes relevantes |
|---|---|
| `User` | perfiles, tokens, verificaciones, notificaciones, configuración |
| `ProfessionalProfile` | `User`, especialidades, servicios, horarios, certificados, enlaces, citas |
| `ClientProfile` | `User`, citas |
| `Service` | profesional, especialidad, citas |
| `Schedule` | profesional |
| `Appointment` | cliente, invitado, servicio, profesional, reseña, notificaciones |
| `Review` | cita |
| `Notification` | usuario, cita |

### Dependencias de dominio aparentes

Estas no se deducen únicamente de los `include` de Prisma:

| Contexto actual | Dependencia aparente | Evidencia |
|---|---|---|
| appointments | catálogo | debe validar que el servicio pertenece al profesional y está activo |
| appointments | scheduling | debe validar horario, disponibilidad y solapamiento |
| appointments | notifications | dispara notificaciones al crear o cambiar estado |
| reviews | appointments | solo permite reseñar una cita completada del cliente |
| profiles | notifications | notifica cambios de estado profesional |
| catalog | profiles | valida especialidad aprobada del profesional |
| specialty | profiles | administra relación profesional-especialidad |

Un `include` de Prisma representa una relación de persistencia. No prueba que el módulo deba importar el repositorio interno del otro contexto.

## Acceso directo a Prisma observado en el flujo de endpoints

| Archivo | Clase/método | Modelo | Operación | Contexto aparente |
|---|---|---|---|---|
| `modules/appointments/appointments.controller.ts` | `AppointmentsController.create` | `ClientProfile` | `findUnique` por `userId` | appointments/users |
| `modules/schedule/schedule.controller.ts` | `ScheduleController.create` | `ProfessionalProfile` | `findUnique` por `userId` | schedule/profiles |
| `modules/schedule/schedule.controller.ts` | `ScheduleController.update` | `ProfessionalProfile` | `findUnique` por `userId` | schedule/profiles |
| `modules/schedule/schedule.controller.ts` | `ScheduleController.remove` | `ProfessionalProfile` | `findUnique` por `userId` | schedule/profiles |
| `modules/specialty/ProfessionalSpecialty/professionalSpecialty.controller.ts` | `requestSpecialty` | `ProfessionalProfile` | `findUnique` por `userId` | specialty/profiles |
| `modules/auth/auth.service.ts` | `register` | `User`, perfiles, `CustomConfig`, `VerificationAttempt` | creación transaccional | auth/profiles/preferences |
| `modules/auth/auth.service.ts` | `login` | `User`, `RefreshToken` | `findUnique`, `create` | auth/identity |
| `modules/auth/auth.service.ts` | `verifyByToken` | `VerificationAttempt`, `User`, `RefreshToken` | lectura y actualización | auth/identity |
| `modules/auth/auth.service.ts` | `refresh` | `RefreshToken`, `User` | lectura, revocación y creación | auth/identity |
| `modules/users/users.service.ts` | `me`, `changeEmail`, `changePassword` | `User`, `RefreshToken` | lectura y actualización | users/identity |
| `modules/users/users.service.ts` | `me` | `CustomConfig` vía `ConfigService` | lectura | config/preferences |
| `modules/config/config.service.ts` | `getByUser`, `update` | `CustomConfig` | lectura y actualización | config/preferences |
| `modules/services/service.service.ts` | varios | `Service`, `ProfessionalSpecialty`, `ProfessionalProfile`, `Appointment` | lectura, creación y actualización | services/catalog |
| `modules/schedule/schedule.service.ts` | varios | `Schedule`, `Appointment` | lectura, creación y actualización | schedule |
| `modules/specialty/specialty.service.ts` | varios | `Specialty`, `ProfessionalSpecialty` | lectura y soft delete | specialty/catalog |
| `modules/specialty/ProfessionalSpecialty/ProfessionalSpecialty.Service.ts` | varios | `ProfessionalSpecialty`, `Specialty`, `ProfessionalProfile` | transacciones y actualización | specialty/profiles |
| `modules/appointments/appointments.service.ts` | varios | `Appointment`, `Service`, `Schedule`, perfiles, invitado | lectura, creación y actualización | appointments |
| `modules/notifications/notifications.service.ts` | varios | `Notification` | creación, lectura y actualización | notifications |
| `modules/reviews/reviews.service.ts` | varios | `Review`, `Appointment`, `ClientProfile`, `ProfessionalProfile` | lectura, creación y agregación | reviews/appointments/profiles |
| `modules/users/professionalprofile/professionalprofile.service.ts` | varios | `ProfessionalProfile`, especialidades, certificados, enlaces | lectura, creación y actualización | profiles |
| `modules/admin/admin.controller.ts` | varios indirectamente | perfiles | lectura y actualización vía service | admin/profiles |

Este inventario confirma que todavía no existe una capa de repositorios. El acceso a Prisma está repartido entre controllers y services.

## Usos de `any` observados en el alcance

| Archivo | Contexto | Contrato representado | Relevancia |
|---|---|---|---|
| `src/middlewares/auth.middleware.ts` | asignación de `req.user.role` | conversión del claim JWT a rol | El token se valida mediante cast y no mediante un schema/guard tipado |
| `src/modules/users/users.service.ts` | `profileServiceMap: Record<Role, any>` | servicios de perfil por rol | Oculta un contrato común inexistente entre perfiles |
| `src/modules/appointments/appointments.service.ts` | filtros `const where: any = {}` | filtros dinámicos de citas | Oculta la forma real del query y dificulta aplicar tenant filtering |
| `src/modules/specialty/ProfessionalSpecialty/professionalSpecialty.controller.ts` | `catch (error: any)` | error HTTP no tipado | Evita distinguir errores de dominio, validación e infraestructura |
| `src/modules/specialty/ProfessionalSpecialty/professionalSpecialty.controller.ts` | segundo `catch (error: any)` | error HTTP no tipado | Duplica el problema en otro caso de uso |

Este listado es preliminar y debe ampliarse en el bloque específico de tipos.

## Side effects observados

| Side effect | Desde dónde se dispara | Mecanismo actual |
|---|---|---|
| Email de verificación | `AuthService.register` | `sendVerificationEmail` después de transacción |
| Email de reset | `AuthService.forgotPassword` | mail service de auth |
| Notificación de bienvenida | `AuthService.register` | `NotificationService.notifyWelcome` |
| Notificación de cita creada | `AppointmentService.create` | `NotificationService.notifyAppointmentCreated` |
| Notificación de cambio de cita | `AppointmentService.updateStatusByProfessional` | métodos de `NotificationService` |
| Notificación de perfil | `ProfessionalProfileService.setProfileStatus` | `NotificationService.notifyProfile*` |
| Notificación de especialidad | `ProfessionalSpecialtyService` | `NotificationService.notifySpecialty*` |
| Notificación de reseña | `ReviewsService.create` | `NotificationService.notifyReview` |
| Escritura de avatar | `UsersController` + `multer` | filesystem en `public/img/avatars` |
| Escritura de certificado | `ProfessionalProfileController` + `multer` | filesystem en `public/certificates` |
| Worker/cron de citas | `core/server/index.ts` importa `appointment.worker` | proceso importado al iniciar servidor |

Observación: varios side effects se disparan después de una operación de persistencia, pero todavía no existe outbox ni una política uniforme de reintentos/fallo.

## Roles y autorización observados

### Roles declarados

El esquema Prisma define:

```text
ADMIN
PROFESSIONAL
CLIENT
```

### Mecanismos actuales

Hay dos funciones de autorización:

- `authorizeRole(...allowedRoles: string[])` en `auth.middleware.ts`;
- `requireRole(...roles: Role[])` en `role.middleware.ts`.

Ambas dependen de `req.user.role`, pero no incorporan tenant, membership, permisos granulares ni ownership centralizado.

### Significado actual de `ADMIN`

No está definido si `ADMIN` representa:

1. operador global de la plataforma SaaS;
2. administrador de un consultorio/tenant;
3. ambos conceptos con el mismo rol.

El comportamiento actual parece global: administra especialidades y perfiles sin `tenantId`.

## Express Request

Se encontraron dos declaraciones globales equivalentes:

- `src/types/express.d.ts`;
- `src/middlewares/types/express.d.ts`.

Ambas agregan:

```ts
Express.User {
  id: number;
  role: Role;
}
```

y:

```ts
Express.Request {
  user?: User;
}
```

No se observó una segunda fuente de datos distinta para `req.user`, pero sí una duplicación de la declaración. El JWT usa un `JwtPayload` local con `userId` y `role`; después el middleware lo traduce a `req.user`.

## Hallazgos preliminares del inventario

### Dependencias entre módulos

- controllers acceden directamente a Prisma en appointments, schedule y professional specialty;
- services importan directamente `NotificationService`;
- profiles, specialty, catalog y appointments comparten modelos sin ports;
- `admin` opera sobre perfiles y especialidades de otros módulos;
- `users` combina identidad, perfiles, configuración y storage.

### Endpoints públicos

Los endpoints públicos identificados son:

- auth completo;
- listado y consulta pública de profesionales;
- listado de servicios por profesional;
- listado de horarios por profesional;
- listado de especialidades;
- especialidades por profesional;
- creación de citas guest;
- disponibilidad.

Estos endpoints deben clasificarse durante el bloque de tenancy como catálogo global, descubrimiento público tenant-aware o flujo público con tenant explícito.

### Endpoints con autorización por rol

- `ADMIN`: administración, soft-deleted specialties, CRUD de specialties, estados de specialty/profile;
- `PROFESSIONAL`: creación/actualización/eliminación de services y schedules, cambio de estado de cita, solicitud de specialty;
- `CLIENT`: creación de review.

### Endpoints con ownership manual

- servicios: filtran por `profileId` derivado del usuario;
- horarios: filtran por `profileId` derivado del usuario;
- citas: validan perfil profesional o perfil cliente en varios flujos;
- reviews: validan la cita contra el perfil cliente en creación;
- perfiles, enlaces y certificados: requieren revisión específica de sus métodos.

### Endpoints con riesgo de ownership o IDOR

- `PUT /api/notifications/:id/read`: el service actualiza por `id` sin recibir `userId`;
- `GET /api/reviews/appointment/:appointmentId`: recibe ID de cita y no se observa ownership;
- `POST /api/reviews/batch/by-appointments`: recibe una lista de IDs y no se observa ownership;
- `GET /api/reviews/professional/:professionalProfileId`: acceso autenticado sin contexto tenant;
- rutas administrativas por `profileId` y `professionalId`: no tienen tenant ni membership;
- `POST /api/appointments/create-guest`: permite crear citas sin autenticación;
- `GET /api/appointments/availability`: usa IDs públicos sin contexto tenant;
- listados públicos por `profileId` podrían cruzar datos cuando exista más de un tenant.

La severidad definitiva de cada caso requiere revisar pruebas y comportamiento de producción, pero son candidatos P0/P1 para el bloque de seguridad/tenancy.

## Riesgos clasificados para la Fase 0

### P0

No se marca todavía un P0 confirmado únicamente con el inventario. Sin embargo, una fuga efectiva de datos entre tenants cuando se implemente multi-tenant sería P0.

### P1

- ausencia de tenant y membership en todos los endpoints;
- `NotificationService.markAsRead` no recibe el usuario actual;
- endpoints con IDs de recursos sin ownership observable;
- citas guest y disponibilidad sin contexto tenant;
- autorización basada en rol global;
- concurrencia de reservas requiere una estrategia explícita;
- duplicación de rutas de especialidad y router no montado.

P1 porque puede producir acceso indebido, inconsistencias o una migración SaaS insegura.

### P2

- acceso directo a Prisma desde controllers;
- services que mezclan persistencia, reglas y side effects;
- duplicación de tipos Express;
- dos middlewares de rol con contratos distintos;
- `any` en mapas, filtros y errores;
- controllers administrativos con manejo de errores diferente;
- rutas y nombres inconsistentes como `/Allprofiles`.

P2 porque dificulta el refactor, las pruebas y la evolución, pero no prueba por sí solo una vulnerabilidad explotable.

### P3

- comentarios y formato inconsistentes;
- nombres de archivos con casing distinto (`service` / `services`, `type` / `types`, `ProfessionalSpecialty.Service.ts`);
- comentarios temporales y logs de depuración;
- documentación inline incompleta.

## Decisiones pendientes

Antes de Fase 3 deben resolverse:

1. ¿`ADMIN` es operador global, administrador de tenant o ambos con roles distintos?
2. ¿`Specialty` es catálogo global o cada tenant puede crear especialidades?
3. ¿`Service`, `Schedule`, `ProfessionalProfile`, `Appointment`, `Review` y `Notification` serán tenant-owned?
4. ¿Los perfiles profesionales pueden pertenecer a más de un tenant?
5. ¿Los usuarios tendrán una membresía por tenant?
6. ¿Los endpoints públicos resolverán tenant por subdominio, slug, header o catálogo global?
7. ¿Las citas guest requieren tenant explícito y token de invitación?
8. ¿Qué contexto será propietario de disponibilidad?
9. ¿Las notificaciones serán persistidas por tenant y entregadas por eventos?
10. ¿El worker se inicia junto al servidor o será un proceso separado?
11. ¿Qué router de ProfessionalSpecialty será la fuente canónica?
12. ¿Se conservarán las rutas actuales por compatibilidad?

## Conclusión del Bloque 1

El backend tiene una API modular por carpetas, pero la superficie HTTP no coincide todavía con bounded contexts estables:

- `users` contiene identidad y perfiles;
- `admin` modifica recursos de otros módulos;
- `appointments` contiene disponibilidad;
- `specialty` tiene un submódulo duplicado y parcialmente no montado;
- controllers y services acceden directamente a Prisma;
- autorización y ownership están distribuidos y no son equivalentes;
- no existe contexto tenant.

Este documento no recomienda todavía mover archivos ni corregir endpoints. Es la base para revisar el Bloque 2 de la Fase 0: inventario de módulos, modelos y responsabilidades.
