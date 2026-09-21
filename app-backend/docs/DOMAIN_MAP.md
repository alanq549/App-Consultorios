# Mapa de dominios y módulos actuales

## Propósito

Este documento conecta la arquitectura objetivo con el código existente. Se usa para decidir dónde debe vivir cada nueva función y qué módulos actuales deben consolidarse.

## Mapa actual a objetivo

| Código actual | Contexto objetivo | Acción |
|---|---|---|
| `modules/auth` | `identity` | conservar funcionalidad, separar casos de uso, tokens y correo |
| `modules/users` | `profiles` + `identity` | dividir cuentas de perfiles |
| `modules/users/clientprofile` | `profiles` | mantener como subdominio de perfiles |
| `modules/users/professionalprofile` | `profiles` | separar administración de perfil y lectura pública |
| `modules/users/adminprofile` | `profiles` o plataforma | decidir si es operador SaaS o administrador tenant |
| `modules/services` | `catalog` | mover bajo el catálogo profesional |
| `modules/specialty` | `catalog` | unir especialidades y relación profesional-especialidad |
| `modules/schedule` | `scheduling` | aislar reglas de horarios y disponibilidad |
| `modules/appointments` | `appointments` | dividir booking, lifecycle y queries |
| `modules/notifications` | `notifications` | convertir acciones directas en consumidores de eventos |
| `modules/reviews` | `reviews` | separar creación de reseña y cálculo de rating |
| `modules/config` | `preferences` | tratarlo como preferencias de usuario |
| `modules/admin` | application de cada contexto | no mantenerlo como dueño de todos los modelos |

## Responsabilidad de cada contexto

### Identity

Puede:

- registrar y autenticar cuentas;
- verificar correo;
- rotar sesiones;
- cambiar credenciales.

No puede:

- conocer la estructura interna de perfiles;
- decidir disponibilidad;
- enviar directamente todas las notificaciones de negocio.

### Tenancy

Puede:

- resolver el tenant;
- administrar membresías;
- definir plan y estado;
- autorizar pertenencia.

No debe:

- contener reglas de citas;
- asumir que un `role` global es suficiente para autorizar una acción.

### Profiles

Puede:

- crear y actualizar perfiles;
- administrar certificados y enlaces;
- cambiar estados de verificación con permisos adecuados.

Debe exponer contratos de lectura pública para que otros contextos no consulten sus tablas directamente.

### Catalog

Puede:

- administrar especialidades;
- administrar servicios;
- verificar que un servicio es publicable y pertenece al profesional correcto.

No debe:

- crear citas;
- enviar notificaciones.

### Scheduling

Puede:

- administrar horarios;
- calcular slots;
- detectar solapamientos de agenda.

Debe distinguir entre disponibilidad calculada y reserva confirmada. La disponibilidad por sí sola no garantiza una reserva sin una protección de concurrencia.

### Appointments

Puede:

- crear una cita;
- confirmar, cancelar y completar;
- consultar citas autorizadas;
- asociar cliente registrado o invitado.

No debe:

- crear registros de notificación directamente;
- leer tablas internas de perfiles si existe un contrato público.

### Notifications

Puede:

- persistir notificaciones;
- marcar como leídas;
- entregar por canales.

No debe decidir cuándo una cita puede confirmarse.

### Reviews

Puede:

- validar que una cita es reseñable;
- crear una reseña;
- actualizar reputación mediante una política explícita.

No debe modificar citas arbitrariamente.

### Preferences

Puede:

- leer y modificar preferencias del usuario;
- aplicar defaults.

Debe validar tenant/membresía cuando el modelo deje de ser exclusivamente personal.

## Contratos públicos sugeridos

Cada contexto debe exponer pocos contratos:

```text
IdentityFacade
TenantAccess
PublicProfileReader
CatalogReader
AvailabilityReader
NotificationPublisher
ReviewPolicy
```

Los contratos pueden ser interfaces TypeScript inicialmente. Las implementaciones concretas permanecen privadas dentro del módulo.

## Reglas de importación

Permitido:

```text
appointments/application -> catalog/application/ports
appointments/application -> scheduling/application/ports
appointments/application -> shared/errors
notifications/application -> shared/events
```

No permitido:

```text
appointments -> catalog/infrastructure/prisma
controller -> core/prisma
domain -> @prisma/client
notifications -> appointments/appointments.service
```

## Clasificación de los archivos existentes

### Entrada HTTP

Actualmente:

- `*.routes.ts`
- `*.controller.ts`

Destino:

```text
modules/<context>/presentation/http/
```

### Validación externa

Actualmente:

- `*.dto.ts`

Destino:

```text
modules/<context>/presentation/http/schemas/
modules/<context>/application/dto/
```

### Acceso y reglas mezcladas

Actualmente:

- `*.service.ts`
- `*.Service.ts`

No moverlos automáticamente. Cada método debe clasificarse como:

1. caso de uso;
2. regla de dominio;
3. repositorio;
4. mapper;
5. adaptador externo;
6. consulta de lectura.

## Señales de que un módulo necesita división

- un servicio supera una responsabilidad de negocio;
- un método escribe en varias entidades sin una transacción explícita;
- un servicio envía correo o notificación;
- una query se repite en tres módulos;
- un módulo importa detalles internos de otro;
- el mismo modelo Prisma se usa como input y output;
- un rol global se utiliza como sustituto de pertenencia a tenant.

