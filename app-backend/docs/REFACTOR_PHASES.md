# Fases ejecutables y protocolo de revisión

## Propósito

Este documento divide el refactor del backend en fases pequeñas y revisables. Cada fase debe implementarse y revisarse por separado antes de iniciar la siguiente.

El objetivo no es reescribir el backend completo, sino migrarlo gradualmente desde la estructura actual hacia un monolito modular con DDD pragmático y preparación para SaaS.

## Cómo trabajar con Code Reviewer

Para cada fase:

1. Implementar únicamente el alcance de la fase.
2. No mezclar cambios de fases posteriores.
3. Ejecutar las validaciones indicadas.
4. Entregar al reviewer:
   - resumen de cambios;
   - archivos modificados;
   - decisiones tomadas;
   - comandos ejecutados;
   - resultados de pruebas;
   - dudas o deuda técnica conocida.
5. Code Reviewer evalúa los criterios de aceptación.
6. La fase queda `APPROVED`, `CHANGES_REQUESTED` o `BLOCKED`.

No se debe iniciar la siguiente fase con la anterior en estado `CHANGES_REQUESTED` o `BLOCKED`, salvo autorización explícita.

## Estados de revisión

### APPROVED

La fase cumple el alcance, no introduce regresiones conocidas y puede usarse como base para la siguiente.

### CHANGES_REQUESTED

Hay problemas corregibles sin cambiar el diseño de la fase. Se deben atender los hallazgos antes de continuar.

### BLOCKED

Existe una decisión arquitectónica pendiente, riesgo de seguridad, regresión crítica o dependencia que impide continuar.

## Reglas generales para todas las fases

- No hacer cambios masivos sin una razón documentada.
- No modificar contratos HTTP sin registrar compatibilidad o migración.
- No agregar microservicios.
- No agregar un framework nuevo para resolver problemas de organización.
- No usar `any` para evitar diseñar un contrato.
- No mover archivos sin clasificar antes su responsabilidad.
- No aplicar tenancy parcialmente a una operación y dejar otra ruta equivalente sin aislamiento.
- No ocultar errores con `catch` vacíos o fallbacks silenciosos.
- Cada fase debe dejar el proyecto compilable.

---

## Fase 0 — Baseline y límites del sistema

### Objetivo

Establecer una fotografía confiable del backend actual antes de modificar su arquitectura.

### Alcance

- inventario de rutas;
- inventario de middleware;
- inventario de servicios y métodos;
- inventario de DTOs, tipos e interfaces;
- inventario de queries Prisma;
- mapa de roles y permisos actuales;
- identificación de módulos propietarios de cada endpoint.

### No hacer todavía

- no crear `Tenant`;
- no mover todos los archivos;
- no refactorizar servicios;
- no cambiar el contrato de autenticación.

### Entregables

- matriz de endpoints;
- matriz de módulos y modelos;
- lista de duplicaciones;
- lista de riesgos conocidos;
- decisión sobre el significado de `ADMIN`.

### Criterios de aceptación

- [ ] cada ruta tiene un módulo propietario;
- [ ] cada ruta tiene middleware de autenticación y autorización identificado;
- [ ] cada modelo Prisma tiene un contexto propietario;
- [ ] se conocen los puntos de acceso directo a Prisma;
- [ ] se conocen los usos de `any`;
- [ ] se conocen los side effects por módulo.

### Evidencia para Code Reviewer

- tabla o documento con endpoints;
- salida de búsqueda de `prisma.`;
- salida de búsqueda de `any`;
- lista de módulos modificados, si hubo cambios.

### Riesgos que debe buscar el reviewer

- inventario incompleto;
- endpoints administrativos sin autorización;
- modelos asignados a más de un contexto sin contrato;
- confusión entre rol global y rol dentro de tenant.

---

## Fase 1 — Shared kernel mínimo y estándares

### Objetivo

Crear únicamente las piezas transversales que todos los módulos necesitan.

### Alcance

Crear o consolidar:

```text
src/shared/
  errors/
  config/
  events/
  types/
  database/
```

Además:

- un único tipo de usuario autenticado en Express;
- errores de dominio diferenciados de errores HTTP;
- configuración validada al arrancar;
- convención única para schemas Zod y tipos inferidos.

### Contrato esperado

```ts
export type AuthenticatedUser = {
  id: number;
  role: Role;
  tenantId?: number;
};
```

El `tenantId` puede ser opcional temporalmente durante la transición, pero no debe considerarse opcional en operaciones que ya sean tenant-owned.

### Criterios de aceptación

- [ ] existe una sola declaración de `Request.user`;
- [ ] no hay dos implementaciones de `AppError`;
- [ ] el error handler conserva el formato actual o documenta el cambio;
- [ ] la configuración requerida falla explícitamente si falta;
- [ ] nuevos DTOs usan `Schema` para Zod y `Dto` para el tipo inferido;
- [ ] `shared` no contiene lógica específica de citas, usuarios o perfiles.

### Revisión específica

El reviewer debe rechazar:

- un `BaseService` genérico que esconda lógica;
- un `BaseRepository` que elimine la semántica de cada agregado;
- tipos globales que importen modelos de todos los módulos;
- utilidades que dependan de Prisma y se presenten como `shared`.

---

## Fase 2 — Identity y autenticación

### Objetivo

Separar autenticación, credenciales y sesiones de la creación y actualización de perfiles.

### Contexto propietario

```text
src/modules/identity/
```

### Casos de uso

- `RegisterUser`;
- `Login`;
- `VerifyUser`;
- `RefreshSession`;
- `RequestPasswordReset`;
- `ResetPassword`;
- `ChangePassword`;
- `ChangeEmail`.

### Responsabilidades resultantes

| Responsabilidad | Componente |
|---|---|
| hash de contraseña | `PasswordService` |
| firma y validación de JWT | `TokenService` |
| persistencia de cuentas | `UserAccountRepository` |
| refresh tokens | `SessionRepository` |
| verificación | `VerificationRepository` |
| correo | `MailPort` / adapter |
| HTTP | controllers y routes |

### Migración desde el código actual

El actual `auth.service.ts` contiene registro, perfiles, configuración, tokens, correo y notificaciones. No se debe copiar el archivo completo a la nueva carpeta. Cada método debe clasificarse y migrarse a su responsabilidad.

### Criterios de aceptación

- [ ] el controller no contiene lógica de persistencia;
- [ ] el caso de uso no recibe `Request` ni `Response`;
- [ ] el dominio no importa Prisma, Express ni Nodemailer;
- [ ] el registro no depende directamente de `NotificationService`;
- [ ] los refresh tokens se rotan y revocan correctamente;
- [ ] no se registran contraseñas, tokens planos ni correos sensibles;
- [ ] los errores de credenciales no revelan si el usuario existe;
- [ ] el contrato JWT está documentado.

### Bloqueadores

- cambiar el formato JWT sin compatibilidad;
- dejar dos flujos de login activos con reglas diferentes;
- mover autenticación a tenant sin definir membresías.

---

## Fase 3 — Tenancy y autorización contextual

### Objetivo

Introducir aislamiento de datos y autorización por tenant antes de migrar los módulos operativos.

### Contexto propietario

```text
src/modules/tenancy/
```

### Modelo objetivo mínimo

```text
Tenant
TenantMembership
User
```

La membresía debe permitir que el rol sea definido dentro de un tenant. `User.role` no debe ser la única fuente de autorización SaaS.

### Alcance

- resolución del tenant;
- verificación de pertenencia;
- `TenantContext`;
- claims de tenant;
- middleware/guard;
- matriz de propiedad de datos;
- contratos de repositorios tenant-aware.

### Criterios de aceptación

- [ ] una petición protegida no puede operar sin tenant cuando el recurso es tenant-owned;
- [ ] el tenant enviado por header o URL se verifica contra la membresía;
- [ ] el tenant no se acepta únicamente porque el cliente lo envió;
- [ ] los repositorios tenant-owned exigen `tenantId`;
- [ ] existen pruebas de aislamiento entre dos tenants;
- [ ] los jobs reciben `tenantId` cuando ejecutan lógica tenant-owned;
- [ ] los logs pueden identificar tenant sin exponer información sensible.

### Bloqueadores

- cualquier endpoint que pueda consultar datos de otro tenant;
- filtros tenant aplicados solo en controllers;
- `tenantId` opcional en repositorios críticos;
- usar `User.role` global para autorizar acciones dentro de todos los tenants.

---

## Fase 4 — Profiles: división de `users`

### Objetivo

Separar cuentas de identidad de perfiles de cliente, profesional y administración.

### Contexto propietario

```text
src/modules/profiles/
```

### Casos de uso

- `GetCurrentUser`;
- `UpdateClientProfile`;
- `UpdateProfessionalProfile`;
- `UpdateAvatar`;
- `GetPublicProfessionalProfile`;
- `ReviewProfessionalProfile`.

### Cambios esperados

- `UsersService` deja de ser dueño de todas las operaciones;
- `profileServiceMap: Record<Role, any>` desaparece;
- avatar usa `StoragePort`;
- cada perfil tiene su mapper y contrato de salida;
- administración valida el contexto correcto.

### Criterios de aceptación

- [ ] no existe `any` para seleccionar servicios por rol;
- [ ] cambiar contraseña no está mezclado con actualizar perfil;
- [ ] actualizar avatar no conoce detalles del filesystem;
- [ ] las respuestas públicas no exponen campos privados;
- [ ] perfiles profesionales se filtran por tenant;
- [ ] las transiciones de verificación están documentadas y probadas.

---

## Fase 5 — Catalog

### Objetivo

Consolidar servicios, especialidades y relaciones profesionales bajo un único contexto de catálogo.

### Contexto propietario

```text
src/modules/catalog/
```

### Casos de uso

- `CreateService`;
- `UpdateService`;
- `DeactivateService`;
- `RequestSpecialty`;
- `ApproveSpecialty`;
- `ListPublicCatalog`.

### Contrato requerido para appointments

```ts
export interface CatalogReader {
  getBookableService(
    serviceId: number,
    professionalId: number,
    tenantId: number,
  ): Promise<BookableService | null>;
}
```

`appointments` no debe importar el repositorio Prisma del catálogo.

### Criterios de aceptación

- [ ] servicios y especialidades tienen un contexto propietario;
- [ ] el servicio reservado pertenece al profesional y tenant correctos;
- [ ] el precio y duración se leen desde un contrato estable;
- [ ] no se exponen modelos Prisma como respuesta pública;
- [ ] catálogo global y tenant-owned están diferenciados.

---

## Fase 6 — Scheduling

### Objetivo

Separar horarios, disponibilidad y políticas de slots del caso de uso de reservar.

### Contexto propietario

```text
src/modules/scheduling/
```

### Casos de uso

- `CreateSchedule`;
- `UpdateSchedule`;
- `GetAvailability`;
- `ValidateBookableSlot`.

### Criterios de aceptación

- [ ] horarios son tenant-aware;
- [ ] cálculo de disponibilidad no crea citas;
- [ ] la zona horaria está definida explícitamente;
- [ ] fechas y minutos tienen validación consistente;
- [ ] solapamientos se validan en una capa de dominio/aplicación;
- [ ] existe una estrategia contra reservas concurrentes.

### Bloqueador

No aprobar esta fase si la disponibilidad parece libre pero dos requests concurrentes pueden reservar el mismo slot.

---

## Fase 7 — Appointments

### Objetivo

Dividir el `AppointmentService` actual en casos de uso y proteger el ciclo de vida de la cita.

### Contexto propietario

```text
src/modules/appointments/
```

### Casos de uso

- `CreateAppointment`;
- `ConfirmAppointment`;
- `CancelAppointment`;
- `CompleteAppointment`;
- `GetUpcomingAppointments`;
- `GetAppointmentHistory`.

### Dependencias permitidas

- `CatalogReader`;
- `AvailabilityReader`;
- `AppointmentRepository`;
- `EventPublisher`.

### No permitido

- `AppointmentService` como dueño de todos los casos;
- `appointments` creando directamente notificaciones;
- filtros `where: any`;
- includes Prisma duplicados en cada método;
- filtrado en memoria de grandes listados cuando puede hacerse en DB.

### Criterios de aceptación

- [ ] las transiciones de estado están centralizadas;
- [ ] cada operación verifica tenant y autorización;
- [ ] el cliente solo puede operar sus citas;
- [ ] el profesional solo puede operar sus citas;
- [ ] las reservas concurrentes tienen protección;
- [ ] la transacción principal no depende de que un email se envíe;
- [ ] se publica un evento después de confirmar la operación.

---

## Fase 8 — Notifications

### Objetivo

Convertir notificaciones en un consumidor de eventos y separar persistencia de canales de entrega.

### Contexto propietario

```text
src/modules/notifications/
```

### Componentes

- `NotificationRepository`;
- `NotificationApplicationService`;
- `NotificationChannel`;
- handlers de eventos;
- adapter BullMQ/email si corresponde.

### Criterios de aceptación

- [ ] citas no importan detalles internos de notificaciones;
- [ ] crear una notificación y entregarla son operaciones diferenciadas;
- [ ] un fallo de canal no borra el evento de negocio;
- [ ] reintentos son seguros e idempotentes;
- [ ] las notificaciones están aisladas por tenant;
- [ ] marcar como leída verifica la pertenencia al usuario.

---

## Fase 9 — Reviews y Preferences

### Reviews

- validar que la cita es reseñable;
- impedir reseñas duplicadas;
- separar actualización de rating;
- publicar evento de reseña;
- verificar acceso por tenant.

### Preferences

- mover `CustomConfig` a `preferences`;
- separar lectura y actualización;
- definir si es dato personal o tenant-owned;
- validar que el usuario solo modifique su configuración.

### Criterios de aceptación

- [ ] una reseña solo puede provenir de una cita elegible;
- [ ] el profesional no puede reseñarse a sí mismo;
- [ ] rating y reseña tienen consistencia transaccional definida;
- [ ] preferencias no se usan como configuración global de tenant sin un modelo separado.

---

## Fase 10 — Endurecimiento SaaS

### Objetivo

Preparar operación multi-tenant confiable.

### Alcance

- outbox transaccional;
- jobs tenant-aware;
- storage con prefijo de tenant;
- límites por plan;
- auditoría;
- métricas y logs por tenant;
- backups y restauración;
- pruebas de aislamiento;
- revisión de índices y políticas de borrado.

### Criterios de aceptación

- [ ] todos los eventos importantes son recuperables;
- [ ] los workers no procesan datos sin tenant;
- [ ] los archivos no pueden cruzar tenants;
- [ ] existen métricas de errores por tenant;
- [ ] existe una estrategia de migración y rollback;
- [ ] se ha probado restauración en staging.

---

## Plantilla para solicitar revisión

Usar esta plantilla al terminar cada fase:

```md
# Revisión de Fase N — <nombre>

## Objetivo

<qué se implementó>

## Alcance

- <cambio 1>
- <cambio 2>

## Archivos modificados

- `src/...`

## Decisiones

- <decisión y motivo>

## Validaciones ejecutadas

- `npm run build` — PASS/FAIL
- `<comando de pruebas>` — PASS/FAIL

## Riesgos o pendientes

- <pendiente>

## Solicitud al Code Reviewer

Revisar arquitectura, seguridad, aislamiento tenant, tipos, regresiones y cumplimiento de los criterios de la Fase N.
```

## Plantilla de respuesta del Code Reviewer

```md
# Resultado de revisión — Fase N

## Estado

APPROVED | CHANGES_REQUESTED | BLOCKED

## Cumplimientos

- <criterio cumplido>

## Hallazgos

### [P0/P1/P2] <título>

- Archivo/línea:
- Problema:
- Impacto:
- Recomendación:

## Riesgos residuales

- <riesgo>

## Próximo paso

<corregir hallazgos | iniciar Fase N+1>
```

## Clasificación de severidad

- `P0`: riesgo crítico de seguridad, pérdida de datos, fuga entre tenants o regresión que impide operar.
- `P1`: incumplimiento importante de arquitectura, autorización, concurrencia o contrato que debe corregirse antes de avanzar.
- `P2`: deuda técnica o mejora importante que no bloquea la fase.
- `P3`: estilo, documentación o mejora no urgente.

