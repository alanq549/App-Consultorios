# Roadmap de refactor: monolito modular + DDD

## Objetivo

Refactorizar el backend actual por incrementos pequeños, manteniendo las rutas existentes mientras se introducen límites de dominio, casos de uso, repositorios y tenancy.

La definición operativa de cada fase, sus criterios de aceptación y las plantillas de revisión están en [REFACTOR_PHASES.md](REFACTOR_PHASES.md).

## Regla de ejecución

Cada fase debe:

1. conservar el contrato HTTP salvo que exista una razón documentada;
2. introducir una capa nueva detrás del código actual;
3. migrar un caso de uso completo;
4. eliminar la duplicación que quedó obsoleta;
5. validar typecheck/build y pruebas disponibles;
6. documentar riesgos antes de pasar al siguiente módulo.

No se debe iniciar el siguiente contexto si el anterior dejó dos implementaciones activas para la misma regla.

## Fase 0: baseline

### Entregables

- inventario de rutas y permisos;
- inventario de queries Prisma;
- inventario de DTOs y tipos;
- errores tipados;
- una sola declaración de `Express.Request.user`;
- decisión documentada sobre `ADMIN` de plataforma frente a administrador de tenant.

### Criterios

- el build actual funciona;
- cada endpoint tiene módulo propietario;
- se identifican queries que necesitarán `tenantId`.

## Fase 1: shared kernel mínimo

Crear únicamente componentes realmente transversales:

```text
src/shared/
  errors/
  events/
  types/
  config/
  database/
```

No mover lógica de negocio a `shared`.

### Componentes

- `DomainError` y errores HTTP separados;
- `TenantContext`;
- `Result` solo si se adopta de forma uniforme;
- `EventPublisher` como port;
- configuración validada al arrancar;
- contrato de transacción.

## Fase 2: Identity

### Casos de uso

- `RegisterUser`;
- `Login`;
- `VerifyUser`;
- `RefreshSession`;
- `RequestPasswordReset`;
- `ResetPassword`;
- `ChangePassword`;
- `ChangeEmail`.

### Separaciones

- `UserAccountRepository`;
- `SessionRepository`;
- `VerificationRepository`;
- `PasswordService`;
- `TokenService`;
- `MailPort`.

### Problema actual a resolver

El registro actualmente crea cuenta, perfil, configuración, token y notificación en un único servicio. El caso de uso debe coordinar estas operaciones sin hacer que la entidad de identidad conozca detalles internos de perfiles.

## Fase 3: Tenancy y autorización

### Modelo objetivo mínimo

```text
Tenant
TenantMembership
User
```

La membresía debe contener el rol dentro del tenant. No asumir que `User.role` global resuelve autorización SaaS.

### Trabajo

- resolver tenant por host o contexto autenticado;
- verificar pertenencia;
- incluir contexto en casos de uso;
- agregar `tenantId` según matriz de propiedad de datos;
- hacer que repositorios tenant-owned exijan tenant.

### Criterio de bloqueo

No migrar citas ni catálogo a SaaS si existe cualquier query tenant-owned que pueda ejecutarse sin contexto.

## Fase 4: Profiles

### Dividir `users`

```text
profiles/
  client/
  professional/
  admin/
identity/
```

### Casos iniciales

- `GetCurrentUser`;
- `UpdateClientProfile`;
- `UpdateProfessionalProfile`;
- `UpdateAvatar`;
- `GetPublicProfessionalProfile`;
- `ReviewProfessionalProfile`.

### Reglas

- almacenamiento de avatar detrás de `StoragePort`;
- respuestas públicas mediante mappers;
- `profileServiceMap` no debe utilizar `any`;
- administración de perfil debe validar tenant y autorización.

## Fase 5: Catalog

Unificar `services`, `specialty` y `ProfessionalSpecialty` bajo `catalog`.

### Casos

- `CreateService`;
- `UpdateService`;
- `DeactivateService`;
- `RequestProfessionalSpecialty`;
- `ApproveProfessionalSpecialty`;
- `ListPublicCatalog`.

### Contrato para appointments

`appointments` solo consume `CatalogReader.getBookableService(...)`; no accede a `prisma.service` directamente.

## Fase 6: Scheduling

### Casos

- `CreateSchedule`;
- `UpdateSchedule`;
- `GetAvailability`;
- `ValidateBookableSlot`.

### Riesgo técnico

La validación previa de solapamiento no basta ante concurrencia. Debe existir una estrategia de protección en DB o una transacción con locking/constraint compatible con el modelo de slots.

## Fase 7: Appointments

### Dividir el servicio actual

```text
CreateAppointment
ConfirmAppointment
CancelAppointment
CompleteAppointment
GetUpcomingAppointments
GetAppointmentHistory
```

### Dependencias permitidas

- `CatalogReader`;
- `AvailabilityReader`;
- `AppointmentRepository`;
- `EventPublisher`.

### No permitido

- llamar directamente a `NotificationService`;
- repetir includes Prisma en cada caso;
- filtrar fechas en memoria cuando la consulta pueda expresarse en DB;
- usar `where: any`.

## Fase 8: Notifications

### Separación

- `NotificationRepository`;
- `NotificationApplicationService`;
- `NotificationChannel`;
- handlers de eventos de negocio.

Ejemplo:

```text
AppointmentConfirmed
  -> AppointmentNotificationHandler
  -> NotificationRepository
  -> EmailChannel opcional
```

La notificación debe ser eventual si no es parte de la transacción principal.

## Fase 9: Reviews y Preferences

### Reviews

- validar elegibilidad por cita;
- evitar que cualquier usuario cree reseñas;
- separar actualización de rating;
- manejar notificación mediante evento.

### Preferences

- extraer `CustomConfig` de la lógica de cuenta;
- crear `GetPreferences` y `UpdatePreferences`;
- aplicar aislamiento si las preferencias son tenant-owned.

## Fase 10: Operación SaaS

- outbox transaccional;
- jobs con `tenantId` obligatorio;
- storage con prefijo tenant;
- logs y métricas con tenant;
- límites por plan;
- backups y restauración;
- pruebas de aislamiento automatizadas.

## Checklist por pull request

### Arquitectura

- [ ] el cambio tiene un módulo propietario;
- [ ] no crea una dependencia circular;
- [ ] no introduce lógica de dominio en `shared`;
- [ ] no expone Prisma fuera de infrastructure.

### Seguridad

- [ ] se valida autenticación;
- [ ] se valida pertenencia al tenant;
- [ ] se valida autorización de acción;
- [ ] no se confía en un `tenantId` enviado por el cliente sin verificarlo.

### Calidad

- [ ] no se agrega `any`;
- [ ] schema y tipo siguen la convención;
- [ ] el caso de uso tiene un contrato claro;
- [ ] los efectos secundarios tienen política de error;
- [ ] se agregan o actualizan pruebas del comportamiento cambiado.

## Orden recomendado

```text
Baseline
  -> Shared kernel
  -> Identity
  -> Tenancy
  -> Profiles
  -> Catalog
  -> Scheduling
  -> Appointments
  -> Notifications
  -> Reviews/Preferences
  -> Operación SaaS
```

Este orden reduce el riesgo porque identidad y tenancy establecen el contexto que necesitan todos los módulos posteriores.
