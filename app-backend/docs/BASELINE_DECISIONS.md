# Cierre analítico del baseline — Fase 0, Bloque 6

## 1. Objetivo

Este documento consolida los hallazgos de los cinco bloques anteriores para cerrar el baseline técnico del backend antes de iniciar cambios arquitectónicos.

El objetivo es distinguir:

- riesgos que deben controlarse durante el refactor;
- decisiones que requieren conocimiento del producto;
- decisiones arquitectónicas que ya pueden establecerse;
- contratos y dependencias que deberán formalizarse después;
- condiciones para declarar Fase 0 como `APPROVED`.

No es un diseño final ni una implementación. No modifica `src/`, Prisma, migraciones, contratos HTTP, repositories, ports, eventos ni bounded contexts.

## 2. Fuentes

- [BASELINE.md](BASELINE.md) — endpoints y composición de rutas.
- [BASELINE_MODULES.md](BASELINE_MODULES.md) — módulos, responsabilidades y dependencias actuales.
- [BASELINE_SECURITY.md](BASELINE_SECURITY.md) — autenticación, autorización y ownership.
- [BASELINE_CONTRACTS.md](BASELINE_CONTRACTS.md) — DTOs, tipos, interfaces y contratos.
- [BASELINE_OWNERSHIP.md](BASELINE_OWNERSHIP.md) — modelos Prisma, propiedad conceptual y ciclos.
- [REFACTOR_PHASES.md](REFACTOR_PHASES.md) — protocolo y criterios de revisión por fases.
- `src/`, `prisma/schema.prisma` y `package.json` como evidencia de implementación actual.

## 2.1 Trazabilidad de IDs de riesgos (primera revisión → revisión final)

| ID original | ID final | Cambio |
|---|---|---|
| `P1-CONTRACT-002` | `P2-CONTRACT-008` | Reclasificado por falta de exposición sensible demostrada. |
| `P1-OWNERSHIP-001` | `P2-OWNERSHIP-008` | Separada ausencia de constraint de creación inválida reproducida. |

## 3. Riesgos consolidados

### Criterio de clasificación

- **BLOCKER:** impide iniciar una fase concreta porque no existe una decisión o una garantía mínima para continuar sin riesgo desproporcionado.
- **NON-BLOCKER:** deuda real que puede coexistir temporalmente si se mantiene visible y no se amplía.
- **DEFERRED:** debe resolverse en una fase posterior o como decisión de negocio; no bloquea el cierre documental de Fase 0.

La severidad `P1/P2/P3` proviene de los baselines anteriores. `BLOCKER/NON-BLOCKER/DEFERRED` indica impacto en el orden de migración y no reemplaza la severidad técnica.

| ID | Riesgo consolidado | Evidencia | Impacto y probabilidad | Clasificación | Fase objetivo | Dependencias |
|---|---|---|---|---|---|---|
| P1-SEC-001 | `NotificationService.markAsRead` no filtra por usuario | Actualiza por `notificationId` sin ownership contextual. | Impacto actual de modificación cruzada; probabilidad depende de conocer/adivinar IDs. | **BLOCKER para endurecimiento de seguridad**, no bloquea la documentación ni el shared kernel. | Fase 1/10 | Contrato único de actor y ownership. |
| P1-SEC-002 | Lecturas de reviews sin ownership observable | Consultas por appointment/profesional no reciben usuario/contexto; una incluye `clientProfile`. | Posible exposición de datos de reseñas/cliente; evidencia estática no demuestra todos los escenarios. | **BLOCKER para aprobar Reviews**, no para Identity inicial. | Fase 9/10 | Política de visibilidad y ownership. |
| P1-SEC-003 | Operaciones ADMIN sin contexto organizacional | Controllers/services operan por IDs y `ADMIN` global; no existe membership. | Riesgo condicionado al significado de ADMIN. Alto si existen admins de consultorio. | **BLOCKER para Tenancy y administración SaaS**, deferred mientras negocio no decida alcance. | Fase 3/10 | Business Decisions: ADMIN y tenant. |
| P1-CONTRACT-001 | Rol JWT forzado con `as any` | `auth.middleware.ts` asigna `payload.role as any`. | Puede aceptar un claim estructuralmente inválido en una frontera de autorización. | **BLOCKER para estabilizar Identity**, no bloquea el inventario. | Fase 1/2 | Contrato único de actor y validación de claims. |
| P2-CONTRACT-008 | Respuestas protegidas derivadas directamente de Prisma | Controllers responden resultados de services/Prisma; mappers no cubren todos los casos. | La evidencia demuestra acoplamiento y riesgo de cambios de shape; no demuestra por sí sola exposición sensible actual. | **NON-BLOCKER** si se evita ampliar el acoplamiento; bloquea cerrar una migración de módulo. | Fases 1/4-9 | DTOs de salida y mappers. |
| P2-OWNERSHIP-008 | Appointment no tiene garantía persistente del participante XOR | `clientProfileId` y `guestId` son opcionales independientes en Prisma. | Riesgo de datos ambiguos si una ruta o proceso incumple la regla; no se reprodujo creación inválida. | **BLOCKER para rediseñar Appointment**, no bloquea documentación. | Fase 7 | Decisión sobre guest y regla XOR. |
| P1-OWNERSHIP-002 | Reserva y disponibilidad no tienen frontera transaccional única | Validación de schedule/overlap precede a `create`; restricciones no cubren todos los intervalos. | Riesgo de doble reserva bajo concurrencia. | **BLOCKER para declarar segura la migración de Appointments**. | Fase 7/10 | Política de concurrencia y timezone. |
| P1-OWNERSHIP-003 | Rating se escribe desde Reviews sobre ProfessionalProfile | Review + rating se actualizan en una transacción; no hay autoridad conceptual definida. | Divergencia ante correcciones, borrados o concurrencia; probabilidad futura media. | **DEFERRED**, pero bloquea consolidar Reviews sin decisión de rating. | Fase 9 | Decisión sobre rating derivado/proyección. |
| P2-SEC-001 | Dos middlewares de rol | `authorizeRole` y `requireRole` tienen tipos y respuestas diferentes. | Políticas divergentes; probabilidad de inconsistencia alta al añadir permisos. | **NON-BLOCKER** para Fase 1; blocker para una política de autorización final. | Fase 1/3 | Actor, roles y membership. |
| P2-SEC-002 | Claims JWT sin validación estructural | Payload se castea después de verificar firma. | Contrato de autenticación débil. | **NON-BLOCKER temporal**; no debe duplicarse en código nuevo. | Fase 1/2 | P1-CONTRACT-001. |
| P2-SEC-003 | Ownership distribuido manualmente | Cada service resuelve propietario de forma distinta. | Omisiones y lecturas inconsistentes. | **NON-BLOCKER** durante baseline; blocker para cerrar cada módulo protegido. | Fases 3-10 | Contratos de autorización por caso de uso. |
| P2-SEC-004 | `req.user` duplicado | Dos declaraciones globales equivalentes y tipos locales adicionales. | Divergencia de compilación/mantenimiento. | **NON-BLOCKER**, pero debe resolverse antes de nuevos módulos. | Fase 1 | P1-CONTRACT-001. |
| P2-SEC-005 | Create appointment no restringe rol explícitamente | Depende de encontrar `ClientProfile`; no hay regla de rol en ruta. | Puede aceptar otros actores con perfil compatible si el sistema evoluciona. | **DEFERRED** hasta estabilizar authorization/appointments. | Fase 3/7 | Definición de actor cliente. |
| P2-SEC-006 | Guest público sin rate limiting observado | No se observó limitación en create guest. | Superficie de abuso operativo; no demuestra vulnerabilidad actual. | **DEFERRED**, no blocker de dominio. | Fase 7/10 | Política de guest y operación pública. |
| P2-CONTRACT-001 | Controller accede directamente a Prisma | `AppointmentsController.create` consulta `clientProfile`. | Presentación conoce persistencia y ownership; dificulta migración incremental. | **NON-BLOCKER** para Fase 1; blocker para declarar Appointments migrado. | Fases 2-7 | Caso de uso y repositorio/port local. |
| P2-CONTRACT-002 | Services acoplados directamente a Prisma | Services importan `@/core/prisma`, usan `TransactionClient` y retornos Prisma. | Cambios de storage se propagan a dominio/aplicación; límites no verificables. | **NON-BLOCKER** en baseline; debe eliminarse gradualmente por módulo. | Fases 2-9 | Decisiones de ownership y contratos. |
| P2-CONTRACT-003 | Tipos de actor duplicados | `JwtPayload`, varios `AuthUser`, `Express.User`, `AuthRequest`. | Contratos incompatibles en autorización. | **NON-BLOCKER**, pero condición de Fase 1. | Fase 1/2 | Modelo de actor. |
| P2-CONTRACT-004 | `any` en fronteras críticas | JWT, errors, filters, mapper, worker, preferences y profile map. | Oculta contratos y errores en integración. | **NON-BLOCKER**; no usar nuevos `any`. | Fases 1-9 | Contratos específicos. |
| P2-CONTRACT-005 | `Entity` representa persistencia | `ServiceEntity` usa `Decimal` de Prisma; `ScheduleEntity` contiene shape de tabla. | Confusión entre dominio y almacenamiento. | **DEFERRED** por módulo. | Fases 5/6 | Decisión de value objects y dinero. |
| P2-CONTRACT-006 | DTOs sin convención única | Schemas, aliases, interfaces y respuestas directas conviven. | Contratos públicos inestables. | **NON-BLOCKER**, condición de estándares. | Fase 1/4 | Convención de contracts. |
| P2-CONTRACT-007 | Enum de notifications duplicado | Enum TypeScript local y enum Prisma no coinciden completamente. | Valores incompatibles y dependencia de persistencia. | **NON-BLOCKER**, blocker para Notifications final. | Fase 8 | Modelo de eventos/notificaciones. |
| P2-OWNERSHIP-001 | Múltiples módulos escriben ProfessionalProfile | Auth crea; Profiles cambia estado; Specialty puede suspender; Reviews cambia rating. | Autoridad dispersa y riesgo de sobrescritura. | **BLOCKER para migrar Profiles/Reviews**, no para Fase 1. | Fases 4/9 | Decisiones de aprobación y rating. |
| P2-OWNERSHIP-002 | Ciclo Profiles/Catalog | ProfessionalSpecialty conecta perfil, specialty y service. | Imports y transacciones cruzados. | **NON-BLOCKER** para análisis; blocker para separar esos contextos sin contratos. | Fases 4/5 | Ownership de specialty. |
| P2-OWNERSHIP-003 | Ciclo Appointments/Catalog/Scheduling | Service/Schedule consultan Appointment y Appointment consulta ambos. | Migración ingenua produce dependencia circular. | **BLOCKER para migrar esos módulos por carpetas sin ports/read models**. | Fases 5-7 | Disponibilidad, snapshots y políticas de desactivación. |
| P2-OWNERSHIP-004 | Transacciones cruzan posibles contextos | Registro, specialty review y review/rating cruzan modelos. | Confusión entre consistencia local y coordinación. | **DEFERRED** hasta decidir boundaries; no dividir transacciones arbitrariamente. | Fases 2-9 | Aggregate boundaries. |
| P2-OWNERSHIP-005 | Notifications es dependencia transversal directa | Auth, Profiles, Specialty, Appointments y Reviews lo invocan. | Alto acoplamiento y side effects no idempotentes. | **NON-BLOCKER** inicial; blocker para Notifications aislado. | Fase 8 | Eventos y entrega. |
| P2-OWNERSHIP-006 | `User.role` autoridad global | No existe membership ni tenant. | Impide autorización organizacional segura. | **BLOCKER para Fase 3/Tenancy**. | Fase 3 | Business Decisions Required. |
| P2-OWNERSHIP-007 | Specialty única global | `name @unique` sin tenant. | Puede impedir catálogos por consultorio. | **BLOCKER para decidir catálogo SaaS**, no para shared kernel. | Fase 5 | Global vs tenant-owned. |
| P2-SIDE-001 | Side effects no idempotentes fuera de transacciones de negocio | Emails y notificaciones se disparan después de escrituras; no se observa clave de idempotencia ni retry formal. | Puede haber fallo parcial o duplicación ante reintentos; es riesgo inferido estáticamente, no incidente reproducido. | **DEFERRED** para Notifications; no bloquea Fase 0. | Fase 8/10 | Eventos, retry e idempotencia. |
| P2-OPS-001 | Worker/cron sin contrato de ejecución única o idempotencia documentada | El cron modifica citas y dispara notificaciones fuera de HTTP; no se observaron pruebas de múltiples instancias o reintentos. | Posibles ejecuciones concurrentes, duplicación o fallo parcial; no está demostrado en runtime. | **DEFERRED**; no bloquea Fase 0. | Fase 7/8/10 | Operación del worker, timezone e idempotencia. |
| P3-SEC-001 | Respuestas 401/403 inconsistentes | Middlewares devuelven códigos distintos ante ausencia de actor. | UX y contrato de error inconsistentes. | **DEFERRED**, no bloquea. | Fase 1/3 | Error policy. |
| P3-SEC-002 | Logs de autenticación | Se registran email y fallos de credenciales. | Riesgo de privacidad/política operativa; no se registra contraseña. | **DEFERRED**. | Fase 10 | Política de observabilidad. |
| P3-CONTRACT-001 | Archivos de tipos/DTO vacíos | Existen archivos sin contratos efectivos. | Confusión y falsa expectativa, impacto bajo. | **NON-BLOCKER**. | Fase 1/4 | Convención de nombres. |
| P3-CONTRACT-002 | Errores heterogéneos | `Error`, `AppError`, Prisma, Zod y respuestas manuales. | Traducción HTTP inconsistente. | **NON-BLOCKER** inicial; debe estandarizarse antes de migrar casos de uso. | Fase 1/2 | Error taxonomy. |
| P3-CONTRACT-003 | Nombres ambiguos | `DTO`, `Entity`, `Response` e `Input` se usan sin semántica estable. | Dificulta revisión y ownership de contratos. | **NON-BLOCKER**. | Fase 1/4 | Convención de contratos. |
| P3-OWNERSHIP-001 | Soft delete desigual | Specialty/Service/Schedule se desactivan; otros modelos no. | Políticas de ciclo de vida diferentes. | **DEFERRED** por decisión de negocio. | Fases 5-7 | Retención y citas futuras. |
| P3-OWNERSHIP-002 | Fechas y días no uniformes | Mezcla UTC/local; `Schedule` y appointments usan convenciones distintas. | Citas erróneas y regresiones operativas. | **BLOCKER para Availability/Appointments**. | Fases 6/7 | Timezone de negocio. |
| P3-OWNERSHIP-003 | Creación de AdminProfile no normalizada | No se observa creación en registro público. | Ambigüedad operativa, no pérdida demostrada. | **DEFERRED**. | Fase 3/10 | Significado de ADMIN. |

### Riesgos globales que no deben confundirse

- **Ausencia de tenancy:** es una condición arquitectónica conocida, no una vulnerabilidad P0/P1 por sí sola. Se vuelve blocker cuando se intenta habilitar aislamiento SaaS o permisos de organización.
- **Endpoints públicos:** no son inseguros automáticamente. `create-guest` es una funcionalidad intencional; sus invariantes actuales están documentadas en [BASELINE_SECURITY.md](BASELINE_SECURITY.md).
- **Relaciones Prisma:** una FK o `include` no prueba pertenencia al mismo aggregate.

### Evidencia no ejecutada

El baseline fue principalmente estático. No se ejecutaron:

- pruebas de concurrencia;
- pruebas completas de autorización;
- pruebas de contratos HTTP;
- verificación exhaustiva de respuestas reales contra una base de datos;
- pruebas del cron/worker en runtime.

Por tanto, los riesgos de doble reserva, ejecuciones concurrentes, duplicación de notificaciones o fallos parciales del worker son **riesgos inferidos por análisis estático**, no defectos o incidentes reproducidos. Las conclusiones se limitan a lo observable en el código y el schema.

### Matriz consolidada de side effects

| Side effect | Productor | Trigger | Transacción | Retry/idempotencia | Fallo actual observado |
|---|---|---|---|---|---|
| Email de verificación | `AuthService` / mail adapter | Registro y reenvío de verificación | Fuera de la transacción de persistencia | No definido; no se observa clave de idempotencia | El registro captura y registra el error de envío; la cuenta ya puede existir. |
| Welcome notification | `AuthService` → `NotificationService` | Registro exitoso | Fuera de la transacción principal | No definido | Se captura y registra el error; no se observa retry formal. |
| Appointment notifications | `AppointmentService` / worker → `NotificationService` | Creación, confirmación, cancelación y completado | Fuera de la escritura de `Appointment` | No definido; no se observa idempotencia por evento/destinatario | Puede existir persistencia de cita con notificación fallida; no se probó duplicación. |
| Profile notifications | `ProfessionalProfileService` / specialty service → `NotificationService` | Aprobación, rechazo, suspensión o solicitud de specialty | Fuera de la actualización principal | No definido | Puede existir cambio de estado con side effect fallido; no se observó compensación. |
| Cron notifications | `appointment.worker.ts` → `NotificationService` | Cron que cancela o completa citas | El update de cita y la notificación no forman una transacción única | No definido; no se probó ejecución concurrente | Posible fallo parcial o duplicación inferida; no reproducida en runtime. |

Esta matriz describe evidencia actual. La política futura de eventos, retry e idempotencia queda para las fases correspondientes.

## 4. Business Decisions Required

Estas decisiones requieren conocimiento del producto, clientes y operación. La arquitectura no debe escogerlas arbitrariamente.

### 4.1 Identidad, roles y organizaciones

1. **¿Un usuario puede pertenecer a varios tenants?**
   - Afecta `User`, perfiles, ownership de citas, configuración y JWT.
   - Opciones: un tenant por usuario; múltiples memberships; usuario global con selección de contexto.
   - No asumir que `User.role` basta para SaaS.

2. **¿Qué significa `ADMIN`?**
   - Afecta todos los endpoints administrativos y el modelo de autorización.
   - Opciones: administrador global de plataforma; administrador de consultorio; ambos con permisos distintos.
   - No asumir que todo `ADMIN` puede operar cualquier recurso.

3. **¿Los roles son globales o pertenecen a una membership?**
   - Condiciona JWT, middleware, filtros de datos y onboarding.
   - Opciones: rol global; rol por tenant; permisos derivados de roles.
   - No duplicar `role` en Tenant sin decisión explícita.

### 4.2 Ownership de datos y catálogo

4. **¿Specialty es catálogo global o tenant-owned?**
   - Afecta unique `name`, administración, solicitudes y servicios.
   - Opciones: catálogo global; catálogo por tenant; catálogo global con extensiones tenant.
   - No asumir que el `@unique` actual representa la regla futura.

5. **¿Services, schedules y ProfessionalProfiles pertenecen a un tenant?**
   - Define el aislamiento principal de la agenda.
   - Opciones: todos tenant-owned; profesional compartido con ofertas por tenant; perfil global y agenda tenant-specific.
   - No inferir ownership futuro solo por las FKs actuales.

6. **¿Profesionales o clientes pueden compartirse entre consultorios?**
   - Afecta memberships, duplicación de perfiles, citas y visibilidad pública.
   - Opciones: entidades globales; perfiles por tenant; identidad global con proyecciones tenant.
   - No tratar `userId unique` como decisión de producto.

7. **¿GuestClient es reutilizable o exclusivo de una cita/tenant?**
   - Afecta privacidad, deduplicación y posibilidad de conversión a cliente.
   - Opciones: guest por appointment; guest por profesional/tenant; identidad temporal global.
   - No asumir que buscar por nombre/email define identidad real.

### 4.3 Agenda y ciclo de vida

8. **¿Qué ocurre con citas futuras al desactivar un service o schedule?**
   - Afecta invariantes de Catalog, Scheduling y Appointment.
   - Opciones: bloquear desactivación; mantener citas; cancelar/reprogramar; versionar oferta/horario.
   - No conservar automáticamente la regla actual sin validarla con negocio.

9. **¿Se puede cambiar precio o duración con citas existentes?**
   - Determina si Appointment necesita snapshots de servicio.
   - Opciones: cambios solo para nuevas citas; actualizar citas futuras; versionar servicios.
   - No asumir que leer el Service actual describe una cita histórica.

10. **¿Cuál es el timezone del tenant/profesional?**
    - Afecta `date`, `startMin`, disponibilidad, confirmación y cron.
    - Opciones: timezone del tenant; del profesional; del establecimiento; UTC con conversión explícita.
    - No asumir que las conversiones actuales UTC/local son la regla final.

11. **¿Qué política de cancelación y pago existe?**
    - Afecta estados, permisos, worker y eventual integración de pagos.
    - Opciones: reglas por rol/tiempo; estados separados; política externa.
    - No inferir una política completa de `AppointmentStatus` actual.

### 4.4 Reviews, notificaciones y preferencias

12. **¿Rating es editable o completamente derivado de reviews?**
    - Afecta propietario de `ratingAvg/ratingCount`, transacciones y moderación.
    - Opciones: projection derivada; snapshot mantenido; valor administrativo editable.
    - No asumir que los campos actuales son autoridad definitiva.

13. **¿Qué ocurre con reviews eliminadas o moderadas?**
    - Afecta recálculo y reputación histórica.
    - Opciones: soft delete; moderación con estado; inmutabilidad.
    - No asumir que una review creada es siempre válida y permanente.

14. **¿Qué datos de perfil son públicos?**
    - Afecta response DTOs, discovery, privacidad y tenant isolation.
    - Opciones: vista pública mínima; visibilidad configurable; datos públicos por tenant.
    - No exponer el resultado Prisma completo como contrato.

15. **¿Qué canales de notificación existirán?**
    - Afecta modelo Notification, eventos, plantillas y side effects.
    - Opciones: in-app; email; push; combinación configurable.
    - No asumir que `Notification` representa entrega exitosa por un único canal.

16. **¿Preferences es personal o configuración del consultorio?**
    - Afecta `CustomConfig`, tenancy y permisos de administración.
    - Opciones: personal por usuario; tenant settings; separación de ambos.
    - No asumir que `userId unique` resuelve el alcance futuro.

### 4.5 Decisiones adicionales requeridas antes del refactor operativo

17. **¿Cómo se resuelve el tenant en discovery público, availability y guest booking?**
     - Afecta perfiles públicos, servicios, disponibilidad y `create-guest`, que no tienen actor autenticado.
     - Opciones: subdominio, dominio personalizado, slug, identificador explícito, API key o combinación.
     - No asumir que un ID global actual identifica suficientemente al tenant.

18. **¿Qué política existe para eliminación, retención y anonimización de datos?**
     - Afecta `User`, perfiles, guests, citas históricas, reviews, notificaciones, tokens y archivos.
     - Opciones: eliminación física, soft delete, anonimización selectiva o retención por tipo de dato.
     - No asumir que los `onDelete` actuales son la política de producto.

19. **¿Qué datos deben sobrevivir en una cita histórica?**
     - Debe decidirse si Appointment conserva servicio, precio, duración, profesional, clínica/tenant y timezone históricos.
     - Afecta Appointments, Reviews y futuros reportes; puede requerir snapshots.
     - No asumir que consultar el Service o Profile actual reconstruye correctamente el pasado.

20. **¿Debe existir auditoría de operaciones administrativas?**
     - Afecta aprobación de profesionales/specialties, suspensiones, cambios administrativos y acceso a datos.
     - Opciones: auditoría completa, eventos seleccionados o ningún registro adicional.
     - No asumir que los logs actuales constituyen auditoría de negocio.

21. **¿Un usuario puede tener múltiples roles simultáneos?**
     - Afecta `User.role`, perfiles, `/users/me`, JWT, membership y autorización.
     - Opciones: un rol global, múltiples roles por usuario o roles por tenant.
     - No asumir que la unicidad conceptual actual de `role` es una regla de producto.

22. **¿Cuál es el ownership, aprobación y visibilidad pública de `Certificate`?**
     - Afecta Profiles, discovery público, storage, moderación y privacidad.
     - Opciones: propiedad del profesional con publicación inmediata, revisión administrativa o visibilidad configurable.
     - No asumir que crear un certificado lo hace automáticamente público o verificado.

## 5. Architectural Decisions

### 5.1 Decisiones establecidas (`DECIDED` y `DECIDED — TARGET STANDARD`)

#### AD-001 — Mantener un monolito modular

**Estado:** `DECIDED — TARGET STANDARD`.

La evidencia muestra un backend funcional con dependencias cruzadas y sin límites contractuales estables. La estrategia inmediata del proyecto será modularizar dentro del mismo despliegue, no introducir microservicios prematuramente.

La decisión no describe el estado actual; define la restricción arquitectónica que se aplicará en fases posteriores.

#### AD-002 — Organizar por contexto/módulo y mantener capas internas

**Estado:** `DECIDED — TARGET STANDARD`.

Cada módulo futuro debe mantener juntas sus responsabilidades de presentación, aplicación, dominio e infraestructura local. No se adoptará una estructura global que disperse cada dominio por carpetas técnicas.

La decisión no describe el estado actual; define la restricción arquitectónica que se aplicará en fases posteriores.

#### AD-003 — Separar dirección de dependencias

**Estado:** `DECIDED — TARGET STANDARD`.

La regla objetivo será:

```text
presentation -> application -> domain
infrastructure -> application/domain
shared -> no depende de modules
domain -> no depende de infrastructure
```

Los detalles de composición pueden variar durante la migración, pero un dominio no debe importar Prisma, Express, Nodemailer, filesystem ni infraestructura concreta.

La decisión no describe el estado actual; define la restricción arquitectónica que se aplicará en fases posteriores.

#### AD-004 — Prisma pertenece a infraestructura/persistencia

**Estado:** `DECIDED — TARGET STANDARD`.

Los modelos generados por Prisma y `Prisma.TransactionClient` no serán contratos de dominio ni contratos HTTP. El acceso actual directo se registra como deuda de migración.

La decisión no describe el estado actual; define la restricción arquitectónica que se aplicará en fases posteriores.

#### AD-005 — No usar FK como criterio automático de aggregate

**Estado:** `DECIDED — TARGET STANDARD`.

Las relaciones Prisma expresan persistencia. La pertenencia a un aggregate dependerá de invariantes y consistencia transaccional, no de `@relation`, `include` o una carpeta actual.

La decisión no describe el estado actual; define la restricción arquitectónica que se aplicará en fases posteriores.

#### AD-006 — Controllers no deben contener reglas de negocio ni consultar Prisma

**Estado:** `DECIDED — TARGET STANDARD`.

Los controllers deben traducir HTTP a comandos/queries de aplicación y traducir resultados/errores a HTTP. Las reglas observadas en controllers y el acceso directo de appointments quedan como deuda explícita.

La decisión no describe el estado actual; define la restricción arquitectónica que se aplicará en fases posteriores.

#### AD-007 — Cross-context mediante contratos explícitos

**Estado:** `DECIDED — TARGET STANDARD`.

Un contexto no debe importar repositories internos, modelos Prisma ni services estáticos internos de otro contexto. La dependencia deberá resolverse, según el caso, por port, application contract, facade, read model, referencia por ID o evento.

La decisión no describe el estado actual; define la restricción arquitectónica que se aplicará en fases posteriores. La elección concreta entre port, facade, read model, evento o referencia por ID queda pendiente y deberá hacerse caso por caso.

#### AD-008 — Shared kernel pequeño

**Estado:** `DECIDED — TARGET STANDARD`.

`shared/` solo debe contener primitivas realmente transversales: errores base, configuración, tipos técnicos mínimos, infraestructura común y contratos transversales cuidadosamente definidos. No debe ocultar reglas de appointments, profiles o catalog.

La decisión no describe el estado actual; define la restricción arquitectónica que se aplicará en fases posteriores.

#### AD-009 — Un único contrato interno del actor autenticado

**Estado:** `DECIDED`.

No se mantendrán a largo plazo las representaciones duplicadas de `req.user`, `AuthUser` y payloads incompatibles. El contrato debe separar identidad, rol/permisos y contexto tenant cuando este exista.

La decisión de contar con una única abstracción interna del actor está establecida. El shape definitivo respecto a tenant, memberships, roles y permisos permanece `PENDING` y no se fija en Fase 0.

#### AD-010 — Respuestas públicas mediante view models/mappers

**Estado:** `DECIDED — TARGET STANDARD`.

Los modelos Prisma no deben salir directamente como contrato público. Las lecturas deberán definir explícitamente qué campos y relaciones exponen, especialmente perfiles, reviews, appointments y notificaciones.

La decisión no describe el estado actual; define la restricción arquitectónica que se aplicará en fases posteriores.

#### AD-011 — No ampliar deuda durante la migración

**Estado:** `DECIDED`.

Las fases posteriores no deben introducir nuevos `any`, nuevos accesos controller→Prisma, nuevos imports cruzados a Prisma ni nuevas llamadas directas entre contextos sin documentar el motivo.

### 5.2 Decisiones pendientes (`PENDING`)

#### AD-P-001 — Frontera exacta de Identity, Profiles y Tenancy

**Estado:** `PENDING`.

Depende de si los usuarios tienen memberships múltiples, si los perfiles son globales y qué significa ADMIN.

#### AD-P-002 — Propiedad de ProfessionalSpecialty

**Estado:** `PENDING`.

Tiene invariantes propias, pero conecta aprobación profesional y catálogo. No se puede asignar definitivamente a Profiles o Catalog solo con el schema.

#### AD-P-003 — Propiedad de rating

**Estado:** `PENDING`.

La transacción actual no determina si Profiles es dueño del rating o si Reviews debe publicar una proyección.

#### AD-P-004 — Aggregate boundary de Appointment

**Estado:** `PENDING`.

Appointment parece aggregate root, pero participant invariant, snapshots, pagos, cancelaciones y disponibilidad requieren decisiones de negocio.

#### AD-P-005 — Alcance de Preferences

**Estado:** `PENDING`.

`CustomConfig` puede ser personal, tenant-owned o dividido en preferencias personales y configuración organizacional.

#### AD-P-006 — Contrato de disponibilidad y concurrencia

**Estado:** `PENDING`.

Debe definirse si Scheduling es autoridad de slots, si Appointments reserva, y qué garantía transaccional requiere el negocio.

#### AD-P-007 — Definición conceptual de `ProfessionalSpecialty`

**Estado:** `PENDING`.

El concepto puede representar una solicitud, una capacidad profesional, una membresía al catálogo, una asociación administrativa o una combinación de ellas. La evidencia actual no permite elegir una interpretación única.

#### AD-P-008 — Datos históricos y snapshots de Appointment

**Estado:** `PENDING`.

Debe definirse qué información sobre servicio, precio, duración, profesional, clínica/tenant y timezone debe sobrevivir para citas históricas, reviews y reportes.

#### AD-P-009 — Resolución de tenant para superficies públicas

**Estado:** `PENDING`.

Discovery, availability y guest booking necesitan resolver tenant sin depender necesariamente de un JWT. La estrategia concreta afecta Fase 3 y los endpoints públicos.

#### AD-P-010 — Retención, eliminación y anonimización

**Estado:** `PENDING`.

La política de ciclo de vida de cuentas, guests, citas, reviews, tokens y archivos condiciona ownership, cascades y fases de endurecimiento SaaS.

#### AD-P-011 — Auditoría administrativa

**Estado:** `PENDING`.

El producto debe decidir qué operaciones administrativas deben ser trazables y por cuánto tiempo.

#### AD-P-012 — Ownership y visibilidad de Certificate

**Estado:** `PENDING`.

Debe decidirse si Certificate requiere aprobación, si es público, quién puede modificarlo y cómo se relaciona con storage.

## 5.3 Terminología del baseline

Para evitar tratar conceptos distintos como sinónimos:

- **Módulo actual:** carpeta o agrupación técnica existente en `src/modules`.
- **Área funcional:** conjunto de responsabilidades observadas en el comportamiento actual, aunque estén repartidas en varios módulos.
- **Bounded context candidato:** hipótesis de límite semántico futuro; no es todavía una implementación.
- **Subdominio:** clasificación del problema de negocio; puede contener uno o más módulos o contextos.

`NotificationService` es el servicio técnico actual que persiste y crea notificaciones. `Notifications` es el bounded context candidato de entrega/comunicación. No son equivalentes en el estado actual.

`ProfessionalSpecialty` mantiene definición conceptual `PENDING`: puede ser solicitud, capacidad, membresía al catálogo, asociación administrativa o combinación de ellas.

## 6. Future Contracts / Dependencies

Esta sección identifica candidatos arquitectónicos, no interfaces concretas.

| Dependencia actual | Por qué existe | Candidato | Fase |
|---|---|---|---|
| Appointments → Catalog/Service | Validar servicio activo, profesional propietario, duración y datos para reservar. | Application contract de servicio reservable; referencia por ID; snapshot de nombre/precio/duración si aplica. | Fase 5/7 |
| Appointments → Scheduling | Validar horario, slots y overlap. | Port/application service de disponibilidad y reserva; contrato de concurrencia. | Fase 6/7 |
| Appointments → Profiles/Identity | Resolver actor cliente/profesional y ownership. | Actor context + referencias por ID; facade de participantes; no modelo Prisma externo. | Fase 2/3/7 |
| Catalog → Professional approval/specialties | Validar que el profesional pueda ofrecer una specialty/service. | Application contract de elegibilidad o read model de aprobaciones. | Fase 4/5 |
| Scheduling → existing appointments | Impedir cambios incompatibles con reservas futuras. | Policy contract de impacto en citas o consulta read-only; no repository cruzado. | Fase 6/7 |
| Reviews → Appointment eligibility | Comprobar cliente, cita completada y ausencia de review. | Query contract de elegibilidad o evento de `AppointmentCompleted`. | Fase 7/9 |
| Reviews → Professional rating | Actualizar reputación después de una review. | Domain/integration event + projection; alternativa temporal: application contract explícito. | Fase 9 |
| Múltiples contexts → Notifications | Crear mensajes por cambios de negocio. | Domain/integration events y consumer de notifications; idempotencia. | Fase 8 |
| Preferences → Identity | Asociar configuración al usuario autenticado. | Referencia por ID y actor contract; separar preferencias tenant si aplica. | Fase 1/9 |
| Auth/register → Profiles/Catalog | Crear perfiles y relación specialty durante registro. | Orchestrating application service o workflow; contratos entre Identity y Profiles/Catalog. | Fase 2/4/5 |
| Profiles → Catalog | Mostrar y aprobar specialties. | Query contract/read model; evitar navegación directa de repositories. | Fase 4/5 |
| Service/Schedule → Appointments | Proteger desactivaciones con citas futuras. | Policy/read model de impacto; decisión de negocio antes de implementar. | Fase 6/7 |

### Regla de elección

- **Port:** cuando un contexto necesita invocar una capacidad de otro sin conocer infraestructura.
- **Application contract/facade:** cuando se necesita una operación síncrona con reglas de aplicación.
- **Read model:** cuando solo se requiere consultar datos proyectados y estables.
- **Domain event:** cuando el hecho pertenece al dominio local y otros módulos reaccionan dentro del monolito.
- **Integration event:** cuando se quiere desacoplar consumidores o preparar extracción futura.
- **Snapshot:** cuando una cita necesita conservar precio, duración o nombre históricos.
- **Referencia por ID:** cuando basta identificar un concepto externo sin navegarlo.

## 7. Refactor Risk Map

| Área | Riesgo | Motivo |
|---|---|---|
| Auth/register | **CRITICAL** | Crea User, perfil, specialty relation, config, verification y side effects; cualquier cambio rompe onboarding. |
| Login/refresh/reset | **HIGH** | Seguridad, hashes, rotación, revocación y compatibilidad de tokens. |
| `/users/me` | **HIGH** | Compone User, perfil por rol y CustomConfig; depende de contratos duplicados y shapes variables. |
| Public professional discovery | **HIGH** | Es una superficie pública con mappers, specialties, certificates y social links; cambios pueden exponer datos. |
| Service creation | **HIGH** | Ownership, specialty aprobada, precio/duración y futuras citas cruzan Catalog, Profiles y Appointments. |
| Specialty approval | **CRITICAL** | Modifica relación con estado y puede suspender ProfessionalProfile; además dispara notificaciones. |
| Schedule availability | **CRITICAL** | Afecta disponibilidad, timezone, slots y prevención de doble reserva. |
| Appointment creation | **CRITICAL** | Es el núcleo transaccional: participantes, catálogo, horario, overlap, concurrencia y notificaciones. |
| Guest booking | **HIGH** | Endpoint público, deduplicación de guest, privacidad y resolución futura de tenant. |
| Appointment status lifecycle | **CRITICAL** | Transiciones manuales y worker/cron comparten escrituras y side effects. |
| Notifications | **HIGH** | Muchos productores, enum duplicado, ownership observado y side effects no necesariamente idempotentes. |
| Reviews/rating | **HIGH** | Elegibilidad por cita, actualización de rating y lecturas con ownership no uniforme. |
| Worker/cron | **CRITICAL** | Cambia estado de citas fuera de HTTP, aplica timezone y dispara notificaciones. |
| Filesystem/storage | **MEDIUM** | Avatar/certificados mezclan persistencia y filesystem; pueden quedar archivos huérfanos. |
| Seeds | **MEDIUM** | Crean datos con supuestos actuales de roles, especialidades y relaciones; pueden ocultar incompatibilidades. |

## 8. Refactor Dependency Order

### Orden recomendado

```text
Fase 0: baseline y decisiones
   ↓
Fase 1: shared kernel mínimo y estándares
   ↓
Fase 2: Identity
   ↓
Fase 3: Tenancy y authorization scope
   ↓
Fase 4: Profiles / professional onboarding
   ↓
Fase 5: Catalog
   ↓
Fase 6: Scheduling
   ↓
Fase 7: Appointments
   ├── Fase 8: Notifications
   ├── Fase 9: Reviews y Preferences
   └── Fase 10: endurecimiento SaaS
```

### Justificación por tipo de dependencia

#### Dependencia conceptual

- Identity define el actor.
- Tenancy define el ámbito de ownership y autorización.
- Profiles define profesionales/clientes y estados de onboarding.
- Catalog necesita saber si el profesional está habilitado y qué specialties puede ofrecer.
- Scheduling necesita profesional y oferta reservable.
- Appointments coordina participante, servicio y disponibilidad.
- Reviews necesita elegibilidad de appointment.
- Notifications y Preferences consumen identidad y hechos de otros contextos.

#### Dependencia técnica actual

- Auth actualmente crea perfiles, config y specialty relation.
- Appointments consulta directamente profiles, services y schedules.
- Services y schedules consultan appointments.
- Reviews actualiza ProfessionalProfile.
- Notifications es llamado directamente por casi todos.

Estas dependencias no justifican copiar el orden técnico actual; precisamente son las relaciones que deben convertirse en contratos.

#### Dependencia de migración

1. Fase 1 debe estabilizar errores, actor, validación y reglas de dependencia sin cambiar el dominio.
2. Identity debe aislar credenciales antes de decidir membership y tenant.
3. Tenancy no debe implementarse parcialmente: todas las superficies tenant-owned deben tener una política coherente.
4. Profiles debe estabilizar ownership profesional antes de Catalog y Scheduling.
5. Catalog debe definir qué service es reservable antes de Availability.
6. Scheduling debe definir timezone y disponibilidad antes de Appointment.
7. Appointments debe estabilizar estados y concurrencia antes de Reviews/Notifications dependientes.
8. Notifications puede migrarse después de definir eventos de appointments/profiles/reviews, aunque el shared kernel puede preparar tipos técnicos.
9. Reviews y Preferences pueden avanzar cuando sus propietarios y alcances estén decididos.

#### Dependencia de negocio

Las decisiones sobre ADMIN, tenant scope, catálogo, timezone, guest y rating son precondiciones para las fases correspondientes. Si no se resuelven, la fase debe quedar `BLOCKED`, no forzarse mediante defaults arquitectónicos.

## 9. Fase 0 Exit Criteria

Fase 0 puede declararse `APPROVED` cuando se cumpla todo lo siguiente:

### Evidencia levantada

- [x] endpoints activos y router no montado identificados;
- [x] módulos actuales, submódulos y responsabilidades documentados;
- [x] auth, autorización, ownership y endpoints públicos documentados;
- [x] DTOs, schemas, tipos, interfaces, `any` y respuestas documentados;
- [x] los 18 modelos Prisma tienen operaciones, dependencias y propietario conceptual candidato;
- [x] ciclos entre Profiles/Catalog, Appointments/Scheduling y Reviews/Profiles identificados;
- [x] riesgos P1/P2/P3 consolidados con trazabilidad.

### Decisiones y límites

- [x] se separó lo observado de la interpretación arquitectónica;
- [x] se separaron decisiones de negocio de decisiones arquitectónicas;
- [x] se clasificaron decisiones como `DECIDED` o `PENDING`;
- [x] se identificaron contratos futuros sin implementar interfaces;
- [x] se definió el orden de dependencia del refactor;
- [x] se documentó el mapa de riesgo de regresión.

### Integridad del baseline

- [x] no se modificó `src/` durante Fase 0;
- [x] no se modificó `prisma/schema.prisma`;
- [x] no se crearon migraciones;
- [x] no se crearon repositories, ports, eventos ni bounded contexts;
- [x] los cambios externos previos en `auth.mail.ts` y `notifications.service.ts` se conservaron;
- [x] se verificó formato documental con `git diff --check`.

### Condiciones antes de Fase 1

- [ ] el reviewer confirma que no falta evidencia material en los cinco bloques;
- [ ] las decisiones `PENDING` que afectan shared kernel se convierten en decisiones explícitas o se autoriza un supuesto temporal documentado;
- [ ] se confirma si Fase 1 puede limitarse a estándares internos sin cambiar contratos HTTP;
- [ ] se registra el estado de revisión como `APPROVED`, `CHANGES_REQUESTED` o `BLOCKED`.

## 10. Estado de Fase 0

**Estado documental:** `READY FOR FINAL REVIEW`.

### Decisiones `DECIDED`

- monolito modular como estrategia de migración;
- módulos organizados por contexto con capas internas;
- dirección de dependencias;
- Prisma confinado progresivamente a infraestructura;
- FK no equivale a aggregate;
- controllers sin reglas de negocio ni Prisma;
- cross-context mediante contratos explícitos;
- shared kernel pequeño;
- actor autenticado unificado;
- responses mediante view models/mappers;
- no ampliar deuda durante la migración.

### Decisiones `PENDING`

- significado y alcance de ADMIN;
- memberships múltiples;
- ownership global/tenant de perfiles, clientes, servicios y specialties;
- propiedad de ProfessionalSpecialty;
- propiedad y derivación de rating;
- aggregate boundary definitivo de Appointment;
- contrato de disponibilidad y concurrencia;
- alcance de Preferences;
- guest lifecycle;
- timezone;
- política de cancelación/pago;
- canales de notificación y moderación de reviews.

### Blockers actuales

No hay un blocker para **terminar la documentación de Fase 0**.

Sí existen blockers para fases de implementación concretas:

1. **Fase 2/3:** definir actor, ADMIN y alcance tenant antes de cambiar autorización o agregar tenancy.
2. **Fase 4/5:** decidir ownership de perfiles, specialties y ProfessionalSpecialty.
3. **Fase 6/7:** decidir timezone, disponibilidad, concurrencia y efecto de cambios de service/schedule.
4. **Fase 7:** resolver el invariant de participante de Appointment.
5. **Fase 8/9:** decidir eventos/notificaciones y autoridad del rating.

### Riesgos diferidos explícitamente

- rate limiting y operación de guest;
- política de logs de autenticación;
- limpieza/retención de tokens y guests;
- soft delete desigual;
- filesystem/storage;
- seeds;
- compatibilidad detallada de respuestas HTTP;
- revisión final de campos públicos;
- posible extracción futura de eventos/integraciones.

Fase 0 queda lista para revisión final del Code Reviewer. No debe iniciarse una implementación de Tenancy, Appointment, Reviews o Notifications como si las decisiones `PENDING` estuvieran resueltas.
