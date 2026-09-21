# Baseline de ownership de modelos — Fase 0, Bloque 5

## Alcance

Este documento analiza el schema Prisma y su uso real para identificar:

- quién crea, modifica, desactiva o elimina cada modelo;
- invariantes observadas y dónde están implementadas;
- dependencias reales de lectura y escritura;
- participación en transacciones;
- endpoints y módulos que exponen cada concepto;
- propietario conceptual candidato;
- posible bounded context y aggregate boundary;
- dependencias que hoy son relaciones Prisma, pero que podrían requerir ports, read models o eventos;
- decisiones que todavía dependen del negocio.

Este documento **no diseña la arquitectura final**. Un propietario conceptual candidato no equivale todavía a un bounded context aprobado, y una relación Prisma no se interpreta automáticamente como pertenencia al mismo aggregate.

No se modificó `src/`, `prisma/schema.prisma`, rutas ni contratos HTTP.

## Fuentes revisadas

- `prisma/schema.prisma`;
- `src/modules/auth/auth.service.ts`;
- `src/modules/users/**`;
- `src/modules/services/service.service.ts`;
- `src/modules/schedule/schedule.service.ts`;
- `src/modules/specialty/**`;
- `src/modules/appointments/appointments.service.ts`;
- `src/modules/appointments/appointment.worker.ts`;
- `src/modules/reviews/reviews.service.ts`;
- `src/modules/notifications/notifications.service.ts`;
- `src/modules/config/config.service.ts`;
- controllers y routers descritos en [BASELINE.md](BASELINE.md);
- responsabilidades descritas en [BASELINE_MODULES.md](BASELINE_MODULES.md);
- seguridad y ownership observados en [BASELINE_SECURITY.md](BASELINE_SECURITY.md);
- contratos y acoplamiento Prisma descritos en [BASELINE_CONTRACTS.md](BASELINE_CONTRACTS.md).

## Cómo leer este baseline

### Hecho observado

Comportamiento que puede localizarse en el código o en el schema actual.

### Regla/invariante observada

Validación o condición de negocio implementada actualmente. No implica que la regla esté completa ni que esté en el lugar arquitectónico correcto.

### Dependencia real

Consulta, escritura, transacción, side effect o import que conecta módulos en la implementación actual.

### Propietario conceptual candidato

El módulo o contexto que parece tener la autoridad semántica sobre el estado. Es una hipótesis de análisis, no una decisión final.

### Aggregate boundary candidato

Conjunto mínimo que parece necesitar consistencia transaccional inmediata. Una FK o un `include` no bastan para afirmar que dos modelos formen un mismo aggregate.

## Resumen de candidatos

| Concepto | Propietario conceptual candidato | Bounded context candidato | Lectura principal |
|---|---|---|---|
| `User` | Identity | Identity | Cuenta, credenciales y estado de verificación. |
| Tokens y credenciales temporales | Identity | Identity | Seguridad de autenticación y recuperación. |
| Perfiles | Cada perfil/Profiles | Profiles | Datos operativos y públicos del tipo de usuario. |
| `ProfessionalSpecialty` | Profiles/Catalog, pendiente | Profiles o Catalog | Relación con estado y revisión propia. |
| `Specialty` | Catalog | Catalog | Catálogo global o tenant-owned, decisión pendiente. |
| `Service` | Catalog | Catalog | Oferta del profesional, con vínculo a scheduling/appointments. |
| `Schedule` | Scheduling | Scheduling | Reglas de disponibilidad del profesional. |
| `Appointment` | Appointments | Appointments | Reserva, estado y participantes. |
| `GuestClient` | Appointments | Appointments | Identidad mínima de participante no registrado. |
| `Review` | Reviews | Reviews | Reseña posterior a una cita. |
| `Notification` | Notifications | Notifications | Mensaje dirigido a un usuario o evento de negocio. |
| `CustomConfig` | Preferences | Preferences | Preferencias de experiencia del usuario. |

## 1. Identity y autenticación

### `User`

**Hecho observado**

- `User` tiene `email` único, `password`, `role`, `isVerified`, timestamps.
- Tiene relaciones a `VerificationAttempt`, `PasswordReset`, `RefreshToken`, perfiles, `Notification` y `CustomConfig`.
- `AuthService.register` crea el usuario dentro de una transacción.
- `AuthService.login`, `verifyByToken`, `refresh`, `forgotPassword`, `resetPassword` y `resendVerification` lo consultan o modifican.
- `UsersService` consulta y modifica email/password.
- Los perfiles usan `userId` único.
- Los endpoints de auth exponen creación, login, verificación, refresh y recuperación; `/users/me` expone datos agregados del usuario.

**Reglas/invariantes observadas**

- email único por constraint Prisma.
- contraseña almacenada hasheada con bcrypt en registro y cambio/reset.
- `isVerified` bloquea login mientras sea `false`.
- el registro público solo permite `CLIENT` y `PROFESSIONAL` según `RegisterDTO`.
- el JWT contiene `userId` y `role`.

**Dependencias reales**

- En registro se crea junto con `ClientProfile` o `ProfessionalProfile`, `CustomConfig` y `VerificationAttempt`.
- Auth consulta `Specialty` cuando registra a un profesional.
- `UsersService` lo relaciona con el perfil según `Role`.
- `NotificationService` crea notificaciones dirigidas a `userId`.
- El schema coloca `role` dentro de `User`; no existe membership ni tenant.

**Propietario conceptual candidato**

`Identity`.

**Bounded context candidato**

`Identity`, con autenticación y ciclo de credenciales.

**Aggregate boundary candidato**

`User` podría ser el aggregate root de la cuenta de identidad. La creación inicial de un perfil y de preferencias actualmente es transaccional, pero eso no demuestra que perfiles o preferencias pertenezcan al mismo aggregate. Es posible que el registro sea un proceso coordinador entre contextos.

**Dependencias futuras a convertir**

- `User` como referencia externa desde perfiles, notifications y preferences;
- resolución de rol/permisos como contrato de identidad/autorización;
- datos de usuario en respuestas de citas como read model o projection, no necesariamente como navegación directa al aggregate `User`.

**Decisiones pendientes**

- si `role` seguirá siendo atributo global de `User` o será una relación de membership/permissions;
- significado de `ADMIN`;
- si un usuario puede tener varios roles;
- qué datos de `User` pueden ser consumidos por otros contextos;
- cómo se incorporará tenant ownership.

### `VerificationAttempt`

**Hecho observado**

- Tiene `userId`, token hash, expiración, `isUsed` y constraint único `[userId, token]`.
- Auth lo crea durante registro y reenvío de verificación.
- Auth cuenta intentos recientes, invalida intentos no usados y los marca como usados durante verificación.
- Se elimina por cascade al eliminar el `User`; no se observa delete explícito.

**Reglas/invariantes observadas**

- solo se acepta token no usado y no expirado;
- `resendVerification` limita a tres intentos en quince minutos;
- al reenviar, invalida tokens anteriores;
- al verificar, se marca el intento y se actualiza `User.isVerified`.

**Dependencias reales**

- depende de `User`;
- participa en la transacción de registro y en operaciones de verificación;
- el correo de verificación es un side effect posterior a la persistencia.

**Propietario conceptual candidato**

Identity.

**Bounded context candidato**

Identity.

**Aggregate boundary candidato**

Entidad dependiente de la cuenta de identidad. La actualización de `User.isVerified` y la invalidación de tokens forman una operación de seguridad coordinada, aunque actualmente parte de la invalidación ocurre fuera de la misma transacción.

**Dependencias futuras**

- port de envío de correo;
- política de expiración/rate limit;
- evento de cuenta verificada para otros contextos, si el negocio lo requiere.

**Decisiones pendientes**

- retención y limpieza de intentos usados/expirados;
- si la verificación pertenece a Identity o a un subcontexto de Account Security.

### `PasswordReset`

**Hecho observado**

- Tiene token único, usuario, expiración, `isUsed` y cascade hacia `User`.
- Auth lo crea en `forgotPassword`.
- `resetPassword` valida token, actualiza contraseña, marca el reset usado y revoca refresh tokens dentro de una transacción.

**Reglas/invariantes observadas**

- token hash no usado y no expirado;
- contraseña nueva hasheada;
- la operación revoca refresh tokens existentes.

**Dependencias reales**

- depende de `User` y `RefreshToken`;
- el correo de reset se envía desde Auth.

**Propietario conceptual candidato / contexto**

Identity / Account Security.

**Aggregate boundary candidato**

Entidad dependiente del aggregate de identidad; no hay evidencia para tratarla como aggregate independiente.

**Dependencias futuras**

- port de correo;
- port o política de revocación de sesiones.

**Decisiones pendientes**

- invalidación de otros resets al crear uno nuevo;
- auditoría y retención.

### `RefreshToken`

**Hecho observado**

- Tiene token hash único, expiración, `isRevoked` y `userId`.
- Auth lo crea en login, verificación y refresh.
- Auth lo revoca durante rotación, cambio de contraseña y reset.
- Cascadea con `User`.

**Reglas/invariantes observadas**

- solo se acepta token no revocado y no expirado;
- refresh rota el token anterior;
- cambio/reset de contraseña revoca tokens del usuario.

**Propietario conceptual candidato / contexto**

Identity / Session Security.

**Aggregate boundary candidato**

Puede ser entidad dependiente de la sesión/cuenta; la rotación es una operación sobre el token y la cuenta, pero no existe evidencia para definir todavía el límite exacto.

**Decisiones pendientes**

- sesiones por dispositivo;
- revocación selectiva;
- relación futura con membership/tenant.

## 2. Profiles

### `AdminProfile`

**Hecho observado**

- Tiene `userId` único, nombre, apellido y avatar.
- `AdminProfileService` consulta y actualiza el avatar.
- `AuthService.register` no crea perfiles ADMIN porque el registro DTO no acepta ese rol.
- `UsersService` lo selecciona mediante `profileServiceMap`.

**Reglas/invariantes observadas**

- una fila por usuario por `userId` único;
- eliminación por cascade con `User`.

**Dependencias reales**

- dependencia directa de `User`;
- el rol global `ADMIN` habilita operaciones de administración, pero el perfil no contiene alcance organizacional.

**Propietario conceptual candidato**

Profiles o Identity, pendiente del significado de ADMIN.

**Bounded context candidato**

Profiles para datos personales; Authorization/Tenancy para permisos y alcance.

**Aggregate boundary candidato**

Entidad 1:1 dependiente de `User`; no hay evidencia para incluirla dentro del aggregate de identidad a largo plazo.

**Decisiones pendientes**

- si `AdminProfile` seguirá existiendo;
- si ADMIN es operador global o administrador de tenant;
- si el perfil administrativo es un concepto de negocio o solo presentación.

### `ClientProfile`

**Hecho observado**

- Tiene `userId` único, datos básicos y avatar.
- `AuthService.register` lo crea para un registro CLIENT.
- `ClientProfileService` consulta y actualiza el perfil.
- `AppointmentsController` lo consulta directamente para crear una cita.
- Appointments usa `clientProfileId` para asociar citas.
- `ClientProfileMapper` construye la respuesta de `me` con conteo de appointments.

**Reglas/invariantes observadas**

- una fila por usuario;
- la creación parte de una cuenta CLIENT;
- la eliminación de perfil por cascade de `User`;
- el perfil puede tener appointments.

**Dependencias reales**

- depende de `User`;
- Appointments depende de su identificador;
- el conteo de citas se expone en la vista del perfil;
- el historial se consulta mediante `Appointment`.

**Propietario conceptual candidato**

Profiles, con datos de cliente.

**Bounded context candidato**

Profiles o Customer Identity. `Appointments` debe depender conceptualmente de una referencia a cliente, no de toda la entidad de perfil.

**Aggregate boundary candidato**

`ClientProfile` puede ser aggregate root de su información editable, con `User` como referencia de identidad. `Appointment` no debería formar el mismo aggregate solo por la FK.

**Dependencias futuras**

- contrato de identidad del cliente;
- read model de historial/conteo;
- ownership/tenant context para citas.

**Decisiones pendientes**

- si un cliente puede pertenecer a varios tenants;
- si el perfil es global o tenant-owned;
- si el cliente guest puede convertirse en ClientProfile.

### `ProfessionalProfile`

**Hecho observado**

- Tiene `userId` único, datos públicos, `verificationStatus`, `ratingAvg` y `ratingCount`.
- Se crea en registro PROFESSIONAL junto con relación inicial a una specialty.
- `ProfessionalProfileService` consulta, actualiza, lista públicamente y cambia estado.
- Admin consulta perfiles pendientes/totales y modifica su estado.
- Appointments, Service, Schedule, ProfessionalSpecialty, Certificate y SocialLink lo referencian.
- `ReviewsService.updateProfessionalRating` actualiza rating dentro de una transacción con la creación de review.

**Reglas/invariantes observadas**

- por registro profesional se exige `specialtyId` existente;
- estado inicial del perfil: `PENDING`;
- `setProfileStatus` limita transiciones;
- para pasar a `APPROVED` debe existir al menos una especialidad aprobada;
- cambios de estado disparan notificaciones;
- el perfil público filtra especialidades aprobadas;
- `ServiceService` exige especialidad aprobada para crear o cambiar servicio.

**Dependencias reales**

- depende de `User`;
- consulta y actualiza `ProfessionalSpecialty`;
- posee relaciones de persistencia con catálogo, scheduling, appointments, certificados y redes;
- Reviews modifica su rating;
- Notifications recibe su `userId`;
- Admin opera el estado desde otro módulo.

**Propietario conceptual candidato**

Profiles para identidad profesional y ciclo de aprobación. La oferta de servicios y la disponibilidad no deberían considerarse automáticamente parte del mismo aggregate.

**Bounded context candidato**

Profiles/Professional Onboarding. Puede colaborar con Catalog, Scheduling, Appointments y Reviews.

**Aggregate boundary candidato**

El perfil y su estado de aprobación podrían formar un aggregate. `ProfessionalSpecialty` puede estar dentro del mismo boundary si la decisión de aprobación es inseparable; sin embargo, la regla actual también conecta con Catalog y tiene ciclo propio, por lo que esto queda abierto.

**Dependencias futuras**

- port de consulta de especialidades aprobadas;
- contrato de identidad profesional para Catalog/Scheduling/Appointments;
- evento de `ProfessionalApproved`, `ProfessionalSuspended` y cambios de rating;
- read model público.

**Decisiones pendientes**

- si rating pertenece a Profiles o Reviews;
- si aprobación profesional y aprobación de especialidad son un mismo proceso;
- si un profesional pertenece a uno o varios tenants;
- qué campos son públicos.

### `Certificate`

**Hecho observado**

- Tiene `profileId`, nombre, emisor, fecha y `fileUrl`.
- `ProfessionalProfileService` lo crea y elimina, validando que pertenezca al perfil del usuario.
- Se incluye en vistas `me` y públicas.
- Cascadea al eliminar `ProfessionalProfile`.

**Reglas/invariantes observadas**

- ownership por perfil profesional;
- fecha validada por DTO;
- file URL se recibe como parte de la operación después de manejar storage.

**Propietario conceptual candidato / contexto**

Profiles / Professional Credentials.

**Aggregate boundary candidato**

Entidad dependiente del perfil profesional; no hay evidencia de aggregate independiente.

**Dependencias futuras**

- port de storage;
- contrato de publicación de credenciales;
- política de visibilidad pública.

**Decisiones pendientes**

- si un certificado requiere revisión/aprobación;
- si `fileUrl` pertenece a un contexto de media/storage separado.

### `SocialLink`

**Hecho observado**

- Tiene `profileId`, `type`, `url` y unique `[profileId, type]`.
- Se crea, actualiza y elimina desde `ProfessionalProfileService`.
- Las operaciones de actualización/eliminación verifican ownership mediante el perfil del usuario.
- Se expone en `me` y perfiles públicos.

**Reglas/invariantes observadas**

- una red de cada tipo por perfil;
- ownership del perfil;
- URL validada por Zod.

**Propietario conceptual candidato / contexto**

Profiles / Professional Presentation.

**Aggregate boundary candidato**

Entidad dependiente del perfil.

**Decisiones pendientes**

- catálogo fijo de redes versus configuración extensible;
- política de visibilidad y moderación.

### `ProfessionalSpecialty`

**Hecho observado**

- Es una relación compuesta por `professionalId` y `specialtyId`, con estado, fecha de solicitud y revisión.
- `ProfessionalSpecialtyService.requestSpecialty` crea la relación dentro de transacción.
- Limita a dos solicitudes PENDING.
- `setSpecialtyStatus` modifica estado, fecha y puede suspender al profesional si no quedan especialidades aprobadas.
- `AuthService.register` crea una relación inicial.
- `ServiceService` consulta relaciones APPROVED.
- `ProfessionalProfileService` las incluye en vistas.
- Admin modifica su estado a través de endpoints de administración.

**Reglas/invariantes observadas**

- specialty debe existir y estar activa;
- no puede repetirse la pareja profesional-especialidad;
- máximo dos pendientes;
- al aprobar/rechazar se registra `reviewedAt`;
- si no quedan aprobadas, se suspende el perfil según el service actual.

**Dependencias reales**

- depende de `ProfessionalProfile` y `Specialty`;
- participa en transacciones con `Specialty` y `ProfessionalProfile`;
- desencadena Notifications;
- es consultada por Catalog, Profiles y Appointments para mostrar/validar especialidades.

**Propietario conceptual candidato**

Indeterminado entre Profiles/Professional Onboarding y Catalog. Semánticamente parece una solicitud/afiliación del profesional al catálogo, no una mera tabla de join.

**Bounded context candidato**

Professional Onboarding o Catalog Membership.

**Aggregate boundary candidato**

Podría ser aggregate root de la solicitud de especialidad usando la clave compuesta, o entidad dependiente de `ProfessionalProfile`. La evidencia actual no permite elegir: existe estado propio e invariantes propias, pero también modifica el estado del perfil.

**Dependencias futuras**

- port para consultar specialty activa;
- evento de specialty approved/rejected;
- evento de profile suspended;
- read model de especialidades aprobadas.

**Decisiones pendientes**

- quién es dueño de la aprobación;
- si una specialty es global o tenant-owned;
- si el rechazo de la última specialty debe suspender automáticamente al profesional;
- si la solicitud debe conservar historial de estados.

## 3. Catalog

### `Specialty`

**Hecho observado**

- Tiene `name` único global, descripción y `isActive`.
- `SpecialtyService` crea, lista activas/inactivas, actualiza, restaura y desactiva.
- Al crear una specialty inactiva con el mismo nombre, la reactiva.
- `AuthService` la consulta durante registro profesional.
- `ProfessionalSpecialtyService` exige que esté activa para solicitarla.
- `ServiceService` la consulta indirectamente a través de la relación aprobada.

**Reglas/invariantes observadas**

- nombre único en toda la base actual;
- soft delete mediante `isActive = false`;
- no se elimina físicamente desde el service observado;
- solo specialty activa puede solicitarse.

**Dependencias reales**

- relación con profesionales y servicios;
- se usa en validación de registro y de creación de servicio;
- administración gestiona su ciclo.

**Propietario conceptual candidato**

Catalog.

**Bounded context candidato**

Catalog.

**Aggregate boundary candidato**

`Specialty` puede ser aggregate root de catálogo. Las relaciones con profesionales y servicios no deben considerarse parte del mismo aggregate únicamente por las FKs.

**Dependencias futuras**

- contrato de consulta de specialty activa;
- read models para búsqueda pública;
- decisión de catálogo global o tenant-owned.

**Decisiones pendientes**

- si el nombre debe ser único globalmente o por tenant;
- si las specialties son administradas por la plataforma o por cada consultorio;
- política de desactivación cuando existen servicios o solicitudes.

### `Service`

**Hecho observado**

- Tiene nombre, descripción, duración, precio Decimal, `profileId`, `specialtyId`, `isActive`.
- Unique `[profileId, name]`.
- `ServiceService` lista, crea, actualiza y desactiva.
- La creación exige specialty aprobada del profesional.
- La desactivación está bloqueada si hay citas futuras no canceladas.
- Appointments consulta servicio activo y verifica que pertenezca al profesional.
- Schedule no modifica servicios, pero disponibilidad usa su duración.

**Reglas/invariantes observadas**

- duración positiva y múltiplo de 15;
- precio positivo;
- nombre único entre servicios activos del profesional según service;
- specialty debe estar aprobada para el profesional;
- no se puede desactivar con citas futuras;
- solo servicio activo del profesional puede reservarse.

**Dependencias reales**

- `ProfessionalSpecialty` y `ProfessionalProfile` para autorización/validación;
- `Appointment` para proteger desactivación y reservar;
- `Schedule` indirectamente por duración en disponibilidad;
- `Specialty` para presentación y categorización.

**Propietario conceptual candidato**

Catalog/Professional Offering.

**Bounded context candidato**

Catalog, posiblemente con una subárea de offerings.

**Aggregate boundary candidato**

`Service` parece aggregate root de su propia oferta. `Appointment` debe guardar una referencia y posiblemente un snapshot de duración/precio; la FK actual no demuestra que `Service` pertenezca al aggregate de Appointment.

**Dependencias futuras**

- port `ServiceAvailability` o `ReservableService`;
- contrato de lectura de duración y estado;
- evento de service deactivated;
- snapshot de datos relevantes al crear la cita, si el negocio lo requiere.

**Decisiones pendientes**

- si el precio puede cambiar sin afectar citas existentes;
- si la specialty debe ser obligatoria y aprobada siempre;
- si los servicios son tenant-owned;
- si desactivar debe bloquearse o cancelar futuras citas.

### `Schedule`

**Hecho observado**

- Tiene `profileId`, día, inicio, fin, activo y timestamps.
- Unique `[profileId, dayOfWeek, startMin]`.
- `ScheduleService` crea, actualiza, soft-deletes y lista.
- Valida rango, orden, múltiplos de 15 y solapamiento entre horarios activos.
- Al eliminar/desactivar consulta appointments futuros no cancelados.
- `AppointmentService` consulta schedules para validar reserva y disponibilidad.

**Reglas/invariantes observadas**

- `startMin < endMin`;
- valores dentro del día;
- múltiplos de 15;
- no overlap activo por profesional/día;
- no se desactiva un horario si existen citas futuras dentro del rango según la consulta actual.

**Dependencias reales**

- depende de `ProfessionalProfile`;
- es consultado por Appointments;
- consulta `Appointment` para proteger cambios.

**Propietario conceptual candidato**

Scheduling.

**Bounded context candidato**

Scheduling/Availability.

**Aggregate boundary candidato**

El conjunto de horarios de un profesional podría ser un aggregate de disponibilidad, aunque el schema actual no impone el no-overlap como constraint. `Appointment` no debería formar el mismo aggregate: solo debe consultar disponibilidad existente y reservar de manera segura.

**Dependencias futuras**

- port de consulta de disponibilidad para Appointments;
- contrato de bloqueo/reserva;
- política de cambios de horario con citas existentes.

**Decisiones pendientes**

- zona horaria del profesional/tenant;
- si `dayOfWeek` usa 0–6 o 1–7; el DTO y `AppointmentService` muestran convenciones distintas;
- si el horario es recurrente, por fecha específica o ambos;
- si se permiten excepciones, vacaciones o feriados.

## 4. Appointments

### `GuestClient`

**Hecho observado**

- Tiene datos básicos sin `userId`.
- `AppointmentService.createGuest` busca por email/nombre y crea si no existe.
- Solo se referencia desde `Appointment`.
- No se elimina explícitamente; `Appointment` usa `onDelete: SetNull`.

**Reglas/invariantes observadas**

- guest puede reservar sin cuenta;
- se valida nombre y email opcional en el schema;
- se reutiliza una coincidencia por nombre y email;
- se incluye en respuestas de citas guest.

**Dependencias reales**

- es creado por Appointments;
- se vincula a profesional, servicio y cita mediante Appointment;
- no se relaciona con Identity.

**Propietario conceptual candidato**

Appointments, como participante no registrado de una reserva.

**Bounded context candidato**

Appointments.

**Aggregate boundary candidato**

Podría ser entidad dependiente del aggregate `Appointment`, no un cliente global. La reutilización por nombre/email hace que el comportamiento actual sea más amplio que un simple value object, pero no existe evidencia para convertirlo en Customer Identity.

**Decisiones pendientes**

- si guest debe ser exclusivo de un tenant/profesional;
- si debe convertirse a cliente registrado;
- política de privacidad, deduplicación y retención;
- si debe recibir notificaciones por correo.

### `Appointment`

**Hecho observado**

- Tiene referencias opcionales a `ClientProfile` o `GuestClient`, y obligatorias a `Service` y `ProfessionalProfile`.
- Tiene fecha, minutos de inicio/fin, estado, pago, notas y timestamps.
- Unique `[professionalProfileId, date, startMin]`.
- Se crea para clientes autenticados o guests.
- Se consulta en historial, próximas citas, disponibilidad, reviews, schedule/service deletion y worker.
- Cambia de estado por profesional o cron.
- Puede tener una review y notificaciones.

**Reglas/invariantes observadas**

- una reserva debe tener cliente registrado o guest según el flujo; el schema no expresa un XOR constraint;
- el servicio debe pertenecer al profesional y estar activo;
- la fecha/hora debe ser futura;
- la cita debe caer dentro de un schedule activo;
- no debe solaparse con otra cita no cancelada;
- creación de cliente exige notificación a cliente y profesional;
- profesional solo puede confirmar/cancelar sus propias citas;
- transiciones observadas: `PENDING → CONFIRMED/CANCELLED`, `CONFIRMED → CANCELLED`;
- confirmación no permite citas pasadas;
- cron cancela pendientes al comenzar y completa confirmadas al terminar;
- review solo puede crearse para cita COMPLETED y una sola vez.

**Dependencias reales**

- consulta `Service` para duración/ownership;
- consulta `Schedule` para disponibilidad;
- referencia `ProfessionalProfile` y `ClientProfile`;
- crea/consulta `GuestClient`;
- notifica mediante `NotificationService`;
- Reviews consulta Appointment y actualiza ProfessionalProfile;
- Schedule y Service consultan Appointment antes de desactivar;
- worker modifica Appointment y dispara Notifications.

**Transacciones observadas**

- la creación de appointment no está envuelta en una transacción junto con la validación de overlap y las notificaciones;
- cambio de estado usa `updateMany` con estado previo para concurrencia optimista parcial;
- el worker actualiza cada cita individualmente;
- la creación de review sí transacciona Review + rating de profesional, pero la notificación ocurre después.

**Propietario conceptual candidato**

Appointments/Booking.

**Bounded context candidato**

Appointments.

**Aggregate boundary candidato**

`Appointment` parece aggregate root. `Review`, `Notification`, `Service`, `Schedule`, perfiles y guest no deben formar automáticamente parte del aggregate por estar relacionados. La cita puede conservar IDs y snapshots/contratos mínimos de esos conceptos.

**Dependencias futuras**

- port de disponibilidad;
- port de participantes/identidad profesional y cliente;
- port de catálogo reservable;
- eventos `AppointmentCreated`, `AppointmentConfirmed`, `AppointmentCancelled`, `AppointmentCompleted`;
- read model de agenda/historial;
- mecanismo de idempotencia y concurrencia para reservar.

**Decisiones pendientes**

- ownership tenant de la cita;
- política de pago;
- si una cita puede cambiar de servicio/profesional;
- reglas completas de cancelación por cliente/profesional;
- timezone;
- si se permite una cita guest sin email/teléfono;
- si se necesita snapshot de precio, duración y nombre.

## 5. Reviews

### `Review`

**Hecho observado**

- Tiene `appointmentId` único, rating, comentario y timestamps.
- `ReviewsService.create` verifica que la cita exista, pertenezca al cliente autenticado, esté COMPLETED y no tenga review.
- Crea la review y actualiza `ProfessionalProfile.ratingAvg/ratingCount` dentro de una transacción.
- Después dispara notificación al profesional.
- Las consultas públicas/de consulta por appointment usan directamente relaciones de Appointment.

**Reglas/invariantes observadas**

- una review por appointment;
- rating entre 1 y 5 por schema;
- solo cliente de la cita;
- solo cita completada;
- rating agregado se recalcula incrementalmente.

**Dependencias reales**

- depende de `Appointment` para elegibilidad;
- modifica `ProfessionalProfile` para rating;
- usa `NotificationService`.

**Propietario conceptual candidato**

Reviews.

**Bounded context candidato**

Reviews/Feedback.

**Aggregate boundary candidato**

`Review` podría ser aggregate root con referencia a `Appointment` y `ProfessionalProfile`. La actualización de rating en el mismo transaction muestra consistencia actual, pero no demuestra que `ProfessionalProfile` pertenezca al mismo aggregate. En un diseño separado, rating podría ser projection o read model.

**Dependencias futuras**

- port de elegibilidad de review;
- evento `ReviewCreated`;
- projection de rating profesional;
- read model público de reviews;
- autorización contextual para lecturas.

**Decisiones pendientes**

- si el rating es derivado exclusivamente de reviews;
- cómo corregir/eliminar reviews;
- moderación;
- si la review pertenece al tenant de la cita o al perfil global.

## 6. Notifications

### `Notification`

**Hecho observado**

- Tiene `userId`, `appointmentId` opcional, tipo, título, mensaje, `isRead` y fecha.
- `NotificationService` crea notificaciones de bienvenida, citas, reviews, perfiles y specialties.
- Se crea desde Auth, Appointments, Reviews, ProfessionalProfile y ProfessionalSpecialty.
- Appointments y Reviews proporcionan `appointmentId` en eventos relacionados.
- Se elimina por cascade con `User` y `Appointment`.

**Reglas/invariantes observadas**

- `isRead` inicia en false;
- el tipo debe pertenecer al enum Prisma;
- la notificación se dirige a un usuario;
- el vínculo a una cita es opcional;
- no se observa una constraint de idempotencia por evento/destinatario.

**Dependencias reales**

- recibe eventos implícitos desde múltiples módulos;
- persiste directamente en Prisma;
- usa `User` como destinatario y `Appointment` como referencia opcional;
- el módulo de notifications conoce detalles de auth, perfil, specialty, review y appointments.

**Propietario conceptual candidato**

Notifications como contexto de entrega, no como propietario de los eventos de negocio.

**Bounded context candidato**

Notifications/Communication.

**Aggregate boundary candidato**

`Notification` puede ser aggregate root de una entrega individual. No debe incluir Appointment, User o Profile como parte del aggregate por sus FKs.

**Dependencias futuras**

- comandos/eventos de otros contextos;
- port de destinatario/identidad;
- idempotency key;
- canales de entrega (in-app, email, push);
- política de retención.

**Decisiones pendientes**

- si notifications pertenece al tenant del evento, al usuario o a ambos;
- si se conservarán mensajes materializados o plantillas;
- si se soportarán destinatarios guest.

## 7. Preferences

### `CustomConfig`

**Hecho observado**

- Tiene `userId` único, enums de idioma/tema/layout, JSON `preferences`, `notificationsEnabled` y timestamps.
- Se crea al registrar un usuario.
- `ConfigService` la obtiene y actualiza por `userId`.
- `UsersService.me` la incluye en una respuesta agregada con el perfil.
- Cascadea con `User`.

**Reglas/invariantes observadas**

- una configuración por usuario;
- valores por defecto definidos en Prisma;
- `preferences` acepta JSON arbitrario en DTO y tipo;
- no se observan reglas de ownership más allá de `userId`.

**Propietario conceptual candidato**

Preferences.

**Bounded context candidato**

Preferences/User Settings.

**Aggregate boundary candidato**

`CustomConfig` puede ser aggregate root independiente, identificado por `userId`, o entidad dependiente de Identity. El código actual no resuelve esta decisión.

**Dependencias futuras**

- contrato de identidad del usuario;
- schema versionado para preferencias;
- read model para la pantalla `me`.

**Decisiones pendientes**

- preferencias globales del usuario versus preferencias por tenant;
- si notifications settings pertenecen a Preferences o Notifications;
- qué claves JSON son válidas y quién las posee.

## 8. Operaciones por modelo

La siguiente matriz resume las operaciones observadas en services, controllers, worker y seeds. `C` significa create, `R` read, `U` update, `D` delete físico y `S` soft delete/desactivación.

| Modelo | C | R | U | D/S | Módulos con acceso directo |
|---|---|---|---|---|---|
| `User` | Auth, seeds | Auth, Users, perfiles vía relación | Auth, Users | Cascade | Auth, Users |
| `VerificationAttempt` | Auth | Auth | Auth | Cascade | Auth |
| `PasswordReset` | Auth | Auth | Auth | Cascade | Auth |
| `RefreshToken` | Auth | Auth | Auth | Cascade | Auth, Users | 
| `AdminProfile` | Seeds/externo no observado en Auth | Users | Users | Cascade | Users/AdminProfile |
| `ClientProfile` | Auth, seeds | Users, Appointments | Users | Cascade | Auth, Users, Appointments |
| `ProfessionalProfile` | Auth, seeds | Users, Profiles, Appointments, Services, Reviews, Admin | Profiles, Reviews, Specialty | Cascade | varios módulos |
| `ProfessionalSpecialty` | Auth, Specialty | Profiles, Specialty, Services | Specialty/Admin | Cascade con profile | Auth, Specialty, Services, Profiles |
| `Certificate` | Profiles | Profiles | No observado | Profiles | Profiles |
| `SocialLink` | Profiles | Profiles | Profiles | Profiles | Profiles |
| `Specialty` | Specialty, seeds | Auth, Specialty, relation, Services | Specialty | S | Auth, Specialty, relation |
| `Service` | Services, seeds | Services, Appointments | Services | S | Services, Appointments |
| `Schedule` | Schedule | Schedule, Appointments | Schedule | S | Schedule, Appointments |
| `GuestClient` | Appointments | Appointments | No observado | SetNull/cascade de relaciones | Appointments |
| `Appointment` | Appointments, seeds | Appointments, Schedule, Services, Reviews, worker | Appointments, worker | No delete observado; status changes | varios |
| `Review` | Reviews, seeds | Reviews | No update observado | Cascade con Appointment | Reviews |
| `Notification` | Notifications | Notifications | Notifications | No delete observado | Notifications |
| `CustomConfig` | Auth, seeds | Config, Users | Config | Cascade | Auth, Config, Users |

La matriz refleja acceso técnico, no propiedad de dominio. Por ejemplo, que Reviews actualice `ProfessionalProfile.ratingAvg` no significa automáticamente que Reviews sea dueño del perfil.

## 9. Transacciones y límites actuales

### Transacciones observadas

| Operación | Modelos participantes | Interpretación |
|---|---|---|
| Registro | `User`, perfil, `Specialty` read, `CustomConfig`, `VerificationAttempt` | La cuenta se inicializa junto con datos de otros conceptos. |
| Verificación | `User`, `VerificationAttempt`, `RefreshToken` | Seguridad de identidad y sesión. |
| Reset password | `User`, `PasswordReset`, `RefreshToken` | Cambio de credencial e invalidación de sesiones. |
| Solicitud specialty | `Specialty` read, `ProfessionalSpecialty`, Notifications fuera | La solicitud tiene consistencia propia; side effect fuera. |
| Revisión specialty | `ProfessionalSpecialty`, `ProfessionalProfile`, Notifications fuera | Decisión de specialty puede cambiar el estado del perfil. |
| Crear review | `Review`, `ProfessionalProfile` rating, Notifications fuera | Review y rating tienen consistencia actual. |

**Hecho observado:** muchas operaciones que cruzan modelos no usan una transacción explícita, especialmente creación/cambio de Appointment y operaciones de notificación. Las transacciones existentes cruzan límites conceptuales diferentes.

**Riesgo/deuda arquitectónica:** la transacción Prisma actual puede hacer parecer que todos los modelos participantes forman un mismo aggregate. En realidad, algunas operaciones son coordinación entre contextos y otras son consistencia local.

## 10. Ciclos de dependencia conceptual y técnica

### Ciclo Profiles ↔ Catalog

```text
ProfessionalProfile
  -> ProfessionalSpecialty
  -> Specialty
  -> Service
  -> ProfessionalProfile
```

Además:

- Profiles necesita specialties aprobadas para aprobar al profesional;
- Catalog necesita ProfessionalSpecialty aprobado para crear un Service;
- el registro de Auth crea ambos conceptos.

**Observación:** la FK es legítima para persistencia, pero el ciclo técnico muestra que los módulos no están separados por ports.

### Ciclo Appointments ↔ Catalog/Scheduling

```text
Appointment -> Service -> ProfessionalProfile
Appointment -> Schedule -> ProfessionalProfile
Service/Schedule -> Appointment
```

**Observación:** Appointments consulta catálogo y disponibilidad; Service/Schedule consultan appointments para impedir desactivaciones. Esto es una dependencia de política de negocio, no prueba de aggregate común.

### Ciclo Appointments ↔ Reviews ↔ ProfessionalProfile

```text
Review -> Appointment
Review -> ProfessionalProfile.rating
Appointment -> Review
```

**Observación:** Appointment es requisito de elegibilidad; Review modifica una proyección o dato agregado del profesional. El diseño futuro debe decidir si rating es propiedad de Reviews o una lectura materializada en Profiles.

### Ciclo transversal de Notifications

```text
Auth / Profiles / Catalog / Appointments / Reviews
  -> Notifications
Notifications
  -> User / Appointment
```

**Observación:** Notifications no debe interpretarse como dueño de User o Appointment por sus FKs. El módulo actúa como consumidor de hechos de negocio, aunque hoy se invoca por llamadas directas.

## 11. Candidatos de bounded context y límites tentativos

### Identity

Responsable candidato de `User`, verificación, reset y refresh tokens. Debe publicar un contrato mínimo de identidad, no modelos completos de Prisma.

### Profiles / Professional Onboarding

Responsable candidato de perfiles y credenciales profesionales. La propiedad de `ProfessionalSpecialty` requiere decisión: puede ser onboarding o una relación administrada por Catalog.

### Catalog

Responsable candidato de `Specialty` y `Service`. Debe consultar el estado profesional mediante contrato, no navegar necesariamente tablas de Profiles.

### Scheduling

Responsable candidato de `Schedule` y reglas de disponibilidad. Appointments debería pedir disponibilidad mediante un port o servicio de aplicación, no duplicar la consulta de schedules.

### Appointments

Responsable candidato de `Appointment` y `GuestClient`. Debe coordinar participantes, catálogo y disponibilidad mediante contratos.

### Reviews

Responsable candidato de `Review` y elegibilidad posterior a la cita. El rating de ProfessionalProfile es una dependencia que debe resolverse mediante evento/proyección o contrato.

### Notifications

Responsable candidato de `Notification` y entrega de mensajes. Debe recibir eventos/comandos, no conocer todos los servicios internos de los demás contextos.

### Preferences

Responsable candidato de `CustomConfig`, con dependencia mínima de Identity.

## 12. Decisiones que no pueden resolverse todavía

1. Si `Role` representa identidad, autorización global o membership de una organización.
2. Si `AdminProfile` es global o pertenece a un tenant.
3. Si `Specialty` es catálogo global de plataforma o catálogo por tenant.
4. Si `ProfessionalProfile`, `Service` y `Schedule` pertenecen a un único consultorio o pueden ser compartidos.
5. Si el cliente es global, tenant-owned o miembro de múltiples tenants.
6. Si `GuestClient` es una persona temporal de Appointment o un cliente reutilizable.
7. Si rating es propiedad de Profiles, Reviews o una proyección.
8. Si `Appointment` debe guardar snapshots de servicio, precio, duración y profesional.
9. Si se permiten cambios de horario/servicio con reservas futuras.
10. Qué timezone gobierna `date`, `startMin`, schedules y el worker.
11. Si las notificaciones son exclusivamente in-app o también email/push.
12. Qué eventos son contractuales y qué lecturas requieren read models.
13. Qué transacciones deben ser consistencia local y cuáles serán coordinación entre contextos.
14. Si las FK actuales deben conservarse, reemplazarse por IDs externos o mantenerse solo en una read database/projection.

## 13. Hallazgos clasificados

### P1

- **P1-OWNERSHIP-001 — `Appointment` no expresa mediante constraint que tenga exactamente un participante.** `clientProfileId` y `guestId` son opcionales de forma independiente; el código asume que uno de los flujos los establece.
- **P1-OWNERSHIP-002 — Reserva y disponibilidad no tienen una frontera transaccional única.** La validación de horario/overlap ocurre antes del create, mientras la unicidad solo cubre el mismo `startMin`; la cobertura de intervalos y concurrencia no queda completamente garantizada por el schema.
- **P1-OWNERSHIP-003 — Rating de `ProfessionalProfile` es modificado desde Reviews.** La autoridad conceptual del dato agregado no está definida y puede divergir si existen correcciones, eliminaciones o concurrencia.

### P2

- **P2-OWNERSHIP-001 — Múltiples módulos escriben `ProfessionalProfile`.** Auth crea, Profiles modifica, Specialty puede suspender y Reviews actualiza rating.
- **P2-OWNERSHIP-002 — Ciclo Profiles/Catalog.** La relación profesional-specialty tiene estado propio y reglas cruzadas.
- **P2-OWNERSHIP-003 — Ciclo Appointments/Catalog/Scheduling.** Services y schedules consultan appointments para sus propias decisiones de desactivación.
- **P2-OWNERSHIP-004 — Transacciones cruzan posibles bounded contexts.** Registro, specialty review y review/rating agrupan modelos de distintos conceptos.
- **P2-OWNERSHIP-005 — `Notification` es disparada desde muchos módulos mediante llamadas directas.**
- **P2-OWNERSHIP-006 — `User.role` es autoridad global actual sin membership ni tenant.**
- **P2-OWNERSHIP-007 — `Specialty.name` es único globalmente en el schema actual.**

### P3

- **P3-OWNERSHIP-001 — Soft delete y estado activo conviven de manera desigual.** Specialty, Service y Schedule se desactivan; Appointment y GuestClient no tienen equivalente general.
- **P3-OWNERSHIP-002 — Semántica de fechas y días no es uniforme.** Se observan conversiones UTC/local y diferencias entre `Schedule` y `Appointment`.
- **P3-OWNERSHIP-003 — `AdminProfile` no tiene creación normalizada observable en el flujo de registro.**

No se clasifica ningún hallazgo como P0: este bloque documenta límites, reglas y riesgos de consistencia, sin implementar cambios.

## Estado del bloque

- Código de `src/`: sin modificar.
- `schema.prisma`: sin modificar.
- Migraciones: no creadas.
- Repositories/ports: no creados.
- Bounded contexts: solo candidatos analíticos, no implementados.
