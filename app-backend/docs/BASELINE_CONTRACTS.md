# Baseline de DTOs, tipos e interfaces — Fase 0, Bloque 4

## Alcance

Este documento inventaría los contratos existentes en el backend tal como están implementados. Cubre:

- DTOs de entrada y salida;
- schemas de Zod;
- interfaces y type aliases;
- enums definidos fuera de Prisma;
- tipos de `req.user` y declaraciones de Express;
- objetos que cruzan controller, service y Prisma;
- respuestas HTTP;
- errores;
- usos de `any`;
- acoplamientos entre módulos y tipos derivados de Prisma.

No se modificó `src/`, `schema.prisma` ni ningún contrato HTTP. Las observaciones describen el estado actual; no son todavía un plan de refactor.

## Fuentes revisadas

- `src/modules/**/**.dto.ts`;
- `src/modules/**/**.types.ts` y `**.type.ts`;
- controllers y services de los módulos existentes;
- `src/middlewares/auth.middleware.ts`;
- `src/types/express.d.ts`;
- `src/middlewares/types/express.d.ts`;
- `src/core/errors/AppError.ts`;
- `src/core/errors/errorHandler.ts`;
- `prisma/schema.prisma`;
- `tsconfig.json` y `package.json`.

## Resumen del estado observado

| Área | Estado observado |
|---|---|
| Validación de entrada | Hay varios schemas Zod, pero no existe una convención uniforme para params, query, body y respuestas. |
| Tipos de entrada | Algunos se derivan de Zod con `z.infer`; otros controllers usan valores convertidos manualmente desde Express. |
| Tipos de salida | Hay DTOs e interfaces parciales, pero muchos controllers devuelven directamente el resultado de Prisma. |
| Persistencia | Services y al menos un controller acceden directamente a Prisma; no existe un contrato de repository uniforme. |
| Tipos Prisma | `Role`, `Language`, `Theme`, `LayoutType`, `ProfessionalStatus` y otros enums de Prisma aparecen en DTOs, tipos de aplicación y middleware. |
| Request autenticado | Existen dos declaraciones globales equivalentes de `Express.Request` y un `AuthRequest` local que no se usa como contrato general. |
| Errores | Conviven `AppError`, `Error`, errores de Zod, códigos Prisma y respuestas manuales. El handler recibe `err: any`. |
| `any` | El uso directo es reducido, pero está concentrado en fronteras críticas: JWT, errores, mapping de perfiles, filtros Prisma y respuesta de reseñas. Zod también admite `any` en configuración. |

## 1. Inventario de DTOs y schemas

### Auth

Archivo: `src/modules/auth/auth.dto.ts`.

| Contrato | Forma | Uso observado |
|---|---|---|
| `RegisterDTO` | `z.discriminatedUnion("role", [...])` | Entrada de registro público para `CLIENT` y `PROFESSIONAL`. |
| `LoginDTO` | schema Zod | Entrada de login. |
| `VerifyCodeDTO` | schema Zod | Entrada de verificación de correo. |
| `ForgotPasswordDTO` | schema Zod | Entrada para solicitar recuperación. |
| `ResetPasswordDTO` | schema Zod | Entrada para restablecer contraseña. |

**Hecho observado:** `RegisterDTO` contiene un discriminador de transporte llamado `role` y el perfil profesional contiene `specialtyId`. El schema excluye `ADMIN` del registro público.

**Riesgo/deuda:** el mismo objeto de registro transporta datos de identidad y datos de perfiles distintos. El contrato de auth conoce detalles de `ClientProfile`, `ProfessionalProfile` y `Specialty`, por lo que no representa únicamente autenticación.

**No confirmado:** el inventario estático no demuestra si el frontend depende de campos adicionales rechazados por estos schemas.

**Implicación modular/DDD:** el contrato de registro cruza más de un posible contexto; actualmente no existe una separación explícita entre comando de identidad y creación de perfil.

### Users y perfiles

Archivos:

- `src/modules/users/users.dto.ts`;
- `src/modules/users/clientprofile/clientprofile.dto.ts`;
- `src/modules/users/professionalprofile/professionalprofile.dto.ts`.

| Contrato | Forma | Uso observado |
|---|---|---|
| `ChangeEmailDTO` | schema Zod | Cambio de email y contraseña actual. |
| `ChangePasswordDTO` | schema Zod | Cambio de contraseña. |
| `UpdateAvatarDTO` | schema Zod | URL de avatar. |
| `UpdateProfileDTO` | schema Zod | Campos comunes de perfil. |
| `UpdateClientProfileSchema` | schema Zod | Actualización de perfil cliente. |
| `UpdateProfessionalProfileSchema` | schema Zod | Actualización de perfil profesional. |
| `CreateSocialLinkSchema` | schema Zod | Creación de red social. |
| `UpdateSocialLinkSchema` | schema Zod | Actualización de URL social. |
| `CreateCertificateSchema` | schema Zod | Creación de certificado. |
| `GetProfessionalProfileParamsSchema` | schema Zod | Param `id` de perfil profesional. |
| `SocialLinkParamsSchema` | schema Zod | Param `id` de red social. |
| `ClientProfileResponseDTO` | interface | Respuesta de perfil cliente para `me`. |
| `PublicProfessionalProfile` | interface | Shape de perfil profesional público. |

**Hecho observado:** `UpdateProfileDTO` y los schemas específicos de cliente/profesional representan campos parcialmente solapados (`name`, `lastName`, `phone`, `description`). `UpdateProfileInput` es una unión entre DTOs de perfil.

**Riesgo/deuda:** la unión permite que `UsersService` reciba un contrato que depende de servicios de perfiles concretos. Además, `UpdateProfileDTO` incluye `description`, aunque ese campo no pertenece al perfil cliente en el schema específico observado.

**No confirmado:** no se encontró evidencia suficiente para afirmar que un cliente pueda persistir `description`; el service delegado y sus validaciones deben considerarse la fuente efectiva.

**Implicación modular/DDD:** `users` funciona como fachada transversal que conoce los contratos internos de varios perfiles. Esto dificulta distinguir el contrato de identidad del contrato de cada perfil.

### Appointments

Archivo: `src/modules/appointments/appointments.dto.ts`.

| Contrato | Forma | Uso observado |
|---|---|---|
| `CreateAppointmentSchema` / `CreateAppointmentDTO` | Zod + `z.infer` | Cita de usuario registrado. |
| `CreateGuestAppointmentSchema` / `CreateGuestAppointmentDTO` | Zod + `z.infer` | Cita de guest. |
| `UpdateAppointmentStatusSchema` / `UpdateAppointmentStatusDTO` | Zod + `z.infer` | Cambio a `CONFIRMED` o `CANCELLED`. |
| `AppointmentResponseDTO` | type alias manual | Shape esperado de respuesta de cita. |

**Hecho observado:** `CreateAppointmentSchema` usa `date` como string `YYYY-MM-DD` y `CreateGuestAppointmentSchema` usa `z.string().datetime()`. `startMin` es múltiplo de 15 en la cita autenticada, pero el schema guest no contiene la misma regla.

**Riesgo/deuda:** dos entradas que representan la misma reserva usan formatos y validaciones temporales distintas. `AppointmentResponseDTO` es un tipo manual, pero el controller devuelve directamente el resultado del service; no se observó un mapper que garantice ese shape.

**No confirmado:** no se puede afirmar que la respuesta real incumpla siempre `AppointmentResponseDTO`; depende de los `include` y `select` concretos de cada consulta Prisma.

**Implicación modular/DDD:** la cita tiene un contrato de transporte rico que incluye servicio, profesional, usuario y cliente. Ese shape no equivale automáticamente a una entidad o agregado de dominio y expone relaciones de persistencia hacia otros contextos.

### Services, specialties y schedules

Archivos:

- `src/modules/services/service.dto.ts`;
- `src/modules/services/service.types.ts`;
- `src/modules/specialty/specialty.dto.ts`;
- `src/modules/schedule/schedule.dto.ts`;
- `src/modules/schedule/schedule.types.ts`.

| Contrato | Forma | Uso observado |
|---|---|---|
| `CreateServiceSchema` / `CreateServiceDTO` | Zod + `z.infer` | Creación de servicio. |
| `UpdateServiceSchema` / `UpdateServiceDTO` | Zod + `z.infer` | Actualización de servicio. |
| `CreateSpecialtySchema` / `CreateSpecialtyDTO` | Zod + `z.infer` | Creación de especialidad. |
| `UpdateSpecialtySchema` / `UpdateSpecialtyDTO` | Zod + `z.infer` | Actualización de especialidad. |
| `CreateScheduleSchema` / `CreateScheduleDTO` | Zod + `z.infer` | Creación de horario. |
| `UpdateScheduleSchema` / `UpdateScheduleDTO` | Zod + `z.infer` | Actualización de horario. |
| `ServiceEntity` | interface | Shape con campos de persistencia del servicio. |
| `ScheduleEntity` | interface | Shape con campos de persistencia del horario. |

**Hecho observado:** `ServiceEntity` y `ScheduleEntity` contienen `id`, timestamps y claves como `profileId`, que son características del modelo persistido. `ServiceEntity.price` usa `Decimal` importado desde `@prisma/client/runtime/library`.

**Riesgo/deuda:** los nombres `Entity` no representan entidades de dominio aisladas de infraestructura; son tipos acoplados a la forma de almacenamiento, especialmente por `Decimal` de Prisma.

**Implicación modular/DDD:** estos tipos no permiten distinguir todavía entre modelo de dominio, registro de persistencia y respuesta HTTP.

### Reviews y notifications

Archivos:

- `src/modules/reviews/reviews.dto.ts`;
- `src/modules/notifications/notifications.types.ts`;
- `src/modules/notifications/notifications.dto.ts`.

**Hecho observado:** `CreateReviewDTO` es un schema Zod para `appointmentId`, `rating` y `comment`. `CreateReviewInput` se deriva del schema. `NotificationType` es un enum TypeScript separado del enum `NotificationType` generado por Prisma. El archivo `notifications.dto.ts` existe, pero está vacío; `reviews.types.ts` también está vacío.

**Riesgo/deuda:** existe duplicación conceptual del enum de notificaciones entre aplicación y persistencia. No existe un DTO de respuesta de notificación ni un contrato de entrada para operaciones de notificación.

**Implicación modular/DDD:** el módulo de notificaciones expone un concepto de infraestructura/persistencia como enum compartido sin un contrato de aplicación claramente definido.

### Config

Archivo: `src/modules/config/config.dto.ts`.

| Contrato | Forma | Uso observado |
|---|---|---|
| `UpdateConfigDTO` | schema Zod | Actualización de preferencias del usuario. |
| `ConfigResponseDTO` | schema Zod | Shape declarado para respuesta de configuración. |
| `ConfigResponse` | `z.infer` | Tipo derivado del response schema. |
| `UpdateConfigInput` | `z.infer` | Tipo de entrada derivado. |

**Hecho observado:** el schema importa `Language`, `Theme` y `LayoutType` desde `@prisma/client`. `preferences` usa `z.record(z.string(), z.any())`; la respuesta usa `z.any().nullable()`. El response schema incluye `id`, `userId`, `createdAt` y `updatedAt`.

**Riesgo/deuda:** el contrato de transporte queda acoplado a enums y shape de persistencia. `preferences` elimina seguridad de tipos justo en una configuración extensible.

**No confirmado:** el inventario no demuestra si todos los campos de `ConfigResponseDTO` se exponen realmente en cada endpoint.

## 2. Interfaces, aliases y enums fuera de Prisma

### Interfaces y aliases localizados

| Archivo | Tipo | Propósito observado |
|---|---|---|
| `auth.types.ts` | `JwtPayload` | Payload esperado del JWT. |
| `auth.types.ts` | `AuthUser` | Usuario autenticado mínimo. |
| `auth.types.ts` | `AuthRequest` | Request Express con `user` obligatorio. |
| `users.types.ts` | `AuthUser` | Segunda representación del usuario autenticado. |
| `users.types.ts` | `ConfigResponse` | Configuración reducida para `MeResponse`. |
| `users.types.ts` | `MeResponse<TProfile>` | Respuesta agregada de `users/me`. |
| `users.types.ts` | `UpdateProfileInput` | Unión de DTOs de perfiles. |
| `clientprofile.dto.ts` | `ClientProfileResponseDTO` | Respuesta de perfil cliente. |
| `professionalprofile.types.ts` | `PublicProfessionalProfile` | Respuesta pública de profesional. |
| `service.types.ts` | `ServiceEntity` | Shape persistente de servicio. |
| `schedule.types.ts` | `ScheduleEntity` | Shape persistente de horario. |
| `config.types.ts` | `UserConfig` | Shape completo de configuración persistida. |

**Hecho observado:** no existe una interfaz de repository ni un port explícito para auth, perfiles, appointments, services, schedules, reviews o notifications. Los services reciben primitivas y tipos Zod, y ejecutan Prisma directamente.

**Riesgo/deuda:** los nombres `Entity`, `Response` e `Input` no tienen una semántica uniforme. Algunos describen persistencia, otros transporte y otros composición de varios modelos.

**No confirmado:** un método estático de service puede ser tratado informalmente como contrato interno, pero no hay una interfaz que lo haga explícito o verificable.

### Enums TypeScript versus enums Prisma

| Concepto | Representaciones observadas |
|---|---|
| Rol | `Role` desde Prisma; `JwtPayload.role` como `string`; `req.user.role` como `Role`; `authorizeRole` recibe `string[]`. |
| Notification type | `NotificationType` de Prisma y enum TypeScript local en `notifications.types.ts`. |
| Social type | `SocialType` de Prisma y unión literal local en `PublicProfessionalProfile`. |
| Configuración | `Language`, `Theme`, `LayoutType` importados desde Prisma en DTOs y tipos. |
| Estado profesional | `ProfessionalStatus` de Prisma usado directamente en `PublicProfessionalProfile`. |

**Implicación:** el mismo concepto puede ser un enum de persistencia, string de transporte o unión literal de presentación según el módulo. Esto complica detectar cambios incompatibles entre capas.

## 3. `req.user` y declaraciones de Express

### Fuentes observadas

1. `src/types/express.d.ts`
2. `src/middlewares/types/express.d.ts`
3. `src/modules/auth/auth.types.ts` — `AuthRequest`
4. `src/modules/users/users.types.ts` — `AuthUser`
5. `src/middlewares/auth.middleware.ts` — interfaz local `JwtPayload`

Ambas declaraciones globales de Express definen esencialmente:

```ts
interface User {
  id: number;
  role: Role;
}

interface Request {
  user?: User;
}
```

**Hecho observado:** el middleware asigna `role: payload.role as any`. Los controllers usan `req.user!` en múltiples lugares, aunque la declaración global lo marca opcional. `AuthRequest` hace `user` obligatorio, pero no es el tipo usado por esos controllers.

**Riesgo/deuda:** hay tres contratos conceptuales para el usuario autenticado y dos declaraciones globales. El non-null assertion desplaza la garantía de autenticación del compilador al orden de middlewares y a la disciplina del controller.

**No confirmado:** la duplicación global puede ser aceptada por TypeScript como declaración acumulativa equivalente; el riesgo comprobable es de mantenimiento y divergencia futura, no necesariamente de compilación actual.

**Implicación modular/DDD:** la identidad autenticada debería ser un contrato transversal estable, pero actualmente depende de `Role` de Prisma y de la forma concreta del middleware.

## 4. Flujo real de objetos entre capas

### Controller → service

| Flujo | Objeto que cruza | Hecho observado |
|---|---|---|
| Auth | body parseado por schemas de auth | El controller entrega datos inferidos/parseados al service de auth. |
| Appointments | `CreateAppointmentDTO`, `CreateGuestAppointmentDTO`, `UpdateAppointmentStatusDTO` | El controller también consulta Prisma directamente para resolver `clientProfileId`. |
| Reviews | `CreateReviewInput` | El controller entrega el resultado de `CreateReviewDTO.parse`. Las consultas usan IDs numéricos convertidos desde params/body. |
| Users | `UpdateProfileInput` | `UsersService` delega a servicios distintos mediante `profileServiceMap`. |
| Services/Specialty/Schedule | objetos parseados por Zod | El service recibe DTOs de entrada, pero la salida es normalmente resultado de Prisma. |
| Config | `UpdateConfigInput` | `preferences` puede contener valores arbitrarios por `any`. |

**Hecho observado:** la validación suele ejecutarse en controllers, pero no existe un wrapper o contrato común para params/query/body. Algunos IDs se convierten con `Number` y se validan manualmente.

**Riesgo/deuda:** el service depende de que el controller haya validado correctamente; el contrato de aplicación no está separado del contrato de transporte.

### Service → Prisma

**Hecho observado:** services importan `prisma` desde `@/core/prisma` y pasan objetos construidos inline a `create`, `update`, `findMany` y transacciones. No hay interfaces de repository ni mappers persistencia-dominio.

Ejemplos observables:

- `UsersService` persiste `User` y `RefreshToken` directamente.
- `ReviewsService` recibe `CreateReviewInput`, crea `Review` y actualiza `ProfessionalProfile` dentro de `Prisma.TransactionClient`.
- `AppointmentService` usa objetos `where` dinámicos tipados como `any` en consultas.
- `ConfigService` opera con el shape de `CustomConfig`.
- `ProfessionalProfileService`, `ServiceService` y `ScheduleService` operan directamente sobre modelos Prisma.

**Riesgo/deuda:** controller/service y persistencia comparten el mismo modelo de datos operacional. Un cambio de Prisma puede propagarse directamente a contratos HTTP y lógica de negocio.

**Implicación modular/DDD:** la persistencia no está detrás de un puerto; las relaciones Prisma pueden convertirse accidentalmente en dependencias de dominio entre módulos.

### Controller → Prisma directo

**Hecho observado confirmado:** `AppointmentsController.create` importa `prisma` y consulta `clientProfile` antes de invocar `AppointmentService.create`. Esto rompe el flujo esperado de controller → aplicación y acopla presentación con persistencia.

## 5. Respuestas HTTP

### Shapes observados

| Forma | Ejemplos |
|---|---|
| Modelo/resultado Prisma directo | Reviews, appointments y varias operaciones de perfiles/catalogo. |
| Objeto manual pequeño | `{ email, isVerified }`, `{ message }`, `{ avatar }`. |
| DTO declarado pero no garantizado | `AppointmentResponseDTO`, `ClientProfileResponseDTO`, `PublicProfessionalProfile`, `ConfigResponseDTO`. |
| Error manual | `{ message: string }`, `{ message, errors }`, `{ message, error }`. |
| Arrays Prisma con `include` | Reviews y consultas de relaciones. |

**Hecho observado:** no existe un envelope de respuesta común, ni una capa de mappers de salida general. Los controllers usan `res.json(value)` con el retorno directo de los services.

**Riesgo/deuda:** el contrato HTTP real queda determinado por la consulta Prisma concreta, incluidos campos y relaciones, en vez de por un response DTO validado o mapeado. Esto puede exponer campos internos o hacer que la respuesta cambie al modificar un `include`.

**No confirmado:** no todos los resultados directos contienen necesariamente información sensible; cada consulta debe evaluarse por modelo e `include`.

**Implicación modular/DDD:** una respuesta HTTP no debería ser una entidad Prisma ni un agregado completo por accidente. El shape actual no marca la frontera entre lectura pública, lectura del propietario y lectura administrativa.

## 6. Errores y contrato de error

### Contratos observados

| Fuente | Respuesta |
|---|---|
| Zod | HTTP 400 con `{ message: "Datos inválidos", errors: err.issues }`. |
| `AppError` | HTTP `statusCode` con `{ message }`. |
| Prisma `P2002` | HTTP 409 con `{ message: "Recurso duplicado" }`. |
| Multer | HTTP 400 con `{ message, error }`. |
| Error inesperado | HTTP 500 con `{ message: "Error interno del servidor" }`. |
| Controllers | Respuestas manuales adicionales con `{ message }`; algunos services lanzan `new Error(...)`. |

**Hecho observado:** `errorHandler` recibe `err: any` y detecta Prisma mediante `err?.code`. `AppError` define `statusCode` e `isOperational`, pero muchos servicios lanzan `Error` estándar con mensajes de negocio.

**Riesgo/deuda:** el contrato de errores no distingue consistentemente validación, autenticación, autorización, not found, conflicto y regla de negocio. El tipo `any` permite que errores de forma desconocida lleguen al handler.

**No confirmado:** no se confirmó que cada `new Error` termine siempre en 500; depende de otros handlers o del middleware de composición no incluido en este punto del inventario.

**Implicación modular/DDD:** los módulos no tienen un lenguaje común de errores de aplicación. Esto dificulta traducir errores de dominio a HTTP sin filtrar detalles internos.

## 7. Usos de `any`

| Ubicación | Contexto | Contrato oculto | Severidad arquitectónica |
|---|---|---|---|
| `src/core/errors/errorHandler.ts` | `err: any` | Error externo que puede ser Zod, Prisma, Multer o desconocido. | P2: oculta el contrato de error central. |
| `src/middlewares/auth.middleware.ts` | `payload.role as any` | Rol proveniente de JWT. | P1: evita verificar que el claim sea un `Role` válido. Está relacionado con autorización. |
| `src/modules/appointments/appointment.worker.ts` | resultado/valor convertido `as any` | Datos del job y/o estado procesado por worker. | P2: contrato entre cola, worker y persistencia no tipado. |
| `src/modules/appointments/appointments.service.ts` | `const where: any = {}` | Filtros dinámicos de consultas de appointments. | P2: permite filtros incompatibles o incompletos en una frontera de autorización/lectura. |
| `src/modules/appointments/appointments.service.ts` | parámetro `appointment: any` | Registro de cita usado por lógica posterior. | P2: la forma depende de un `include` implícito. |
| `src/modules/auth/auth.service.ts` | `catch (err: any)` | Error de operación auth. | P3: pierde precisión en manejo/logging. |
| `src/modules/specialty/ProfessionalSpecialty/professionalSpecialty.controller.ts` | `catch (error: any)` | Error de controller. | P3: contrato de error no uniforme. |
| `src/modules/users/clientprofile/clientprofile.mapper.ts` | `toResponse(profile: any)` | Registro de perfil que debe convertirse a respuesta. | P2: mapper no verifica campos de entrada ni shape de salida en compilación. |
| `src/modules/users/users.service.ts` | `Record<Role, any>` | Mapa de rol a servicio de perfil. | P2: oculta el contrato común que `ClientProfileService`, `ProfessionalProfileService` y `AdminProfileService` deberían cumplir. |
| `src/modules/config/config.dto.ts` | `z.record(..., z.any())` | Preferencias arbitrarias. | P2: contrato de configuración extensible sin límites de tipo. |
| `src/modules/config/config.dto.ts` | `z.any().nullable()` | Preferencias en respuesta. | P2: respuesta sin shape verificable. |
| `src/modules/config/config.types.ts` | `Record<string, any>` | Preferencias persistidas. | P2: el tipo de aplicación replica la falta de contrato. |

**Hecho observado:** no se detectaron decenas de `any` explícitos; el problema se concentra en puntos de integración, por lo que su impacto es mayor que su cantidad.

## 8. Tipos Prisma que funcionan como contratos de otras capas

Se importan tipos o enums de Prisma en:

- `auth.types.ts` para `Role`;
- `users.types.ts` para `Role`, `Language`, `Theme`, `LayoutType`;
- `config.dto.ts` y `config.types.ts` para enums de configuración;
- `professionalprofile.types.ts` para `ProfessionalStatus`;
- `service.types.ts` para `Decimal`;
- `auth.middleware.ts` y declaraciones globales de Express para `Role`.

**Hecho observado:** los enums de Prisma alcanzan middleware, schemas Zod, DTOs, tipos de usuario y respuestas públicas. `ServiceEntity` depende incluso de `Decimal` del runtime de Prisma.

**Riesgo/deuda:** los cambios del schema de persistencia pueden romper compilación en capas que conceptualmente no deberían conocer Prisma. Además, un enum de base de datos se está usando como vocabulario de transporte y autorización.

**No confirmado:** no se encontró un tipo `Prisma.UserGetPayload` exportado explícitamente como alias de DTO; sin embargo, los retornos directos de Prisma producen efectivamente contratos derivados del modelo y sus `include`.

## 9. Contratos compartidos y dependencias entre módulos

### Dependencias de tipos observadas

| Módulo consumidor | Contrato externo | Módulo origen |
|---|---|---|
| `auth` | `Role`, `specialtyId` dentro de registro profesional | Prisma, specialty/profiles implícitos |
| `users` | DTOs de cliente y profesional | `users/clientprofile`, `users/professionalprofile` |
| `appointments` | tipos/resultados de service, professional profile, client profile y guest | Persistencia y módulos relacionados |
| `reviews` | `CreateReviewInput`, `Prisma.TransactionClient` | reviews + infraestructura Prisma |
| `config` | enums Prisma y shape de `CustomConfig` | Prisma |
| middleware | `Role` Prisma, `JwtPayload` local | auth/persistencia |
| profiles públicos | `ProfessionalStatus`, `SocialType` literal | Prisma + presentación |

**Hecho observado:** no hay un paquete o carpeta `shared/contracts`; los contratos se comparten mediante imports directos entre módulos o mediante tipos generados por Prisma.

**Riesgo/deuda:** la dirección de dependencias se define por archivos concretos, no por puertos. Esto permite que un módulo de dominio dependa de otro módulo a través de DTOs, servicios estáticos o modelos Prisma.

**Implicación modular/DDD:** todavía no es posible afirmar que cada contrato represente una frontera de bounded context. La mayoría son contratos técnicos locales a la implementación actual.

## 10. Interfaces que podrían representar puertos, sin asumir que ya lo hacen

Los siguientes elementos tienen forma de contrato potencial, pero actualmente no son ports formales:

| Elemento | Por qué parece un contrato | Qué falta observar |
|---|---|---|
| `AuthRequest` | Expresa el contexto autenticado requerido por una operación. | No es usado de forma general ni separa identidad de autorización. |
| `MeResponse<TProfile>` | Expresa una lectura agregada de usuario, perfil y configuración. | Está acoplado al flujo `users/me` y no delimita ownership/tenant. |
| `PublicProfessionalProfile` | Expresa una vista pública independiente del modelo completo. | Usa enums de Prisma y no se construye mediante mapper confirmado en todos los casos. |
| `AppointmentResponseDTO` | Expresa una vista compuesta de cita. | No se observó validación/mapeo obligatorio antes de responder. |
| `ServiceEntity` / `ScheduleEntity` | Expresan una forma estructurada para servicios y horarios. | Sus nombres sugieren dominio, pero incluyen detalles de persistencia. |
| `profileServiceMap` | Requiere que los servicios de perfil tengan operaciones comunes. | Está tipado como `Record<Role, any>`, sin interfaz verificable. |

Estos elementos se registran como evidencia para futuras decisiones; no se clasifican todavía como ports de arquitectura.

## 11. Hallazgos clasificados

### P1

- **P1-CONTRACT-001 — Rol del JWT convertido mediante `as any`.** El claim que controla autorización no tiene validación estructural antes de asignarse a `req.user`.
- **P1-CONTRACT-002 — Respuestas Prisma sin contrato de salida garantizado en recursos protegidos.** La forma devuelta depende de la consulta y puede incluir relaciones o campos no delimitados por una política de salida.

### P2

- **P2-CONTRACT-001 — Controller con acceso directo a Prisma.** `AppointmentsController.create` resuelve el perfil directamente.
- **P2-CONTRACT-002 — Services acoplados directamente a Prisma.** No existe repository port; los tipos de persistencia cruzan la lógica de aplicación.
- **P2-CONTRACT-003 — Duplicación de `req.user`, `AuthUser`, `JwtPayload` y declaraciones Express.**
- **P2-CONTRACT-004 — Uso de `any` en filtros, mappings, worker, errores y preferencias.**
- **P2-CONTRACT-005 — Tipos llamados `Entity` dependen de Prisma (`Decimal`) o tienen shape de persistencia.**
- **P2-CONTRACT-006 — DTOs de entrada y respuestas no siguen una convención única de nombres, ubicación o validación.**
- **P2-CONTRACT-007 — Enum TypeScript de notificaciones duplicado respecto al enum Prisma.**

### P3

- **P3-CONTRACT-001 — Contratos vacíos o sin uso evidente.** `appointments.types.ts`, `reviews.types.ts`, `specialty.types.ts` y `notifications.dto.ts` están vacíos.
- **P3-CONTRACT-002 — Uso mixto de `Error`, `AppError`, errores Prisma y respuestas manuales.**
- **P3-CONTRACT-003 — Comentarios y nombres de DTO no siempre distinguen schema, tipo inferido, respuesta y entidad.**

No se clasificó ningún hallazgo como P0: este bloque documenta deuda y acoplamiento de contratos; no demuestra por sí solo una ejecución remota o una pérdida de datos.

## 12. Decisiones pendientes que este inventario deja abiertas

Estas preguntas no se resuelven en el baseline:

1. Si los DTOs serán contratos exclusivos de transporte o también comandos de aplicación.
2. Qué información debe pertenecer a una vista pública, una vista del propietario y una vista administrativa.
3. Si los enums de dominio tendrán representación propia o si algunos seguirán usando enums de persistencia.
4. Qué shape mínimo tendrá el contexto autenticado y cómo se separará de roles, memberships y tenant.
5. Qué contratos serán ports de repositories, correo, storage, notificaciones y jobs.
6. Si `preferences` será un documento libre o tendrá un schema/versionado por contexto.
7. Qué errores son de dominio, aplicación, infraestructura o transporte.
8. Qué módulo es propietario de cada contrato compuesto, especialmente `AppointmentResponseDTO` y `MeResponse`.

## Estado del bloque

- Código de `src/`: sin modificar.
- `schema.prisma`: sin modificar.
- Contratos HTTP: sin modificar.
- Documento producido: inventario factual del sistema actual.
- Siguiente revisión: validar si la evidencia y las severidades reflejan correctamente el comportamiento antes de diseñar fronteras o refactors.
