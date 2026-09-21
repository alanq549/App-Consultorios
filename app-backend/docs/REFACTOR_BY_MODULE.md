# Refactor por Módulo — Backend

## Objetivo

Esta guía define cómo refactorizar cada módulo del backend para que deje de ser un conjunto de servicios funcionales y pase a una arquitectura limpia, mantenible y preparada para SaaS.

## Principio general

Cada módulo debe seguir esta estructura:
- routes
- controller
- use-case
- service
- repository
- dto
- types
- constants
- mapper o adapter si aplica

---

## 1. Módulo Auth

### Estado actual

El módulo auth mixa:
- creación de usuarios
- creación de perfiles
- crear config del usuario
- validación de cuenta
- generación de tokens
- envio de email
- creación de notificaciones
- refresh token rotation

### Problemas

- `AuthService` hace demasiadas cosas
- side effects dentro del servicio
- no hay layer de repositorio
- no hay tenantId en JWT
- validación de negocio y infraestructura mezcladas

### Objetivo de refactor

Separar en:
- `AuthController`
- `AuthUseCase` / `RegisterUserUseCase`, `LoginUseCase`, `VerifyUserUseCase`
- `AuthService` (solo lógica de sesión/token)
- `UserRepository`
- `VerificationRepository`
- `TokenService`
- `EmailService`
- `NotificationService`

### Contenido esperado

```ts
export class RegisterUserUseCase {
  constructor(
    private readonly userRepository: UserRepository,
    private readonly profileFactory: ProfileFactory,
    private readonly tokenService: TokenService,
    private readonly emailService: EmailService,
    private readonly notificationService: NotificationService,
  ) {}

  async execute(input: RegisterUserDto, tenantId: number) {
    // transacción / validación / creación / email / notificación
  }
}
```

### Reglas concretas

- `AuthController` solo recibe request y delega
- `AuthService` no debe crear perfiles ni enviar emails
- `tokenService` debe encapsular generación y hash
- `emailService` debe manejar envío de verificación y contraseña
- `UserRepository` debe crear user + tenant membership si aplica

---

## 2. Módulo Users

### Estado actual

El módulo users tiene:
- `UsersService` con métodos de perfil, email, password, avatar
- mapeo de roles a servicio de perfil
- `profileServiceMap: Record<Role, any>`
- validación de perfil en varios módulos
- actualización de avatar modificando filesystem

### Problemas

- `any` en mapa de perfil
- `UsersService` está haciendo varias responsabilidades
- avatar storage es infraestructura mezclada con negocio
- no hay repositorio para perfiles ni usuarios
- los tipos y DTOs son inconsistentes

### Objetivo de refactor

Separar por perfiles:
- `ClientProfileService`
- `ProfessionalProfileService`
- `AdminProfileService`
- `UserAccountService`
- `AvatarStorageService`
- `UserRepository`

### Regla

El servicio principal `UsersService` no debe entender la lógica de cada perfil. 
Debe ser un orchestrator o un use-case dispatcher.

### Estructura sugerida

```ts
export class UpdateProfileUseCase {
  constructor(
    private readonly userRepository: UserRepository,
    private readonly profileServiceFactory: ProfileServiceFactory,
  ) {}

  async execute(userId: number, role: Role, data: UpdateProfileDto) {
    const profileService = this.profileServiceFactory.get(role);
    return profileService.update(userId, data);
  }
}
```

### Reglas específicas

- avatar update debe pasar por `StorageService`
- cambio de email/password no debe ir junto a perfil
- cada tipo de perfil debe tener su propia validación y respuesta

---

## 3. Módulo Appointments

### Estado actual

`AppointmentService` hace:
- validación de disponibilidad
- validación de overlaps
- validación de schedule
- lookup de servicio
- crear guest
- crear appointment
- enviar notificaciones
- mapear DTO
- filtrar próximas o históricas

### Problemas

- God service
- demasiada lógica de dominio y side effects en una sola clase
- validación de reglas de negocio en la misma entidad que persistencia
- mapas repetidos
- no hay repositorio de citas, schedule, service

### Objetivo de refactor

Dividir en:
- `AppointmentRepository`
- `ScheduleService` / `AvailabilityService`
- `AppointmentBookingUseCase`
- `AppointmentStatusUseCase`
- `AppointmentQueryService`
- `NotificationService` separado

### Casos de uso recomendados

- `CreateAppointmentUseCase`
- `CancelAppointmentUseCase`
- `ConfirmAppointmentUseCase`
- `GetAvailabilityUseCase`
- `GetUserAppointmentsUseCase`

### Reglas concretas

- `validateSchedule` y `validateOverlap` deben ir a un dominio/service dedicado
- `mapToDTO` debe ir a un mapper o adapter
- notificaciones deben ocurrir en un orchestrator o evento post-commit
- `guestClient` debe manejarse como entidad separada o un mini servicio

---

## 4. Módulo Notifications

### Estado actual

`NotificationService` crea notificaciones para muchos eventos, quizá demasiado amplio y con lógica muy específica de negocio.

### Problemas

- mezcla de varios tipos de eventos
- no se usa un patrón de evento/handler
- no hay diferenciación entre notificación de usuario y notificación del sistema
- no hay abstracción para canales

### Objetivo de refactor

- `NotificationRepository`
- `NotificationSender` o `NotificationChannel`
- `NotificationDomainService`
- `NotificationUseCase` por evento

### Ejemplo

```ts
export interface NotificationChannel {
  send(userId: number, payload: NotificationPayload): Promise<void>;
}
```

### Reglas concretas

- `createNotification` debe ser un repositorio
- `notifyWelcome`, `notifyProfileApproved`, etc. deben delegar a un use-case o a un servicio específico de eventos
- el servicio debe producir eventos o enviar a canales, no concatenar toda la lógica en un solo archivo

---

## 5. Módulo Config

### Estado actual

`ConfigService` es funcional pero muy básico. No parece haber un problema grave, pero debe seguir la misma disciplina.

### Objetivo

- `UserConfigRepository`
- `GetUserConfigUseCase`
- `UpdateUserConfigUseCase`
- `UserConfigDto` con estructura clara

### Reglas

- si `customConfig` existe por usuario, no permitir acceso cruzado a tenant
- cada update debe validarse contra tenant actual

---

## 6. Módulo Services / Schedules / Especialties / Reviews / Admin

### Reglas comunes

Estos módulos deberían seguir el mismo patrón:
- controller
- use-case
- service/repository
- dto
- mapper
- types

### Aplicación concreta

#### Services
- `ServiceRepository`
- `ServiceDomainService`
- `CreateServiceUseCase`
- `UpdateServiceUseCase`

#### Schedules
- `ScheduleRepository`
- `ScheduleValidationService`
- `CreateScheduleUseCase`
- `GetAvailabilityUseCase`

#### Specialty
- `SpecialtyRepository`
- `RequestSpecialtyUseCase`
- `ApproveSpecialtyUseCase`

#### Reviews
- `ReviewRepository`
- `CreateReviewUseCase`
- `ReviewAggregationService`

#### Admin
- `AdminController` y `AdminUseCases` para approvals, suspensions, reporting
- no mezclar administración con negocio del cliente

---

## Reglas de refactor técnico

### 1. Eliminar `any`

Revisar cualquier `Record<Role, any>`, `where: any`, `const obj: any`, etc.

### 2. Unificar nombres de archivos

Mantener una convención:
- `*.controller.ts`
- `*.use-case.ts`
- `*.service.ts`
- `*.repository.ts`
- `*.dto.ts`
- `*.types.ts`

### 3. Unificar namespacing

Usar esta estructura:
- `src/modules/auth/...`
- `src/modules/users/...`
- `src/modules/appointments/...`

No mezclar carpetas de perfiles dentro de `users` con lógicas de servicios del módulo separado si es posible. 

### 4. Eliminar file duplication

Revisar módulos que vuelven a definir DTOs redundantes, mappers duplicados o validaciones similares.

---

## Plan de implementación por módulo

### Fase 1 — Core foundation
- tenant context
- error handling
- app config
- base repository
- DTO standards

### Fase 2 — Auth & users
- reformar AuthUseCases
- crear UserRepository
- armonizar profile services
- depurar DTOs

### Fase 3 — Appointments & notifications
- separar availability validation
- crear AppointmentRepository
- mover notificaciones fuera del servicio
- crear mapper central

### Fase 4 — Admin / reviews / config / services
- revisar permisos y tenant-aware queries
- normalizar respuestas
- añadir validación estructural

---

## Reglas de calidad pendientes

Antes de cerrar una tarea de refactor, revisa:
- [ ] no hay `any` en lógica de negocio
- [ ] no hay Prisma directo en controller
- [ ] no hay side effects en dominio
- [ ] cada repo tiene contrato claro
- [ ] DTO name + schema name es consistente
- [ ] tenantId se considera en todas las queries
- [ ] endpoints usan middleware de auth + tenant
- [ ] la estructura del módulo es parecida en todos los casos

---

## Conclusión

El gran problema del backend no es solo que haya funciones repetidas. El problema es que la lógica de negocio, los side effects, el acceso a BD, la validación y el transporte HTTP están mezclados. Eso es lo que debe corregirse primero.

La meta no es “refactorizar todo a la vez”, sino crear una base sólida por módulo para luego migrar a SaaS sin reescrituras masivas.
