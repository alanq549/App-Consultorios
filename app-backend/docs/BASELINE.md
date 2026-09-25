# Baseline del backend â€” Fase 0



## Alcance de este documento



Este baseline registra el estado observado del backend antes de iniciar el refactor arquitectÃ³nico.



Esta versiÃ³n cubre el **Bloque 1 de la Fase 0: inventario de endpoints**. No se modificÃ³ cÃ³digo de `src/`, Prisma ni contratos HTTP.



El **Bloque 2: inventario de mÃ³dulos, modelos y responsabilidades** estÃ¡ documentado en [BASELINE_MODULES.md](BASELINE_MODULES.md).



El **Bloque 3: autenticaciÃ³n, autorizaciÃ³n y ownership** estÃ¡ documentado en [BASELINE_SECURITY.md](BASELINE_SECURITY.md).



El **Bloque 4: DTOs, tipos, interfaces y contratos** estÃ¡ documentado en [BASELINE_CONTRACTS.md](BASELINE_CONTRACTS.md).



El **Bloque 5: Prisma, ownership de modelos y candidatos a bounded contexts** estÃ¡ documentado en [BASELINE_OWNERSHIP.md](BASELINE_OWNERSHIP.md).



El **Bloque 6: consolidaciÃ³n de riesgos, decisiones y arquitectura pendiente** estÃ¡ documentado en [BASELINE_DECISIONS.md](BASELINE_DECISIONS.md).



La trazabilidad utilizada para cada endpoint es:



```text

app.ts

  -> router

    -> controller

      -> service

        -> Prisma / side effects

```



## MÃ©todo de levantamiento



Se revisaron:



- `src/app.ts`;

- todos los archivos `*.routes.ts`;

- controllers de los mÃ³dulos montados;

- middleware de autenticaciÃ³n y roles;

- servicios invocados por los controllers;

- `prisma/schema.prisma` para identificar los modelos principales y sus relaciones.



## Convenciones de lectura



### AutenticaciÃ³n



- `PÃºblico`: no exige `authMiddleware`.

- `Bearer`: usa `authMiddleware`.



### AutorizaciÃ³n



- `ADMIN`, `PROFESSIONAL` o `CLIENT`: middleware de rol explÃ­cito.

- `Todos autenticados`: tiene autenticaciÃ³n, pero no restricciÃ³n de rol en router.

- `Manual`: la autorizaciÃ³n se intenta dentro del controller/service.

- `No identificada`: no existe evidencia suficiente en el flujo revisado.



### Ownership



- `Usuario actual`: el recurso se deriva de `req.user.id`.

- `Propietario validado`: el service compara el recurso con el perfil del usuario.

- `Ownership manual`: existe una comprobaciÃ³n dentro de service/controller, no un guard central.

- `No verificado`: el endpoint recibe un ID y no se observÃ³ comprobaciÃ³n suficiente del usuario propietario.

- `No aplica`: endpoint pÃºblico o acciÃ³n global.

- `Tenant pendiente`: no existe aislamiento por tenant actualmente.



## ComposiciÃ³n de rutas



Los prefijos se registran en [src/app.ts](../src/app.ts):



| Prefijo | Router | MÃ³dulo actual |

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



Por tanto, sus rutas no deben contarse como endpoints activos independientes. Algunas operaciones equivalentes sÃ­ estÃ¡n expuestas mediante:



- [professionalprofile.routes.ts](../src/modules/users/professionalprofile/professionalprofile.routes.ts);

- [admin.routes.ts](../src/modules/admin/admin.routes.ts).



Esto representa duplicaciÃ³n de superficie declarada y debe resolverse en una decisiÃ³n posterior, no durante este baseline.



### Estado sistemÃ¡tico de exposiciÃ³n de rutas



Las columnas `Estado de exposiciÃ³n` y `Estado del anÃ¡lisis` distinguen claramente el montaje real de la ruta del resultado del levantamiento. Para este cierre se normaliza el significado de exposiciÃ³n de la siguiente manera:



| Estado canÃ³nico | Significado |

|---|---|

| `ACTIVE` | La ruta estÃ¡ montada desde `app.ts` y puede alcanzarse por el prefijo documentado. Las filas `Confirmado` corresponden a este estado. |

| `DECLARED_NOT_MOUNTED` | La ruta estÃ¡ declarada en un router, pero ese router no estÃ¡ montado directamente en `app.ts`. Aplica a `professionalSpecialty.routes.ts`. |

| `DUPLICATED` | La misma operaciÃ³n o superficie estÃ¡ declarada en mÃ¡s de un router montado. Se documenta cuando existe evidencia de equivalencia; no implica necesariamente que las URLs sean idÃ©nticas. |

| `UNREACHABLE` | La ruta estÃ¡ declarada, pero no existe una cadena de montaje alcanzable desde `app.ts`. No se identificÃ³ una ruta adicional con este estado en el inventario revisado. |



El valor `Estado del anÃ¡lisis` puede ser `Confirmado`, `Pendiente de revisar`, `No activo` o `Riesgo`; ese campo describe el estado de verificaciÃ³n de la ruta, no el montaje real. La clasificaciÃ³n de exposiciÃ³n no cambia ninguna ruta.



## Inventario de endpoints activos



### Identity / auth



| MÃ©todo | Ruta completa | MÃ³dulo actual | Controller | Service | Auth | Roles | Ownership | Modelo principal | Estado de exposiciÃ³n | Estado del anÃ¡lisis |

|---|---|---|---|---|---|---|---|---|---|---|

| POST | `/api/auth/register` | auth | `AuthController.register` | `AuthService.register` | PÃºblico | â€” | No aplica | `User` | ACTIVE | Confirmado |

| POST | `/api/auth/login` | auth | `AuthController.login` | `AuthService.login` | PÃºblico | â€” | No aplica | `User`, `RefreshToken` | ACTIVE | Confirmado |

| GET | `/api/auth/verify` | auth | `AuthController.verifyByToken` | `AuthService.verifyByToken` | PÃºblico | â€” | Token de verificaciÃ³n | `VerificationAttempt`, `User`, `RefreshToken` | ACTIVE | Confirmado |

| POST | `/api/auth/refresh` | auth | `AuthController.refresh` | `AuthService.refresh` | PÃºblico | â€” | Refresh token | `RefreshToken`, `User` | ACTIVE | Confirmado |

| POST | `/api/auth/forgot-password` | auth | `AuthController.forgotPassword` | `AuthService.forgotPassword` | PÃºblico | â€” | Correo/token | `PasswordReset`, `User` | ACTIVE | Confirmado |

| POST | `/api/auth/reset-password` | auth | `AuthController.resetPassword` | `AuthService.resetPassword` | PÃºblico | â€” | Token de reset | `PasswordReset`, `User`, `RefreshToken` | ACTIVE | Confirmado |



Observaciones:



- El JWT actual contiene `userId` y `role`; no contiene `tenantId`.

- El registro crea ademÃ¡s perfil, configuraciÃ³n y token de verificaciÃ³n.

- Login, verificaciÃ³n y refresh crean o rotan sesiones.



### Users y perfiles



| MÃ©todo | Ruta completa | MÃ³dulo actual | Controller | Service | Auth | Roles | Ownership | Modelo principal | Estado de exposici?n | Estado del an?lisis |

|---|---|---|---|---|---|---|---|---|---|

| GET | `/api/users/me` | users | `UsersController.me` | `UsersService.me` | Bearer | Todos autenticados | Usuario actual | `User`, perfil, `CustomConfig` | ACTIVE | Confirmado |

| PATCH | `/api/users/profile` | users | `UsersController.updateProfile` | `UsersService.updateProfile` y servicio de perfil por rol | Bearer | SegÃºn `req.user.role` | Usuario actual | `ClientProfile` o `ProfessionalProfile` | ACTIVE | Confirmado |

| PATCH | `/api/users/email` | users | `UsersController.changeEmail` | `UsersService.changeEmail` | Bearer | Todos autenticados | Usuario actual | `User` | ACTIVE | Confirmado |

| PATCH | `/api/users/password` | users | `UsersController.changePassword` | `UsersService.changePassword` | Bearer | Todos autenticados | Usuario actual | `User`, `RefreshToken` | ACTIVE | Confirmado |

| PATCH | `/api/users/avatar` | users | `UsersController.updateAvatar` | `UsersService.updateAvatar` y servicio de perfil | Bearer + multer | Todos autenticados | Usuario actual | `ClientProfile`, `ProfessionalProfile` | ACTIVE | Confirmado |



Observaciones:



- `UsersController` decide el schema segÃºn el rol.

- El avatar se guarda en filesystem mediante `multer` y posteriormente se elimina el archivo anterior desde `UsersService`.

- El endpoint no tiene todavÃ­a una nociÃ³n de tenant en la ruta, token o almacenamiento.



### Professional profiles



| MÃ©todo | Ruta completa | MÃ³dulo actual | Controller | Service | Auth | Roles | Ownership | Modelo principal | Estado de exposici?n | Estado del an?lisis |

|---|---|---|---|---|---|---|---|---|---|

| GET | `/api/professionals/Allprofiles` | users/professionalprofile | `ProfessionalProfileController.getAllPublic` | `ProfessionalProfileService.getAllPublic` | PÃºblico | â€” | No aplica | `ProfessionalProfile` | ACTIVE | Confirmado |

| GET | `/api/professionals/:id` | users/professionalprofile | `ProfessionalProfileController.getPublic` | `ProfessionalProfileService.getPublicById` | PÃºblico | â€” | No aplica | `ProfessionalProfile` | ACTIVE | Confirmado |

| POST | `/api/professionals/social-links` | users/professionalprofile | `ProfessionalProfileController.createSocialLink` | `ProfessionalProfileService.createSocialLink` | Bearer | Todos autenticados en router | Ownership manual probable | `SocialLink`, `ProfessionalProfile` | ACTIVE | Pendiente de revisar |

| PATCH | `/api/professionals/social-links/:id` | users/professionalprofile | `ProfessionalProfileController.updateSocialLink` | `ProfessionalProfileService.updateSocialLink` | Bearer | Todos autenticados en router | Ownership manual probable | `SocialLink`, `ProfessionalProfile` | ACTIVE | Pendiente de revisar |

| DELETE | `/api/professionals/social-links/:id` | users/professionalprofile | `ProfessionalProfileController.deleteSocialLink` | `ProfessionalProfileService.deleteSocialLink` | Bearer | Todos autenticados en router | Ownership manual probable | `SocialLink`, `ProfessionalProfile` | ACTIVE | Pendiente de revisar |

| POST | `/api/professionals/certificates` | users/professionalprofile | `ProfessionalProfileController.uploadCertificate` | `ProfessionalProfileService.createCertificate` | Bearer + multer | Todos autenticados en router | Ownership manual probable | `Certificate`, `ProfessionalProfile` | ACTIVE | Riesgo |

| DELETE | `/api/professionals/certificates/:id` | users/professionalprofile | `ProfessionalProfileController.deleteCertificate` | `ProfessionalProfileService.deleteCertificate` | Bearer | Todos autenticados en router | Ownership manual probable | `Certificate`, `ProfessionalProfile` | ACTIVE | Pendiente de revisar |

| PATCH | `/api/professionals/:professionalId/specialties/:specialtyId/status` | users/professionalprofile / specialty | `ProfessionalSpecialtyController.setStatus` | `ProfessionalSpecialtyService.setSpecialtyStatus` | Bearer | `ADMIN` | IDs recibidos; tenant no verificado | `ProfessionalSpecialty`, `ProfessionalProfile` | ACTIVE | Riesgo |

| POST | `/api/professionals/specialties/:specialtyId` | users/professionalprofile / specialty | `ProfessionalSpecialtyController.requestSpecialty` | `ProfessionalSpecialtyService.requestSpecialty` | Bearer | `PROFESSIONAL` | Profesional derivado de usuario | `ProfessionalSpecialty`, `Specialty` | ACTIVE | Confirmado |



Observaciones:



- La ruta `/api/professionals/:professionalId/specialties/:specialtyId/status` duplica conceptualmente una ruta administrativa.

- `ProfessionalProfileController.uploadCertificate` no declara `requireRole("PROFESSIONAL")`; la autorizaciÃ³n real depende del service.

- Las rutas pÃºblicas exponen datos de perfiles y deben clasificarse posteriormente como catÃ¡logo global o tenant-owned.



### Administration



El router aplica a todas sus rutas:



```text

authMiddleware + authorizeRole("ADMIN")

```



| MÃ©todo | Ruta completa | MÃ³dulo actual | Controller | Service | Auth | Roles | Ownership | Modelo principal | Estado de exposici?n | Estado del an?lisis |

|---|---|---|---|---|---|---|---|---|---|

| PATCH | `/api/admin/profiles/:profileId/review` | admin | `AdminController.reviewProfessionalProfile` | `ProfessionalProfileService.reviewProfile` | Bearer | `ADMIN` | AcciÃ³n administrativa sobre perfil | `ProfessionalProfile` | ACTIVE | Confirmado |

| GET | `/api/admin/professionals` | admin | `AdminController.getAllProfiles` | `ProfessionalProfileService.getAllProfiles` | Bearer | `ADMIN` | No aplica, listado global actual | `ProfessionalProfile` | ACTIVE | Riesgo |

| GET | `/api/admin/profiles/pending` | admin | `AdminController.getPendingProfiles` | `ProfessionalProfileService.getPendingProfiles` | Bearer | `ADMIN` | No aplica, listado global actual | `ProfessionalProfile` | ACTIVE | Riesgo |

| PATCH | `/api/admin/profiles/:profileId/status` | admin | `AdminController.setProfileStatus` | `ProfessionalProfileService.setProfileStatus` | Bearer | `ADMIN` | ID de perfil; tenant no verificado | `ProfessionalProfile` | ACTIVE | Riesgo |

| PATCH | `/api/admin/:professionalId/specialties/:specialtyId/status` | admin | `ProfessionalSpecialtyController.setStatus` | `ProfessionalSpecialtyService.setSpecialtyStatus` | Bearer | `ADMIN` | IDs recibidos; tenant no verificado | `ProfessionalSpecialty`, `ProfessionalProfile` | ACTIVE | Riesgo |



Observaciones:



- El significado de `ADMIN` no estÃ¡ definido: puede ser operador global de la plataforma o administrador de un consultorio.

- Actualmente cualquier `ADMIN` autenticado parece poder revisar perfiles y especialidades sin un tenant o membership.

- Los controllers administrativos manejan errores directamente con `500`, a diferencia de otros mÃ³dulos que delegan al error handler.



### Catalog: services



| MÃ©todo | Ruta completa | MÃ³dulo actual | Controller | Service | Auth | Roles | Ownership | Modelo principal | Estado de exposici?n | Estado del an?lisis |

|---|---|---|---|---|---|---|---|---|---|

| GET | `/api/services/professional/:profileId` | services | `ServiceController.listByProfessional` | `ServiceService.findByProfessional` | PÃºblico | â€” | No aplica | `Service`, `ProfessionalProfile` | ACTIVE | Riesgo |

| POST | `/api/services/` | services | `ServiceController.create` | `ServiceService.getProfileIdByUser`, `ServiceService.create` | Bearer | `PROFESSIONAL` | Perfil derivado de usuario | `Service`, `ProfessionalSpecialty` | ACTIVE | Confirmado |

| PATCH | `/api/services/:id` | services | `ServiceController.update` | `ServiceService.getProfileIdByUser`, `ServiceService.update` | Bearer | `PROFESSIONAL` | Propietario validado por `profileId` | `Service` | ACTIVE | Confirmado |

| DELETE | `/api/services/:id` | services | `ServiceController.remove` | `ServiceService.getProfileIdByUser`, `ServiceService.remove` | Bearer | `PROFESSIONAL` | Propietario validado por `profileId` | `Service`, `Appointment` | ACTIVE | Confirmado |



### Catalog: specialties



| MÃ©todo | Ruta completa | MÃ³dulo actual | Controller | Service | Auth | Roles | Ownership | Modelo principal | Estado de exposici?n | Estado del an?lisis |

|---|---|---|---|---|---|---|---|---|---|

| GET | `/api/specialties/` | specialty | `SpecialtyController.list` | `SpecialtyService.list` | PÃºblico | â€” | No aplica | `Specialty` | ACTIVE | Riesgo |

| GET | `/api/specialties/professional/:profileId` | specialty | `SpecialtyController.listByProfessional` | `SpecialtyService.listByProfessional` | PÃºblico | â€” | No aplica | `ProfessionalSpecialty`, `Specialty` | ACTIVE | Riesgo |

| GET | `/api/specialties/soft-deleted` | specialty | `SpecialtyController.list_soft_delete` | `SpecialtyService.list_soft_delete` | Bearer | `ADMIN` | No aplica | `Specialty` | ACTIVE | Confirmado |

| POST | `/api/specialties/` | specialty | `SpecialtyController.create` | `SpecialtyService.create` | Bearer | `ADMIN` | No tenant actual | `Specialty` | ACTIVE | Riesgo |

| PATCH | `/api/specialties/:id` | specialty | `SpecialtyController.update` | `SpecialtyService.update` | Bearer | `ADMIN` | ID global | `Specialty` | ACTIVE | Riesgo |

| PATCH | `/api/specialties/:id/restore` | specialty | `SpecialtyController.restore` | `SpecialtyService.restore` | Bearer | `ADMIN` | ID global | `Specialty` | ACTIVE | Riesgo |

| DELETE | `/api/specialties/:id` | specialty | `SpecialtyController.remove` | `SpecialtyService.remove` | Bearer | `ADMIN` | ID global | `Specialty` | ACTIVE | Riesgo |



### Scheduling



| MÃ©todo | Ruta completa | MÃ³dulo actual | Controller | Service | Auth | Roles | Ownership | Modelo principal | Estado de exposici?n | Estado del an?lisis |

|---|---|---|---|---|---|---|---|---|---|

| GET | `/api/schedules/professional/:profileId` | schedule | `ScheduleController.listByProfessional` | `ScheduleService.findByProfessional` | PÃºblico | â€” | No aplica | `Schedule`, `ProfessionalProfile` | ACTIVE | Riesgo |

| POST | `/api/schedules/` | schedule | `ScheduleController.create` | `ScheduleService.create` | Bearer | `PROFESSIONAL` | Perfil derivado de usuario | `Schedule` | ACTIVE | Confirmado |

| PUT | `/api/schedules/:id` | schedule | `ScheduleController.update` | `ScheduleService.update` | Bearer | `PROFESSIONAL` | Propietario validado por `profileId` | `Schedule`, `Appointment` | ACTIVE | Confirmado |

| DELETE | `/api/schedules/:id` | schedule | `ScheduleController.remove` | `ScheduleService.remove` | Bearer | `PROFESSIONAL` | Propietario validado por `profileId` | `Schedule`, `Appointment` | ACTIVE | Confirmado |



### Appointments



| MÃ©todo | Ruta completa | MÃ³dulo actual | Controller | Service | Auth | Roles | Ownership | Modelo principal | Estado de exposici?n | Estado del an?lisis |

|---|---|---|---|---|---|---|---|---|---|

| POST | `/api/appointments/create` | appointments | `AppointmentsController.create` | `AppointmentService.create` | Bearer | Todos autenticados en router | Cliente derivado de usuario | `Appointment`, `ClientProfile`, `Service` | ACTIVE | Confirmado |

| GET | `/api/appointments/history` | appointments | `AppointmentsController.history` | `AppointmentService.getAppointmentsByUser` | Bearer | Todos autenticados | Usuario actual en query | `Appointment` | ACTIVE | Pendiente de revisar |

| GET | `/api/appointments/upcoming` | appointments | `AppointmentsController.upcoming` | `AppointmentService.getUpcomingAppointmentsByUser` | Bearer | Todos autenticados | Usuario actual en query | `Appointment` | ACTIVE | Pendiente de revisar |

| PATCH | `/api/appointments/:id/status` | appointments | `AppointmentsController.updateStatus` | `AppointmentService.updateStatusByProfessional` | Bearer | `PROFESSIONAL` | Profesional validado por perfil | `Appointment`, `ProfessionalProfile` | ACTIVE | Confirmado |

| POST | `/api/appointments/create-guest` | appointments | `AppointmentsController.createGuest` | `AppointmentService.createGuest` | PÃºblico | â€” | Profesional recibido en body; no autenticado | `Appointment`, `GuestClient`, `Service` | ACTIVE | Riesgo |

| GET | `/api/appointments/availability` | appointments | `AppointmentsController.availability` | `AppointmentService.getAvailability` | PÃºblico | â€” | IDs recibidos por query | `Schedule`, `Appointment`, `Service` | ACTIVE | Riesgo |



Observaciones:



- `AppointmentsController.create` accede directamente a Prisma para resolver `ClientProfile`.

- `create-guest` permite reservar sin autenticaciÃ³n y recibe el profesional desde el body; requiere una decisiÃ³n explÃ­cita de seguridad y tenancy.

- La disponibilidad consulta datos relacionados con scheduling, pero actualmente vive en `appointments`.



### Notifications



| MÃ©todo | Ruta completa | MÃ³dulo actual | Controller | Service | Auth | Roles | Ownership | Modelo principal | Estado de exposici?n | Estado del an?lisis |

|---|---|---|---|---|---|---|---|---|---|

| GET | `/api/notifications/` | notifications | `NotificationController.getNotifications` | `NotificationService.getUserNotifications` | Bearer | Todos autenticados | Usuario actual | `Notification`, `User` | ACTIVE | Confirmado |

| PUT | `/api/notifications/:id/read` | notifications | `NotificationController.markAsRead` | `NotificationService.markAsRead` | Bearer | Todos autenticados | ID de notificaciÃ³n no verificado en controller/service observado | `Notification` | ACTIVE | Riesgo |

| PUT | `/api/notifications/read-all` | notifications | `NotificationController.markAllAsRead` | `NotificationService.markAllAsRead` | Bearer | Todos autenticados | Usuario actual | `Notification` | ACTIVE | Confirmado |



### Reviews



| MÃ©todo | Ruta completa | MÃ³dulo actual | Controller | Service | Auth | Roles | Ownership | Modelo principal | Estado de exposici?n | Estado del an?lisis |

|---|---|---|---|---|---|---|---|---|---|

| POST | `/api/reviews/` | reviews | `ReviewsController.create` | `ReviewsService.create` | Bearer | `CLIENT` | Cita comparada con perfil cliente | `Review`, `Appointment` | ACTIVE | Confirmado |

| GET | `/api/reviews/professional/:professionalProfileId` | reviews | `ReviewsController.getProfessionalReviews` | `ReviewsService.getProfessionalReviews` | Bearer | Todos autenticados | ID pÃºblico; tenant no verificado | `Review`, `Appointment` | ACTIVE | Riesgo |

| GET | `/api/reviews/appointment/:appointmentId` | reviews | `ReviewsController.getByAppointment` | `ReviewsService.getByAppointment` | Bearer | Todos autenticados | Cita no verificada en controller | `Review`, `Appointment` | ACTIVE | Riesgo |

| POST | `/api/reviews/batch/by-appointments` | reviews | `ReviewsController.getByAppointments` | `ReviewsService.getByAppointments` | Bearer | Todos autenticados | IDs recibidos en body; no verificado | `Review`, `Appointment` | ACTIVE | Riesgo |



## MÃ³dulos actuales identificados



MÃ³dulos montados como API:



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



SubmÃ³dulos o componentes funcionales adicionales:



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

| `User` | perfiles, tokens, verificaciones, notificaciones, configuraciÃ³n |

| `ProfessionalProfile` | `User`, especialidades, servicios, horarios, certificados, enlaces, citas |

| `ClientProfile` | `User`, citas |

| `Service` | profesional, especialidad, citas |

| `Schedule` | profesional |

| `Appointment` | cliente, invitado, servicio, profesional, reseÃ±a, notificaciones |

| `Review` | cita |

| `Notification` | usuario, cita |



### Dependencias de dominio aparentes



Estas no se deducen Ãºnicamente de los `include` de Prisma:



| Contexto actual | Dependencia aparente | Evidencia |

|---|---|---|

| appointments | catÃ¡logo | debe validar que el servicio pertenece al profesional y estÃ¡ activo |

| appointments | scheduling | debe validar horario, disponibilidad y solapamiento |

| appointments | notifications | dispara notificaciones al crear o cambiar estado |

| reviews | appointments | solo permite reseÃ±ar una cita completada del cliente |

| profiles | notifications | notifica cambios de estado profesional |

| catalog | profiles | valida especialidad aprobada del profesional |

| specialty | profiles | administra relaciÃ³n profesional-especialidad |



Un `include` de Prisma representa una relaciÃ³n de persistencia. No prueba que el mÃ³dulo deba importar el repositorio interno del otro contexto.



## Acceso directo a Prisma observado en el flujo de endpoints



| Archivo | Clase/mÃ©todo | Modelo | OperaciÃ³n | Contexto aparente |

|---|---|---|---|---|

| `modules/appointments/appointments.controller.ts` | `AppointmentsController.create` | `ClientProfile` | `findUnique` por `userId` | appointments/users |

| `modules/schedule/schedule.controller.ts` | `ScheduleController.create` | `ProfessionalProfile` | `findUnique` por `userId` | schedule/profiles |

| `modules/schedule/schedule.controller.ts` | `ScheduleController.update` | `ProfessionalProfile` | `findUnique` por `userId` | schedule/profiles |

| `modules/schedule/schedule.controller.ts` | `ScheduleController.remove` | `ProfessionalProfile` | `findUnique` por `userId` | schedule/profiles |

| `modules/specialty/ProfessionalSpecialty/professionalSpecialty.controller.ts` | `requestSpecialty` | `ProfessionalProfile` | `findUnique` por `userId` | specialty/profiles |

| `modules/auth/auth.service.ts` | `register` | `User`, perfiles, `CustomConfig`, `VerificationAttempt` | creaciÃ³n transaccional | auth/profiles/preferences |

| `modules/auth/auth.service.ts` | `login` | `User`, `RefreshToken` | `findUnique`, `create` | auth/identity |

| `modules/auth/auth.service.ts` | `verifyByToken` | `VerificationAttempt`, `User`, `RefreshToken` | lectura y actualizaciÃ³n | auth/identity |

| `modules/auth/auth.service.ts` | `refresh` | `RefreshToken`, `User` | lectura, revocaciÃ³n y creaciÃ³n | auth/identity |

| `modules/users/users.service.ts` | `me`, `changeEmail`, `changePassword` | `User`, `RefreshToken` | lectura y actualizaciÃ³n | users/identity |

| `modules/users/users.service.ts` | `me` | `CustomConfig` vÃ­a `ConfigService` | lectura | config/preferences |

| `modules/config/config.service.ts` | `getByUser`, `update` | `CustomConfig` | lectura y actualizaciÃ³n | config/preferences |

| `modules/services/service.service.ts` | varios | `Service`, `ProfessionalSpecialty`, `ProfessionalProfile`, `Appointment` | lectura, creaciÃ³n y actualizaciÃ³n | services/catalog |

| `modules/schedule/schedule.service.ts` | varios | `Schedule`, `Appointment` | lectura, creaciÃ³n y actualizaciÃ³n | schedule |

| `modules/specialty/specialty.service.ts` | varios | `Specialty`, `ProfessionalSpecialty` | lectura y soft delete | specialty/catalog |

| `modules/specialty/ProfessionalSpecialty/ProfessionalSpecialty.Service.ts` | varios | `ProfessionalSpecialty`, `Specialty`, `ProfessionalProfile` | transacciones y actualizaciÃ³n | specialty/profiles |

| `modules/appointments/appointments.service.ts` | varios | `Appointment`, `Service`, `Schedule`, perfiles, invitado | lectura, creaciÃ³n y actualizaciÃ³n | appointments |

| `modules/notifications/notifications.service.ts` | varios | `Notification` | creaciÃ³n, lectura y actualizaciÃ³n | notifications |

| `modules/reviews/reviews.service.ts` | varios | `Review`, `Appointment`, `ClientProfile`, `ProfessionalProfile` | lectura, creaciÃ³n y agregaciÃ³n | reviews/appointments/profiles |

| `modules/users/professionalprofile/professionalprofile.service.ts` | varios | `ProfessionalProfile`, especialidades, certificados, enlaces | lectura, creaciÃ³n y actualizaciÃ³n | profiles |

| `modules/admin/admin.controller.ts` | varios indirectamente | perfiles | lectura y actualizaciÃ³n vÃ­a service | admin/profiles |



Este inventario confirma que todavÃ­a no existe una capa de repositorios. El acceso a Prisma estÃ¡ repartido entre controllers y services.



## Usos de `any` observados en el alcance



| Archivo | Contexto | Contrato representado | Relevancia |

|---|---|---|---|

| `src/middlewares/auth.middleware.ts` | asignaciÃ³n de `req.user.role` | conversiÃ³n del claim JWT a rol | El token se valida mediante cast y no mediante un schema/guard tipado |

| `src/modules/users/users.service.ts` | `profileServiceMap: Record<Role, any>` | servicios de perfil por rol | Oculta un contrato comÃºn inexistente entre perfiles |

| `src/modules/appointments/appointments.service.ts` | filtros `const where: any = {}` | filtros dinÃ¡micos de citas | Oculta la forma real del query y dificulta aplicar tenant filtering |

| `src/modules/specialty/ProfessionalSpecialty/professionalSpecialty.controller.ts` | `catch (error: any)` | error HTTP no tipado | Evita distinguir errores de dominio, validaciÃ³n e infraestructura |

| `src/modules/specialty/ProfessionalSpecialty/professionalSpecialty.controller.ts` | segundo `catch (error: any)` | error HTTP no tipado | Duplica el problema en otro caso de uso |



Este listado es preliminar y debe ampliarse en el bloque especÃ­fico de tipos.



## Side effects observados



| Side effect | Desde dÃ³nde se dispara | Mecanismo actual |

|---|---|---|

| Email de verificaciÃ³n | `AuthService.register` | `sendVerificationEmail` despuÃ©s de transacciÃ³n |

| Email de reset | `AuthService.forgotPassword` | mail service de auth |

| NotificaciÃ³n de bienvenida | `AuthService.register` | `NotificationService.notifyWelcome` |

| NotificaciÃ³n de cita creada | `AppointmentService.create` | `NotificationService.notifyAppointmentCreated` |

| NotificaciÃ³n de cambio de cita | `AppointmentService.updateStatusByProfessional` | mÃ©todos de `NotificationService` |

| NotificaciÃ³n de perfil | `ProfessionalProfileService.setProfileStatus` | `NotificationService.notifyProfile*` |

| NotificaciÃ³n de especialidad | `ProfessionalSpecialtyService` | `NotificationService.notifySpecialty*` |

| NotificaciÃ³n de reseÃ±a | `ReviewsService.create` | `NotificationService.notifyReview` |

| Escritura de avatar | `UsersController` + `multer` | filesystem en `public/img/avatars` |

| Escritura de certificado | `ProfessionalProfileController` + `multer` | filesystem en `public/certificates` |

| Worker/cron de citas | `core/server/index.ts` importa `appointment.worker` | proceso importado al iniciar servidor |



ObservaciÃ³n: varios side effects se disparan despuÃ©s de una operaciÃ³n de persistencia, pero todavÃ­a no existe outbox ni una polÃ­tica uniforme de reintentos/fallo.



## Roles y autorizaciÃ³n observados



### Roles declarados



El esquema Prisma define:



```text

ADMIN

PROFESSIONAL

CLIENT

```



### Mecanismos actuales



Hay dos funciones de autorizaciÃ³n:



- `authorizeRole(...allowedRoles: string[])` en `auth.middleware.ts`;

- `requireRole(...roles: Role[])` en `role.middleware.ts`.



Ambas dependen de `req.user.role`, pero no incorporan tenant, membership, permisos granulares ni ownership centralizado.



### Significado actual de `ADMIN`



No estÃ¡ definido si `ADMIN` representa:



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



No se observÃ³ una segunda fuente de datos distinta para `req.user`, pero sÃ­ una duplicaciÃ³n de la declaraciÃ³n. El JWT usa un `JwtPayload` local con `userId` y `role`; despuÃ©s el middleware lo traduce a `req.user`.



## Hallazgos preliminares del inventario



### Dependencias entre mÃ³dulos



- controllers acceden directamente a Prisma en appointments, schedule y professional specialty;

- services importan directamente `NotificationService`;

- profiles, specialty, catalog y appointments comparten modelos sin ports;

- `admin` opera sobre perfiles y especialidades de otros mÃ³dulos;

- `users` combina identidad, perfiles, configuraciÃ³n y storage.



### Endpoints pÃºblicos



Los endpoints pÃºblicos identificados son:



- auth completo;

- listado y consulta pÃºblica de profesionales;

- listado de servicios por profesional;

- listado de horarios por profesional;

- listado de especialidades;

- especialidades por profesional;

- creaciÃ³n de citas guest;

- disponibilidad.



Estos endpoints deben clasificarse durante el bloque de tenancy como catÃ¡logo global, descubrimiento pÃºblico tenant-aware o flujo pÃºblico con tenant explÃ­cito.



### Endpoints con autorizaciÃ³n por rol



- `ADMIN`: administraciÃ³n, soft-deleted specialties, CRUD de specialties, estados de specialty/profile;

- `PROFESSIONAL`: creaciÃ³n/actualizaciÃ³n/eliminaciÃ³n de services y schedules, cambio de estado de cita, solicitud de specialty;

- `CLIENT`: creaciÃ³n de review.



### Endpoints con ownership manual



- servicios: filtran por `profileId` derivado del usuario;

- horarios: filtran por `profileId` derivado del usuario;

- citas: validan perfil profesional o perfil cliente en varios flujos;

- reviews: validan la cita contra el perfil cliente en creaciÃ³n;

- perfiles, enlaces y certificados: requieren revisiÃ³n especÃ­fica de sus mÃ©todos.



### Endpoints con riesgo de ownership o IDOR



- `PUT /api/notifications/:id/read`: el service actualiza por `id` sin recibir `userId`;

- `GET /api/reviews/appointment/:appointmentId`: recibe ID de cita y no se observa ownership;

- `POST /api/reviews/batch/by-appointments`: recibe una lista de IDs y no se observa ownership;

- `GET /api/reviews/professional/:professionalProfileId`: acceso autenticado sin contexto tenant;

- rutas administrativas por `profileId` y `professionalId`: no tienen tenant ni membership;

- `POST /api/appointments/create-guest`: permite crear citas sin autenticaciÃ³n;

- `GET /api/appointments/availability`: usa IDs pÃºblicos sin contexto tenant;

- listados pÃºblicos por `profileId` podrÃ­an cruzar datos cuando exista mÃ¡s de un tenant.



La severidad definitiva de cada caso requiere revisar pruebas y comportamiento de producciÃ³n, pero son candidatos P0/P1 para el bloque de seguridad/tenancy.



## Riesgos clasificados para la Fase 0



### P0



No se marca todavÃ­a un P0 confirmado Ãºnicamente con el inventario. Sin embargo, una fuga efectiva de datos entre tenants cuando se implemente multi-tenant serÃ­a P0.



### P1



- ausencia de tenant y membership en todos los endpoints;

- `NotificationService.markAsRead` no recibe el usuario actual;

- endpoints con IDs de recursos sin ownership observable;

- citas guest y disponibilidad sin contexto tenant;

- autorizaciÃ³n basada en rol global;

- concurrencia de reservas requiere una estrategia explÃ­cita;

- duplicaciÃ³n de rutas de especialidad y router no montado.



P1 porque puede producir acceso indebido, inconsistencias o una migraciÃ³n SaaS insegura.



### P2



- acceso directo a Prisma desde controllers;

- services que mezclan persistencia, reglas y side effects;

- duplicaciÃ³n de tipos Express;

- dos middlewares de rol con contratos distintos;

- `any` en mapas, filtros y errores;

- controllers administrativos con manejo de errores diferente;

- rutas y nombres inconsistentes como `/Allprofiles`.



P2 porque dificulta el refactor, las pruebas y la evoluciÃ³n, pero no prueba por sÃ­ solo una vulnerabilidad explotable.



### P3



- comentarios y formato inconsistentes;

- nombres de archivos con casing distinto (`service` / `services`, `type` / `types`, `ProfessionalSpecialty.Service.ts`);

- comentarios temporales y logs de depuraciÃ³n;

- documentaciÃ³n inline incompleta.



## Decisiones pendientes



Antes de Fase 3 deben resolverse:



1. Â¿`ADMIN` es operador global, administrador de tenant o ambos con roles distintos?

2. Â¿`Specialty` es catÃ¡logo global o cada tenant puede crear especialidades?

3. Â¿`Service`, `Schedule`, `ProfessionalProfile`, `Appointment`, `Review` y `Notification` serÃ¡n tenant-owned?

4. Â¿Los perfiles profesionales pueden pertenecer a mÃ¡s de un tenant?

5. Â¿Los usuarios tendrÃ¡n una membresÃ­a por tenant?

6. Â¿Los endpoints pÃºblicos resolverÃ¡n tenant por subdominio, slug, header o catÃ¡logo global?

7. Â¿Las citas guest requieren tenant explÃ­cito y token de invitaciÃ³n?

8. Â¿QuÃ© contexto serÃ¡ propietario de disponibilidad?

9. Â¿Las notificaciones serÃ¡n persistidas por tenant y entregadas por eventos?

10. Â¿El worker se inicia junto al servidor o serÃ¡ un proceso separado?

11. Â¿QuÃ© router de ProfessionalSpecialty serÃ¡ la fuente canÃ³nica?

12. Â¿Se conservarÃ¡n las rutas actuales por compatibilidad?



## ConclusiÃ³n del Bloque 1



El backend tiene una API modular por carpetas, pero la superficie HTTP no coincide todavÃ­a con bounded contexts estables:



- `users` contiene identidad y perfiles;

- `admin` modifica recursos de otros mÃ³dulos;

- `appointments` contiene disponibilidad;

- `specialty` tiene un submÃ³dulo duplicado y parcialmente no montado;

- controllers y services acceden directamente a Prisma;

- autorizaciÃ³n y ownership estÃ¡n distribuidos y no son equivalentes;

- no existe contexto tenant.



Este documento no recomienda todavÃ­a mover archivos ni corregir endpoints. Es la base para revisar el Bloque 2 de la Fase 0: inventario de mÃ³dulos, modelos y responsabilidades.
