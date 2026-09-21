# Arquitectura objetivo: monolito modular con DDD pragmático

## 1. Propósito

Esta es la guía arquitectónica principal de `app-backend`. Define cómo reorganizar el backend actual sin convertirlo prematuramente en microservicios y sin hacer una reescritura completa.

La decisión arquitectónica es:

> **Monolito modular, organizado por bounded contexts, con capas internas inspiradas en DDD y Clean Architecture.**

DDD no significa crear carpetas llamadas `domain` y `application`. Significa proteger límites de negocio, expresar invariantes en el código y evitar que un módulo conozca los detalles internos de otro.

## 2. Diagnóstico del backend actual

El backend actual ya tiene una primera separación por funcionalidad en `src/modules`, pero no tiene límites internos consistentes:

```text
src/modules/
  auth/
  users/
  appointments/
  notifications/
  reviews/
  schedule/
  services/
  specialty/
  admin/
  config/
```

Problemas observados:

- Prisma se usa directamente desde muchos servicios.
- Las clases estáticas funcionan como servicios, casos de uso, repositorios y mappers al mismo tiempo.
- `AppointmentService` mezcla disponibilidad, persistencia, transición de estados, consultas y notificaciones.
- `AuthService` mezcla registro, perfiles, configuración, tokens, correo y notificaciones.
- `UsersService` mezcla cuentas, perfiles, almacenamiento de avatares y despacho por rol.
- Los DTOs Zod, tipos de dominio y tipos de respuesta no tienen una convención única.
- Existen `any` en contratos importantes como `Record<Role, any>` y filtros dinámicos.
- Hay dos declaraciones de tipos para Express: `src/types/express.d.ts` y `src/middlewares/types/express.d.ts`.
- La autenticación solo contiene `userId` y `role`; todavía no existe contexto de tenant.
- El esquema Prisma aún no contiene `Tenant` ni membresías.
- Los efectos secundarios se ejecutan directamente después de operaciones de persistencia y pueden fallar de forma independiente.

La meta del refactor es corregir estos problemas gradualmente, no cambiar todos los imports y carpetas en una sola iteración.

## 3. Bounded contexts reales del producto

Los siguientes contextos se derivan del código y del esquema Prisma actuales:

| Contexto | Responsabilidad | Modelos principales actuales |
|---|---|---|
| Identity & Access | cuentas, credenciales, verificación y sesiones | `User`, `VerificationAttempt`, `PasswordReset`, `RefreshToken` |
| Tenancy | organización, plan, membresía y contexto de aislamiento | pendiente: `Tenant`, `TenantMembership` |
| Profiles | información de clientes, profesionales y administradores | `ClientProfile`, `ProfessionalProfile`, `AdminProfile` |
| Catalog | especialidades y servicios ofrecidos | `Specialty`, `ProfessionalSpecialty`, `Service` |
| Scheduling | horarios y disponibilidad | `Schedule` |
| Appointments | ciclo de vida de una cita y clientes invitados | `Appointment`, `GuestClient` |
| Notifications | notificaciones persistidas y entrega por canales | `Notification` |
| Reviews | reseñas y cálculo de reputación | `Review`, `ProfessionalProfile.ratingAvg` |
| Preferences | configuración personal del usuario | `CustomConfig` |
| Administration | revisión, aprobación y suspensión de recursos | operaciones sobre perfiles y especialidades |

### Decisiones de límites

- `users` actual debe dividirse conceptualmente en `profiles` e `identity`; no se debe mantener como un módulo que resuelva todas las cuentas y perfiles.
- `services` y `specialty` pertenecen al contexto `catalog`.
- `schedule` pertenece a `scheduling`, aunque `appointments` puede consumir su contrato de disponibilidad.
- `admin` es una superficie de aplicación administrativa, no necesariamente un dominio independiente. Sus casos de uso deben vivir junto al contexto que modifican o en una fachada administrativa explícita.
- `config` debe convertirse en `preferences`.
- `notifications` no debe conocer las reglas completas de citas; debe reaccionar a eventos o recibir comandos con contratos explícitos.

## 4. Estructura objetivo

La estructura recomendada es module-first:

```text
src/
  modules/
    identity/
      domain/
        entities/
        value-objects/
        repositories/
      application/
        use-cases/
        dto/
        ports/
      infrastructure/
        persistence/
        crypto/
        mail/
      presentation/
        http/
          controllers/
          routes/
          schemas/

    tenancy/
    profiles/
    catalog/
    scheduling/
    appointments/
    notifications/
    reviews/
    preferences/

  shared/
    errors/
    config/
    database/
    logging/
    http/
    types/
```

No se deben crear de inicio todas las carpetas vacías. Cada módulo se migra cuando se trabaja en él.

### Regla de pertenencia

Todo archivo debe pertenecer a un contexto. Si una función no puede asignarse claramente a un contexto, primero se debe aclarar su responsabilidad; no se debe colocar automáticamente en `shared`.

## 5. Capas internas de cada módulo

### `domain`

Contiene reglas e invariantes del negocio:

- entidades;
- value objects;
- servicios de dominio;
- eventos de dominio;
- interfaces de repositorio.

No puede importar Express, Prisma, Zod, BullMQ, Nodemailer ni filesystem.

### `application`

Contiene casos de uso:

- coordina repositorios;
- inicia transacciones mediante una abstracción;
- valida permisos de negocio;
- publica eventos o solicita efectos externos mediante ports;
- devuelve resultados de aplicación.

No puede depender de `Request`, `Response` ni de modelos Prisma.

### `infrastructure`

Implementa detalles técnicos:

- repositorios Prisma;
- hash y JWT;
- correo;
- almacenamiento;
- colas;
- mappers entre Prisma y dominio.

La infraestructura depende de contratos del dominio o application, nunca al contrario.

### `presentation`

Contiene HTTP:

- rutas;
- controllers;
- schemas Zod;
- serializadores de respuesta;
- middlewares específicos del módulo.

Un controller solo debe validar, construir el input del caso de uso y responder.

## 6. Reglas de dependencia

```text
presentation -> application -> domain
infrastructure -> application/domain
shared -> no depende de modules
domain -> no depende de infrastructure
```

está bien como regla general, pero hay que tener cuidado con shared.

No debería terminar ocurriendo esto:
```
shared/
├── errors/
├── database/
├── http/
├── events/
├── appointment/
├── user/
├── notification/
└── ...
```

porque entonces simplemente habrás creado otro monolito dentro de shared

La regla debería ser:

shared = infraestructura/transversales realmente comunes

Reglas obligatorias:

- un controller no consulta Prisma;
- un controller no contiene reglas de negocio;
- una entidad de dominio no conoce el modelo generado por Prisma;
- un módulo no importa el repositorio interno de otro módulo;
- los modelos Prisma no son contratos de API;
- `shared` no puede convertirse en un segundo `modules`;
- los accesos entre módulos ocurren mediante casos de uso públicos, ports o eventos.

## 7. Comunicación entre contextos

### Llamada síncrona

Se utiliza cuando el caso de uso necesita una respuesta inmediata. Ejemplo: `appointments` consulta si un servicio está activo y pertenece al profesional.

Debe consumirse una interfaz pública:

```ts
export interface ServiceCatalog {
  getBookableService(
    serviceId: number,
    professionalId: number,
    tenantId: number,
  ): Promise<BookableService | null>;
}
```

No se debe importar `ServiceRepository` desde `appointments`.

### Evento de dominio o de aplicación

Se utiliza para efectos que no deben bloquear la transacción principal:

```text
AppointmentConfirmed
AppointmentCancelled
ProfessionalProfileApproved
UserRegistered
```

`notifications` puede suscribirse a estos eventos sin que `appointments` conozca su implementación.

Mientras no exista un bus formal, se puede comenzar con un `EventPublisher` interno. La cola BullMQ se incorpora después como adaptador, no como dependencia del dominio.

## 8. Agregados iniciales

Los agregados son límites transaccionales, no copias de cada tabla:

### Identity

Agregado `UserAccount`:

- `User`;
- credenciales;
- estado de verificación;
- sesiones/refresh tokens mediante servicios de aplicación.

No debe crear directamente un `ProfessionalProfile` dentro de su entidad.

### Professional Profile

Agregado `ProfessionalProfile`:

- datos públicos;
- especialidades asignadas;
- certificados;
- enlaces sociales;
- estado de verificación.

La aprobación debe ser un caso de uso con reglas explícitas.

### Service Catalog

Agregado `Service`:

- nombre;
- duración;
- precio;
- profesional propietario;
- especialidad;
- estado activo.

### Appointment

Agregado `Appointment`:

- cliente registrado o invitado;
- servicio;
- profesional;
- fecha y slot;
- estado;
- pago;
- transiciones permitidas.

La disponibilidad es una política de dominio/aplicación, no una utilidad aislada sin contexto.

### Notification

Agregado `Notification`:

- destinatario;
- tipo;
- mensaje;
- estado de lectura;
- referencia opcional al evento de negocio.

## 9. Tenancy dentro del monolito modular

Tenancy es un contexto transversal y también un dominio propio. No se debe resolver agregando filtros manuales en cada controller.

### Objetivo inicial

Usar shared schema de PostgreSQL con aislamiento lógico:

```text
Tenant
TenantMembership
tenantId en cada agregado tenant-owned
```

### Propiedad de datos

Datos potencialmente globales:

- configuración técnica de la plataforma;
- catálogos globales, si el negocio los comparte.

Datos tenant-owned:

- perfiles;
- servicios;
- horarios;
- citas;
- invitados;
- notificaciones;
- reseñas;
- preferencias, según decisión de negocio.

La decisión debe documentarse por modelo antes de migrar el esquema.

### Contexto de ejecución

Cada operación protegida debe recibir un `TenantContext`:

```ts
export type TenantContext = {
  tenantId: number;
  userId: number;
  role: string;
};
```

El contexto debe resolverse en middleware y pasar explícitamente al caso de uso. No usar una variable global mutable para el tenant.

### Repositorios tenant-aware

Un repositorio tenant-owned debe exigir `tenantId` en sus métodos. Un filtro opcional no es aceptable:

```ts
findById(id: number, tenantId: number): Promise<AppointmentEntity | null>;
```

La aplicación debe rechazar un contexto ausente antes de acceder a datos tenant-owned.

## 10. DTOs, tipos e interfaces

Convención obligatoria:

```text
CreateAppointmentSchema  -> schema Zod
CreateAppointmentDto     -> tipo inferido del schema
AppointmentEntity        -> entidad de dominio
AppointmentRepository    -> interfaz del dominio
PrismaAppointmentRepository -> implementación de infraestructura
AppointmentResponse      -> contrato de salida HTTP
```

Evitar:

- usar `DTO` tanto para schema como para tipo;
- duplicar una interfaz de Prisma como tipo de respuesta;
- `any` para puentes entre módulos;
- tipos Express mezclados con tipos de dominio;
- exportar modelos Prisma desde application.

## 11. Transacciones y side effects

La creación o cambio de estado de una cita debe seguir este orden:

1. caso de uso valida el contexto y permisos;
2. repositorios validan disponibilidad y estado;
3. se confirma la transacción principal;
4. se publica un evento;
5. notification/mail/queue procesa el efecto secundario.

No se debe considerar exitosa una operación porque se creó la cita si el código responde error por una notificación fallida. El contrato debe definir si la notificación es crítica o eventual.

Para garantizar entrega después de commit, el siguiente paso recomendado es un outbox transaccional. Antes de implementarlo, no ocultar errores con `try/catch` silenciosos.

## 12. Estrategia de migración

La ejecución detallada, fase por fase, está en [REFACTOR_PHASES.md](REFACTOR_PHASES.md). Ese documento es la referencia para solicitar revisiones parciales al Code Reviewer.

### Fase 0: reglas y límites

- aprobar esta estructura;
- eliminar ambigüedad entre `users`, `profiles`, `services` y `specialties`;
- definir catálogo global versus tenant-owned;
- consolidar el tipo Express en un único archivo.

### Fase 1: foundation

- `AppError` y errores de dominio tipados;
- configuración validada;
- `TenantContext`;
- convenciones de DTO;
- interfaz de transacción;
- repositorio base solo si no oculta la semántica del agregado.

### Fase 2: Identity y Profiles

- separar autenticación de creación de perfiles;
- crear repositorios de identidad;
- reemplazar `profileServiceMap: Record<Role, any>`;
- incorporar membresía de tenant;
- migrar claims y autorización.

### Fase 3: Catalog y Scheduling

- agrupar `services`, `specialty` y `ProfessionalSpecialty` bajo `catalog`;
- extraer horarios y disponibilidad;
- hacer todas las queries tenant-aware.

### Fase 4: Appointments

- extraer `CreateAppointment`, `ConfirmAppointment`, `CancelAppointment` y consultas;
- crear `AppointmentRepository`;
- crear política de disponibilidad;
- publicar eventos de cita;
- eliminar includes Prisma repetidos mediante mappers y read models.

### Fase 5: Notifications, Reviews y Preferences

- convertir notificaciones en consumidores de eventos;
- separar reseñas de la agregación de rating;
- separar preferencias de identidad;
- revisar permisos y tenant isolation.

### Fase 6: endurecimiento

- pruebas de aislamiento por tenant;
- pruebas de transición de estados;
- outbox;
- observabilidad con tenant;
- revisión de índices y concurrencia.

## 13. Criterios de aceptación arquitectónicos

Un módulo se considera migrado cuando:

- tiene límites de contexto documentados;
- sus controllers no acceden a Prisma;
- sus casos de uso no dependen de Express;
- sus reglas principales no dependen de Prisma;
- tiene repositorios con contratos explícitos;
- los DTOs siguen la convención;
- no utiliza `any` en contratos;
- las queries tenant-owned requieren contexto;
- los efectos secundarios no rompen silenciosamente la operación principal;
- existen pruebas para sus invariantes principales.

## 14. Qué no hacer

- No crear microservicios todavía.
- No mover todos los archivos de una vez solo para cambiar carpetas.
- No crear una entidad para cada tabla sin identificar agregados.
- No crear un `BaseService` o `BaseRepository` genérico que esconda reglas del dominio.
- No introducir un `shared` con lógica específica de citas o usuarios.
- No añadir `tenantId` parcialmente sin definir propiedad y aislamiento de cada modelo.

## 15. Relaciones de persistencia vs dependencias de dominio

Las relaciones definidas en Prisma representan relaciones de datos, pero no determinan automáticamente los límites de los agregados ni las dependencias entre bounded contexts.

Por ejemplo, `Appointment` puede tener una relación de persistencia con `ProfessionalProfile`, `Service` y `ClientProfile`:

```text
Appointment
├── professionalProfileId
├── serviceId
└── clientProfileId
```

Esto no significa que el módulo `appointments` deba importar las entidades, repositorios o servicios internos de `profiles` o `catalog`.

La dependencia de dominio debe expresarse mediante identificadores, contratos públicos o ports:

```text
appointments
├── professionalId
├── serviceId
└── clientId
```

Cuando se necesita información adicional de otro contexto, se utiliza un contrato explícito:

```text
Appointments
      │
      ├── CatalogReader
      │
      └── AvailabilityReader
```

y no:

```text
Appointments
      │
      ├── ServiceRepository
      ├── ProfessionalRepository
      └── ScheduleRepository
```

Por lo tanto:

> **Una relación entre tablas no implica una dependencia entre bounded contexts.**

Los `include` de Prisma tampoco deben determinar la estructura del dominio. Los mappers y read models pueden construir los datos necesarios para cada caso de uso sin exponer modelos Prisma entre módulos.

Los agregados deben definirse por invariantes y límites transaccionales, no por las relaciones declaradas en el schema.
