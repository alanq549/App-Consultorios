# Baseline del backend — Bloque 2
# Inventario de módulos, modelos y responsabilidades

## Alcance

Este documento continúa [BASELINE.md](BASELINE.md) y cubre el Bloque 2 de la Fase 0:

- responsabilidades reales de los módulos actuales;
- submódulos;
- modelos Prisma utilizados;
- operaciones de persistencia;
- reglas de negocio observables;
- dependencias entre módulos;
- side effects;
- solapamientos;
- posibles bounded contexts futuros.

No contiene migraciones ni cambios de código. Las conclusiones están separadas en:

- **Hecho observado:** evidencia directa en archivos actuales.
- **Interpretación arquitectónica:** lectura del impacto estructural.
- **Posible bounded context futuro:** hipótesis para evaluar después, no una decisión de implementación.

## Fuente de evidencia

- `src/modules/**`;
- `src/core/**`;
- `src/middlewares/**`;
- `src/seed/**`;
- `prisma/schema.prisma`;
- llamadas directas a Prisma y imports entre módulos.

## Inventario de módulos actuales

| Módulo actual | Archivos/submódulos observados | Responsabilidad real observada |
|---|---|---|
| `auth` | controller, routes, dto, service, mail, tokens, types | registro, login, verificación, reset, refresh tokens, creación de perfiles/configuración y notificaciones |
| `users` | controller, routes, dto, service, types | cuenta, cambio de credenciales, selección de perfil por rol, avatar y configuración |
| `users/clientprofile` | service, dto, mapper | lectura y actualización de perfil de cliente |
| `users/professionalprofile` | controller, routes, dto, service, type | perfil profesional, lectura pública, enlaces, certificados, especialidades y estados de aprobación |
| `users/adminprofile` | service | lectura/actualización de perfil administrativo; no tiene routes propias observadas |
| `appointments` | controller, routes, dto, service, types, availability util, worker | reserva, citas guest, disponibilidad, historial, estados, notificaciones y cron |
| `services` | controller, routes, dto, service, types | servicios profesionales y reglas de especialidad/propiedad |
| `schedule` | controller, routes, dto, service, types | horarios, solapamientos y eliminación condicionada por citas |
| `specialty` | controller, routes, dto, service, types | catálogo de especialidades y soft delete |
| `specialty/ProfessionalSpecialty` | controller, routes, service | solicitud y aprobación/rechazo de especialidades profesionales |
| `notifications` | controller, routes, dto, service, types | persistencia y lectura de notificaciones |
| `reviews` | controller, routes, dto, service, types | creación/consulta de reseñas y actualización agregada de rating |
| `config` | controller, routes, dto, service, types | preferencias/configuración personal |
| `admin` | controller, routes | superficie administrativa que invoca perfiles y especialidades |

## Responsabilidades reales por módulo

### `auth`

### Hecho observado

- `AuthService.register` crea `User`.
- Según el rol, crea `ClientProfile` o `ProfessionalProfile`.
- Para profesionales valida una especialidad y crea `ProfessionalSpecialty`.
- Crea `CustomConfig`.
- Crea `VerificationAttempt`.
- Envía correo de verificación.
- Crea notificación de bienvenida.
- `login`, `verifyByToken` y `refresh` administran `RefreshToken`.
- `forgotPassword` y `resetPassword` administran `PasswordReset`.

### Interpretación arquitectónica

El módulo no solo administra identidad. También orquesta perfiles, preferencias, notificaciones y correo.

La transacción de registro cruza varios conceptos de negocio. Además, el correo y la notificación se ejecutan fuera de la transacción principal.

### Posible bounded context futuro

`identity` o `identity-and-access`, limitado a:

- cuenta;
- credenciales;
- verificación;
- sesiones;
- recuperación de acceso.

La creación de perfiles y preferencias sería una coordinación de aplicación, no una responsabilidad interna de la entidad de identidad.

### `users`

### Hecho observado

- `UsersService.me` consulta `User`, selecciona un servicio de perfil por `Role` y consulta configuración.
- `changeEmail` y `changePassword` modifican `User`.
- `changePassword` revoca refresh tokens.
- `updateAvatar` elimina un archivo del filesystem y actualiza el perfil correspondiente.
- `updateProfile` delega a `ClientProfileService`, `ProfessionalProfileService` o `AdminProfileService`.
- Usa `profileServiceMap: Record<Role, any>`.

### Interpretación arquitectónica

`users` es un módulo fachada que agrupa responsabilidades de identidad, perfiles, preferencias y almacenamiento.

El mapa por rol representa una interfaz implícita entre tres servicios de perfil, pero no existe un contrato explícito común.

### Posible bounded context futuro

Debe evaluarse como combinación de:

- `identity`;
- `profiles`;
- `preferences`;
- `storage` como infraestructura transversal.

### `clientprofile`

### Hecho observado

- Consulta y actualiza `ClientProfile` por `userId`.
- Devuelve un mapper de respuesta.
- Cuenta citas relacionadas mediante `_count`.

### Interpretación arquitectónica

Es el submódulo con límites más claros dentro de `users`, pero todavía depende directamente de Prisma y no tiene repositorio.

### Posible bounded context futuro

Parte de `profiles`, no necesariamente un bounded context independiente.

### `professionalprofile`

### Hecho observado

- Consulta `ProfessionalProfile`.
- Lee especialidades, certificados y enlaces.
- Expone listados públicos y perfil público.
- Actualiza datos del perfil.
- Crea, actualiza y elimina `SocialLink`.
- Crea y elimina `Certificate`.
- Cambia `verificationStatus`.
- Verifica que exista al menos una especialidad aprobada antes de aprobar.
- Envía notificaciones al cambiar estado.

### Interpretación arquitectónica

Este módulo mezcla:

- perfil profesional;
- publicación/descubrimiento público;
- acreditaciones;
- especialidades;
- moderación;
- reputación de lectura;
- notificaciones.

`ProfessionalProfile` es un centro de relaciones persistentes, pero eso no implica que certificados, catálogo, agenda y moderación deban ser el mismo agregado de dominio.

### Posible bounded context futuro

`profiles`, con posibles subdominios internos:

- perfil profesional;
- credenciales/certificados;
- publicación pública;
- moderación.

La especialidad profesional parece candidata a `catalog` o a un contexto de acreditación, pendiente de decisión.

### `admin`

### Hecho observado

- Aplica `authMiddleware` y `authorizeRole("ADMIN")` a todas sus rutas.
- Revisa perfiles profesionales.
- Lista perfiles.
- Cambia estados de perfil.
- Cambia estados de especialidades profesionales.
- Invoca servicios internos de `users/professionalprofile` y `specialty/ProfessionalSpecialty`.

### Interpretación arquitectónica

`admin` no es actualmente dueño de los modelos que modifica. Es una superficie de entrada administrativa que atraviesa límites de otros módulos.

El rol `ADMIN` es global en el código actual; no existe pertenencia a organización.

### Posible bounded context futuro

No necesariamente un bounded context. Puede ser:

- capacidades administrativas dentro de cada contexto;
- una capa de aplicación de plataforma;
- un contexto `platform-operations` si se confirma que es operador global.

### `services`

### Hecho observado

- Consulta servicios activos por profesional.
- Crea, actualiza y desactiva `Service`.
- Valida duración y precio.
- Valida nombre único por perfil.
- Valida especialidad aprobada del profesional.
- Al desactivar consulta citas futuras.
- Resuelve el `ProfessionalProfile` desde el usuario autenticado.

### Interpretación arquitectónica

El módulo contiene reglas de catálogo y una dependencia operativa hacia citas para impedir desactivar servicios reservados.

Actualmente su propiedad de datos depende de `ProfessionalProfile`, pero no existe tenant.

### Posible bounded context futuro

`catalog`, junto con `Specialty` y `ProfessionalSpecialty`.

### `specialty`

### Hecho observado

- Crea, lista, actualiza, restaura y desactiva `Specialty`.
- La unicidad de nombre es global en Prisma.
- Lista especialidades de un profesional mediante `ProfessionalSpecialty`.
- Su controller es administrativo para mutaciones.

### Interpretación arquitectónica

El código trata `Specialty` como catálogo global, no como catálogo por profesional o tenant.

El submódulo `ProfessionalSpecialty` contiene una relación con reglas propias y actualiza el estado del perfil profesional.

### Posible bounded context futuro

`catalog` si las especialidades son globales. Si cada consultorio puede definir especialidades propias, el límite y la propiedad cambiarían.

### `specialty/ProfessionalSpecialty`

### Hecho observado

- Solicita una especialidad para un profesional.
- Limita a dos solicitudes pendientes.
- Cambia estado de la relación.
- Al dejar al profesional sin especialidades aprobadas, suspende el perfil.
- Envía notificaciones.
- Tiene router propio no montado directamente en `app.ts`.
- Sus operaciones también están montadas mediante perfiles/admin.

### Interpretación arquitectónica

Es una capacidad de relación entre perfiles y catálogo, no una simple tabla CRUD. Tiene invariantes y efectos sobre `ProfessionalProfile`.

El módulo está duplicado en superficie HTTP y cruza tres modelos con reglas de estado.

### Posible bounded context futuro

Puede permanecer dentro de `catalog` como `professional-specialties`, o convertirse en un subdominio de acreditación si la verificación profesional crece.

### `schedule`

### Hecho observado

- Crea, actualiza, lista y desactiva `Schedule`.
- Valida rango, múltiplos de 15 minutos y solapamientos.
- Impide eliminar horarios con citas futuras.
- Resuelve perfil profesional desde el usuario para mutaciones.

### Interpretación arquitectónica

El módulo posee reglas de disponibilidad, pero consulta `Appointment` para decidir si puede modificar un horario.

La disponibilidad también se calcula actualmente dentro de `appointments`, por lo que la responsabilidad está duplicada conceptualmente.

### Posible bounded context futuro

`scheduling`, con un contrato de disponibilidad consumido por `appointments`.

### `appointments`

### Hecho observado

- Crea citas de clientes autenticados.
- Crea citas guest.
- Valida servicio, horario y solapamiento.
- Consulta disponibilidad.
- Cambia estado por profesional.
- Lista historial y próximas citas.
- Importa `NotificationService`.
- Tiene un cron en `appointment.worker.ts`.
- El worker cancela citas pendientes vencidas y completa citas confirmadas terminadas.

### Interpretación arquitectónica

Es el módulo con mayor concentración de responsabilidades:

- booking;
- disponibilidad;
- lifecycle;
- clientes invitados;
- consultas;
- notificaciones;
- procesamiento temporal.

El controller también consulta Prisma para resolver el perfil de cliente.

### Posible bounded context futuro

`appointments` como contexto principal, con contratos hacia:

- `catalog`;
- `scheduling`;
- `identity/profiles`;
- `notifications`.

El worker/cron debería tratarse como infraestructura o proceso de aplicación, no como regla dispersa del módulo.

### `notifications`

### Hecho observado

- Crea notificaciones persistidas.
- Expone notificaciones por usuario.
- Marca una notificación por ID.
- Marca todas las del usuario.
- Contiene métodos específicos para bienvenida, citas, perfiles y especialidades.

### Interpretación arquitectónica

Es un servicio central de side effects persistidos, pero sus métodos codifican conocimiento de muchos contextos.

Además, `markAsRead` recibe solo el ID de notificación, mientras `getUserNotifications` y `markAllAsRead` usan el usuario autenticado.

### Posible bounded context futuro

`notifications`, con eventos de entrada y canales de entrega separados de la persistencia.

### `reviews`

### Hecho observado

- Crea una reseña solo si la cita está completada.
- Verifica que la cita pertenezca al cliente actual.
- Impide reseña duplicada.
- Actualiza `ratingAvg` y `ratingCount` del profesional en una transacción.
- Envía notificación al profesional.
- Lista reseñas por profesional y consulta por cita/lista de citas.

### Interpretación arquitectónica

El contexto posee reglas propias, pero modifica directamente un dato agregado en `ProfessionalProfile`.

La relación con `Appointment` es una dependencia de elegibilidad; la relación con el perfil profesional es una dependencia de reputación.

### Posible bounded context futuro

`reviews-and-reputation`, posiblemente separado de perfiles si la reputación crece.

### `config`

### Hecho observado

- Lee y actualiza `CustomConfig` por `userId`.
- El modelo tiene relación uno a uno con `User`.

### Interpretación arquitectónica

Es una capacidad de preferencias personales, actualmente acoplada a la respuesta de `UsersService.me`.

### Posible bounded context futuro

`preferences`, probablemente como módulo pequeño y no como bounded context independiente inicialmente.

## Matriz de modelos Prisma y operaciones actuales

La siguiente matriz describe operaciones observables en el código actual. “Módulo actual” no significa necesariamente “dueño de dominio”.

| Modelo | Módulos que crean | Módulos que modifican/eliminan | Módulos que consultan | Relaciones relevantes |
|---|---|---|---|---|
| `User` | `auth` | `auth`, `users` | `auth`, `users` | perfiles, tokens, notificaciones, configuración |
| `VerificationAttempt` | `auth` | `auth` | `auth` | pertenece a `User` |
| `PasswordReset` | `auth` | `auth` | `auth` | pertenece a `User` |
| `RefreshToken` | `auth` | `auth`, `users` | `auth` | pertenece a `User` |
| `AdminProfile` | `auth`/seed | `users/adminprofile` | `users` | uno a uno con `User` |
| `ClientProfile` | `auth`/seed | `users/clientprofile` | `auth`, `users`, `appointments`, `reviews`, controllers | citas |
| `ProfessionalProfile` | `auth`/seed | `users/professionalprofile`, `specialty/ProfessionalSpecialty` | `users`, `appointments`, `services`, `schedule`, `reviews`, `admin` | catálogo, agenda, citas, acreditación |
| `ProfessionalSpecialty` | `auth`, `specialty/ProfessionalSpecialty` | `specialty/ProfessionalSpecialty` | `services`, `specialty`, `profiles` | profesional y especialidad |
| `Certificate` | `users/professionalprofile` | `users/professionalprofile` | `users/professionalprofile` | perfil profesional |
| `SocialLink` | `users/professionalprofile` | `users/professionalprofile` | `users/professionalprofile` | perfil profesional |
| `Specialty` | `specialty`, seed | `specialty` | `specialty`, `services`, `appointments` indirectamente | catálogo global actual |
| `Service` | `services` | `services` | `services`, `appointments`, `schedule` indirectamente | profesional, especialidad, citas |
| `Schedule` | `schedule` | `schedule` | `schedule`, `appointments` | profesional |
| `GuestClient` | `appointments` | no se observó modificación de negocio relevante | `appointments` | citas guest |
| `Appointment` | `appointments` | `appointments`, `appointment.worker` | `appointments`, `services`, `schedule`, `reviews`, `notifications`, `worker` | cliente, guest, servicio, profesional |
| `Review` | `reviews` | no se observó actualización posterior | `reviews` | cita |
| `Notification` | `auth`, `appointments`, `profiles`, `specialty`, `reviews` | `notifications`, worker indirectamente por eventos de negocio | `notifications` | usuario y cita |
| `CustomConfig` | `auth`/seed | `config` | `config`, `users` | usuario |

## Reglas de negocio observadas

| Regla | Ubicación | Modelo/contexto |
|---|---|---|
| Solo roles `CLIENT` y `PROFESSIONAL` se registran públicamente | `auth.dto.ts` | identity |
| Profesional requiere especialidad | `auth.service.ts` | identity/profiles/catalog |
| No más de dos especialidades pendientes | `ProfessionalSpecialty.Service.ts` | catalog/acreditación |
| Perfil aprobado requiere especialidad aprobada | `professionalprofile.service.ts` | profiles/catalog |
| Estados de perfil tienen transiciones permitidas | `professionalprofile.service.ts` | profiles/moderación |
| Duración de servicio múltiplo de 15 | `service.service.ts` | catalog |
| Precio y duración deben ser positivos | `service.service.ts` | catalog |
| Nombre de servicio único por profesional activo | `service.service.ts` | catalog |
| No desactivar servicio con citas futuras | `service.service.ts` | catalog/appointments |
| Horario válido entre 0 y 1440 minutos | `schedule.service.ts` | scheduling |
| Horarios no pueden solaparse | `schedule.service.ts` | scheduling |
| No eliminar horario con citas futuras | `schedule.service.ts` | scheduling/appointments |
| Cita no puede iniciar en pasado | `appointments.service.ts` | appointments |
| Servicio debe pertenecer al profesional y estar activo | `appointments.service.ts` | appointments/catalog |
| No reservar slot solapado | `appointments.service.ts` | appointments/scheduling |
| Transiciones de cita dependen del estado actual | `appointments.service.ts` | appointments |
| Reseña requiere cita completada y perteneciente al cliente | `reviews.service.ts` | reviews/appointments |
| Una cita solo tiene una reseña | Prisma `@unique` en `Review.appointmentId` | reviews |
| Rating se recalcula incrementalmente al crear reseña | `reviews.service.ts` | reviews/profiles |
| Citas pendientes vencidas se cancelan por cron | `appointment.worker.ts` | appointments/operations |
| Citas confirmadas terminadas se completan por cron | `appointment.worker.ts` | appointments/operations |

## Dependencias entre módulos

### Hechos observados

Imports directos entre módulos:

| Origen | Destino | Evidencia |
|---|---|---|
| `auth` | `notifications` | `AuthService` crea bienvenida |
| `appointments` | `notifications` | crea/cambia notificaciones |
| `appointments/worker` | `notifications` | notifica cancelación/completado |
| `reviews` | `notifications` | notifica reseña |
| `profiles` | `notifications` | notifica cambios de estado |
| `specialty/ProfessionalSpecialty` | `notifications` | notifica solicitudes/decisiones |
| `users` | `profiles` | `profileServiceMap` |
| `users` | `preferences` | `ConfigService` |
| `admin` | `profiles` | revisión de perfiles |
| `admin` | `specialty/ProfessionalSpecialty` | cambio de estado |

Accesos directos a modelos de otros contextos:

- `appointments` consulta perfiles, servicios, horarios y clientes;
- `services` consulta especialidades, perfiles y citas;
- `schedule` consulta citas;
- `reviews` consulta citas, perfiles y actualiza rating de perfil;
- `specialty` actualiza el estado de perfil profesional;
- `auth` crea perfiles, configuración y especialidades asociadas.

### Interpretación arquitectónica

Las dependencias actuales son principalmente imports concretos y acceso directo a Prisma, no contratos entre contextos.

La persistencia está más integrada que el dominio: un módulo puede tocar modelos que conceptualmente pertenecerían a otro contexto.

## Side effects por módulo

| Módulo | Side effects |
|---|---|
| `auth` | email de verificación, email de reset, notificación de bienvenida |
| `users` | eliminación de avatar del filesystem |
| `profiles` | notificaciones de aprobación/rechazo/suspensión, escritura de certificados/enlaces |
| `appointments` | notificaciones, cron de transición de estados |
| `specialty` | notificaciones de solicitud/aprobación/rechazo |
| `reviews` | notificación al profesional, actualización de rating |
| `notifications` | persistencia de notificaciones |
| `core/server` | inicia seeds y carga worker/cron al arrancar |

## Solapamientos y responsabilidades mezcladas

### `auth` + `users`

Ambos modifican `User` y participan en perfiles/configuración. El límite entre cuenta y perfil no está definido.

### `users` + `profiles` + `storage`

`UsersService` decide el perfil por rol y manipula archivos. La selección de perfil y el almacenamiento son responsabilidades distintas.

### `appointments` + `scheduling`

Ambos validan reglas temporales; `appointments` calcula disponibilidad y `schedule` mantiene horarios.

### `catalog` + `profiles`

Servicios y especialidades dependen de perfiles profesionales. La relación de especialidad también puede suspender un perfil.

### `admin` + todos los dominios

`admin` opera sobre perfiles y especialidades, pero no es dueño explícito de sus reglas.

### `notifications` + todos los dominios

Los dominios importan directamente el servicio de notificaciones y conocen métodos específicos de entrega/persistencia.

## Ambigüedades que no se resuelven en este bloque

1. `ADMIN` global o administrador de tenant.
2. `Specialty` global o tenant-owned.
3. Propiedad de `ProfessionalProfile`, `Service`, `Schedule`, `Appointment`, `Review` y `Notification` si un profesional pertenece a más de un consultorio.
4. Si un `User` puede tener múltiples memberships.
5. Si `AdminProfile` representa un operador de plataforma o un administrador de consultorio.
6. Si `ratingAvg` y `ratingCount` son propiedad de perfiles o de reputación.
7. Si `GuestClient` pertenece a un tenant.
8. Si `CustomConfig` es preferencia personal o configuración del consultorio.
9. Si `appointments` o `scheduling` es dueño de la política de disponibilidad.
10. Si el cron debe ser parte del proceso HTTP o un proceso operativo separado.
11. Cuál router de `ProfessionalSpecialty` debe considerarse superficie canónica.

## Hipótesis de bounded contexts futuros

Estas son hipótesis, no migraciones aprobadas:

```text
identity
tenancy
profiles
catalog
scheduling
appointments
notifications
reviews-and-reputation
preferences
platform-administration
```

La persistencia actual no debe usarse como única razón para separar o unir contextos. Las decisiones finales requieren confirmar reglas de negocio, ownership y casos de uso.

## Conclusión del Bloque 2

El backend actual es un monolito funcional organizado por carpetas, pero sus responsabilidades cruzan los límites de esas carpetas:

- `auth` orquesta más que identidad;
- `users` funciona como fachada de varias áreas;
- `appointments` contiene disponibilidad y operaciones temporales;
- `admin` modifica modelos de otros módulos;
- `notifications` es invocado directamente por varios dominios;
- `specialty/ProfessionalSpecialty` tiene reglas propias y rutas duplicadas;
- Prisma actúa como punto de integración transversal sin repositorios ni contratos.

Este mapa permite decidir límites de dominio posteriormente, pero todavía no autoriza mover archivos ni crear bounded contexts.

