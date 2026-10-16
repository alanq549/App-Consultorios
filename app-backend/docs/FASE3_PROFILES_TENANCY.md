# ADR de diseno — Limite Profiles ↔ Tenancy

## Estado

**Diseño: `APPROVED` por Code Reviewer (2026-10-14).**

La aprobación cubre el diseño Profiles–Tenancy. No constituye aprobación de implementación, migraciones, ni aislamiento de otros módulos. El plano del primer slice operativo y sus precondiciones están en [FASE3_PROFILES_TENANCY_SLICE.md](FASE3_PROFILES_TENANCY_SLICE.md).

El primer slice de Fase 3 (`Tenant/Membership` y `GET /api/tenancy/current`) permanece `APPROVED`. Este ADR fija el límite Profiles–Tenancy. Los gates de diseño del slice siguiente están cerrados para el alcance de portafolio según el plano operativo; la implementación aún requiere su propio trabajo, validación y revisión. El **Slice A** del [plano operativo](FASE3_PROFILES_TENANCY_SLICE.md) (directorio público tenant-scoped) ya está implementado, validado y `APPROVED`; el **Slice B** (ciclo de vida de afiliación y comandos `OWNER`) permanece pendiente de implementación.

## Contexto y evidencia

- `User` es una identidad global con email unico y relaciones uno-a-uno actuales a `ClientProfile`, `ProfessionalProfile` y `AdminProfile`.
- `TenantMembership` es M:N entre `User` y `Tenant`; un usuario puede pertenecer a varios consultorios. Solo `ACTIVE` permite acceso y `SUSPENDED` lo bloquea. Los roles aprobados actualmente son `OWNER` y `MEMBER`.
- `ProfessionalProfile.userId` es unico. El perfil contiene `verificationStatus`, rating y datos de presentacion; `Service`, `Schedule`, `ProfessionalSpecialty`, `Certificate`, `SocialLink` y `Appointment` referencian su ID.
- `ClientProfile.userId` es unico; citas registradas lo referencian.
- `AdminProfile` esta ligado a un `User`; las rutas administrativas actuales autorizan por `User.role === ADMIN`, sin tenant.
- El registro legacy crea `User`, perfil, preferencias, verificacion y, para profesionales, una relacion inicial `ProfessionalSpecialty` en estado `PENDING` dentro de una transaccion. No crea `Tenant` ni `TenantMembership`.
- `ProfessionalProfileService` expone actualmente nombre, apellido, avatar, descripcion, rating, links, certificados y especialidades aprobadas en consultas publicas globales. `GET /Allprofiles` filtra por `verificationStatus = APPROVED`; `GET /:id` busca por el ID global del perfil y no exige tenant.
- `ProfessionalSpecialtyService` crea solicitudes globales `PENDING`; una ruta ADMIN global aprueba/rechaza la relacion y puede suspender el perfil cuando no quedan especialidades aprobadas. La relacion no esta asociada a un consultorio.

La evidencia establece el estado actual y sus dependencias; no demuestra que los perfiles o sus datos deban compartirse entre consultorios. Las decisiones siguientes son la propuesta arquitectonica de este ADR y requieren revision antes de implementar.

## Decisiones de arquitectura propuestas

### 1. Identity y User

- `User` sigue siendo global y es propiedad de Identity. No lleva `tenantId`.
- `TenantMembership` es la fuente de pertenencia y de rol contextual. `User.role` permanece como compatibilidad del registro/autenticacion legacy y no concede permisos dentro de un tenant.
- El mismo `User` puede tener perfiles globales y pertenecer a varios tenants. Cambiar de tenant activo no cambia la identidad ni requiere otro usuario.
- La presencia de un perfil no crea una membership; una membership tampoco implica automaticamente que el usuario sea profesional, cliente o administrador.

### 2. ProfessionalProfile y afiliacion a consultorios

**Decision propuesta:** separar el perfil profesional personal/global de su afiliacion operativa a un consultorio.

- `ProfessionalProfile` conserva identidad y datos personales relativamente estables del profesional y pertenece a Profiles, asociado globalmente a un `User`.
- La relacion entre el profesional y el consultorio es una afiliacion tenant-owned de Profiles (nombre conceptual: `ProfessionalTenantAffiliation`), con unicidad por perfil y tenant.
- La afiliacion, no el perfil global, contiene el lifecycle de publicacion/aprobacion y cualquier dato que pueda variar por consultorio. Rating, especialidades ofrecidas, servicios y horarios se deben scopear por afiliacion/tenant en sus respectivos slices.
- Un usuario puede tener una afiliacion por cada tenant donde tenga acceso. La afiliacion exige una `TenantMembership` activa del mismo usuario y tenant para operar; suspender la membership bloquea las mutaciones y oculta la afiliacion del directorio publico, pero no borra historico ni la afiliacion.
- El lifecycle propuesto es `PENDING_REVIEW`, `ACTIVE`, `REJECTED`, `SUSPENDED` y `WITHDRAWN`. Solo `ACTIVE` es publicable.
- `MEMBER` con membership activa puede solicitar su afiliacion y editar datos privados. La edicion de contenido publico de una afiliacion activa requiere una revision nueva del `OWNER`; hasta aprobarla, sigue publicado el contenido previamente aprobado.
- `OWNER` activo puede revisar afiliaciones y cambios publicos, suspender, reactivar o retirar afiliaciones del tenant. Un cambio de estado siempre se limita al `TenantContext`.
- Solo un `OWNER` activo distinto del profesional solicitante puede aprobar o rechazar una afiliacion. Nadie aprueba su propia afiliacion, aunque sea `OWNER`.

Esta opcion conserva la identidad de persona entre consultorios sin duplicar cuentas ni asumir que bio, aprobacion, rating o oferta sean compartidos. Tambien evita reutilizar una sola aprobacion global para otorgar presencia en todas las clinicas.

#### Estados y transiciones propuestas

| Estado actual | Accion/actor | Estado siguiente | Regla |
|---|---|---|---|
| Sin afiliacion | Profesional con membership `ACTIVE` solicita | `PENDING_REVIEW` | Una afiliacion por `professionalProfileId + tenantId`; requiere contexto Tenant validado. |
| `PENDING_REVIEW` | Otro `OWNER` activo aprueba | `ACTIVE` | El aprobador no puede ser el usuario de la afiliacion. |
| `PENDING_REVIEW` | Otro `OWNER` activo rechaza | `REJECTED` | Se conserva motivo interno/auditoria; no se publica. |
| `PENDING_REVIEW` | Profesional retira su solicitud | `WITHDRAWN` | No publicable; queda registro auditable de la retirada. |
| `REJECTED` | Profesional corrige y reenvia | `PENDING_REVIEW` | No se reactiva directamente ni se publica sin nueva revision. |
| `ACTIVE` | Profesional guarda cambios en campos publicos de la afiliacion | `ACTIVE` + revision de contenido pendiente | La version publicada no cambia hasta aprobacion del OWNER; la afiliacion sigue visible con el contenido aprobado anterior. |
| `ACTIVE` + revision pendiente | Otro `OWNER` activo aprueba la revision | `ACTIVE`, nueva version publicada | Se publica atomica/logicamente la version revisada; el profesional no puede aprobar su propia revision. |
| `ACTIVE` + revision pendiente | Otro `OWNER` activo rechaza la revision | `ACTIVE`, version publicada sin cambios | Se descarta la revision pendiente, se conserva la version publica anterior y se registra el motivo. |
| `ACTIVE` + revision pendiente | Profesional edita de nuevo | `ACTIVE` + revision pendiente actualizada | Se actualiza la propuesta pendiente; cada version/decision permanece en auditoria y el OWNER revisa la version mas reciente. |
| `ACTIVE` | Otro `OWNER` activo suspende temporalmente | `SUSPENDED` | Se oculta inmediatamente del directorio; no se borran relaciones ni historico. |
| `SUSPENDED` | Otro `OWNER` activo reactiva | `ACTIVE` | Requiere revisar que la membership siga activa y que las precondiciones de publicacion se cumplan. |
| `ACTIVE` o `SUSPENDED` | Profesional se retira o `OWNER` distinto lo remueve | `WITHDRAWN` | No publicable; retiene historial y auditoria. |
| `WITHDRAWN` | Profesional solicita volver | `PENDING_REVIEW` | Reabre un nuevo ciclo en la misma afiliacion, preservando decisiones previas en auditoria; requiere nueva revision por otro OWNER. |

Los estados de afiliacion son distintos de `TenantMembership.status`: suspender membership bloquea toda operacion del usuario en el tenant, mientras suspender una afiliacion afecta solo la participacion profesional. La unicidad de una afiliacion vigente por par perfil-tenant se conserva; reintentos y transiciones deben agregar auditoria sin borrar el historial de decisiones.

El estado principal de afiliacion y el workflow de revision de contenido son dimensiones separadas: tener una revision pendiente no cambia `ACTIVE` ni invalida la aprobacion vigente. El directorio lee solo la ultima version aprobada; la version pendiente no se expone. Si se suspende la afiliacion mientras hay cambios pendientes, se oculta la version publicada y la revision queda bloqueada hasta que un OWNER la descarte o la afiliacion se reactive bajo revision.

#### Contrato minimo de auditoria

“Auditable” significa que un operador autorizado puede reconstruir quien hizo cada cambio/decision, sobre que afiliacion y tenant, en que orden, y que version publica fue aprobada. Sin prescribir tabla, ORM, evento ni tecnologia, cada registro de auditoria debe incluir:

- actor (`userId`) y tenant (`tenantId`); para cambios personales globales, actor y alcance global, sin inventar tenant;
- identificador estable de afiliacion y, cuando corresponda, identificador/numero de la revision de contenido;
- accion (solicitar, editar propuesta, aprobar, rechazar, suspender, reactivar, retirar, reabrir) y resultado;
- estado anterior/nuevo de afiliacion o de revision, segun corresponda;
- fecha/hora UTC de la accion;
- motivo obligatorio para rechazos, suspensiones, retiros hechos por OWNER y decisiones excepcionales; motivo opcional para aprobaciones y ediciones ordinarias;
- lista de campos publicos cambiados y referencia a la version de contenido revisada/publicada. La version aprobada debe poder reconstruirse historicamente; no es necesario copiar en el log campos privados que no participaron en la decision.

Los registros de auditoria son append-only desde el punto de vista de la aplicacion: corregir un error genera un nuevo evento, no reescribe la decision anterior. Nunca deben guardar credenciales, tokens, datos de cliente ni valores privados ajenos a la revision. El acceso a motivos e historial se limita a la persona afiliada y a Owners autorizados del tenant. Para el alcance de portafolio, el responsable del proyecto decide conservar eventos 24 meses desde `createdAt`; despues pueden eliminarse o anonimizarse mediante un proceso controlado. Excepciones documentadas por obligaciones legales, investigaciones de seguridad o preservacion justificada suspenden la expiracion hasta su liberacion. Esta politica no constituye certificacion de cumplimiento legal y debe revisarse antes de un despliegue comercial o de produccion. Reabrir una afiliacion `WITHDRAWN` inicia un nuevo ciclo/version, pero conserva todos los eventos y resultados del ciclo anterior mientras esten dentro de retencion o hold.

#### Politica de edicion y nueva aprobacion

- **Sin revision del OWNER:** datos privados de la afiliacion que no aparecen en respuestas publicas; cambios personales globales que el propio usuario puede editar (por ejemplo, nombre/avatar) se reflejan en todos los tenants donde exista una afiliacion publicable y generan auditoria de perfil global. El telefono sigue siendo privado.
- **Requieren nueva aprobacion del OWNER del tenant:** descripcion y cualquier otro texto publico tenant-specific; seleccion/orden/publicacion de `SocialLink`; divulgacion de certificados por afiliacion; alta, baja o cambio de especialidad ofrecida; cualquier dato que altere lo que el paciente ve como oferta del consultorio.
- **No se aplica en caliente una edicion publica:** al guardar, se crea/actualiza una propuesta de contenido pendiente. El directorio conserva la version anteriormente aprobada. Solo un OWNER activo distinto del profesional aprueba y publica la version revisada; el rechazo la descarta y exige correccion/nueva propuesta para reintentar.
- Un cambio de credencial o elegibilidad profesional global sigue el workflow de Profiles/plataforma y no se vuelve valido por aprobacion de un OWNER de consultorio. La afiliacion afectada deja de ofrecer una especialidad si la elegibilidad global deja de estar vigente.
- La implementacion debe controlar concurrencia/version: un OWNER aprueba exactamente la revision que reviso, no una edicion posterior. Una revision reemplazada no puede ser aprobada mediante una decision sobre una version obsoleta.

#### OWNER que tambien ejerce como profesional

Un `OWNER` puede solicitar una afiliacion como profesional, pero no puede aprobar, activar ni publicar la propia. La solicitud queda `PENDING_REVIEW` hasta que otro `OWNER` activo del mismo tenant la revise. El rol `ADMIN` de plataforma no actua como aprobador sustituto por defecto. Si el tenant no tiene un segundo `OWNER` activo, la solicitud no se publica; antes de habilitar la operacion clinica del owner se debe incorporar y validar un segundo owner. Este es un bloqueo deliberado fail-closed, no una aprobacion automatica ni una excepcion implicita.

**Consecuencia de migracion:** las relaciones actuales apuntan a `ProfessionalProfile.id`. Antes de materializar afiliaciones tenant-aware hay que definir, en slices de Catalog/Scheduling/Appointments, cuales referencias migran a la afiliacion y cuales siguen apuntando al perfil global. No duplicar ni reasignar perfiles existentes mecanicamente: una migracion prematura podria cruzar servicios, horarios o citas.

### 3. ClientProfile

**Decision propuesta:** mantener `ClientProfile` como perfil personal/global de `User`, no como dato propiedad de un consultorio y sin `tenantId`.

- Un cliente puede tener citas en varios tenants; la relacion con cada consultorio surge de la cita o de una relacion de cliente-tenant definida por el slice de Appointments, no de copiar el perfil personal.
- Una membership `OWNER`/`MEMBER` no se crea automaticamente por registrarse como cliente ni por conocer el ID de un consultorio.
- Acceso a citas e historial se autoriza por tenant y por participacion como cliente. El slice de Appointments debe definir el mecanismo seguro para un cliente autenticado que no sea miembro operativo; no debe concederse acceso a todo el tenant ni exponerse el historial global del cliente.
- Datos de contacto visibles al consultorio se limitan a la proyeccion necesaria para la cita; no se expone el perfil global completo por estar asociado a un appointment.

Esto evita que la membership operativa se convierta en un falso sinonimo de “paciente registrado” y preserva una sola ficha personal. Requiere que Appointments implemente una politica de participante tenant-scoped antes de habilitar consultas de historial en SaaS.

### 4. AdminProfile y administracion

- `AdminProfile` permanece global, asociado uno-a-uno a un `User` de plataforma; no pertenece a un Tenant y no recibe membership automaticamente.
- El rol actual `ADMIN` representa Platform Operator conforme a la decision aprobada del primer slice: no es `OWNER`, no concede acceso tenant y no habilita bypass.
- La administracion cotidiana de afiliaciones profesionales corresponde al `OWNER` del tenant, con alcance limitado a ese consultorio y sin autoaprobacion.
- La operacion de plataforma se mantiene separada de la administracion de consultorios. Las acciones excepcionales de soporte/plataforma sobre una afiliacion deben tener una capacidad global explicita y auditada; `User.role` por si solo no basta.
- Los endpoints actuales bajo `/api/admin` son legacy globales. No se reinterpretan silenciosamente como administracion tenant. Su migracion requiere reemplazar la politica y verificar que cada query se limita al tenant.

### 5. Relacion con TenantMembership y varios tenants

Para cualquier mutacion de afiliacion:

```text
ActorContext.userId
  + TenantContext.tenantId validado
  + TenantMembership.status === ACTIVE
  + politica contextual (OWNER o propietario MEMBER)
  -> operacion de afiliacion acotada a ese tenant
```

El selector `X-Tenant-ID` solo selecciona el contexto. La membership se consulta en persistencia y se valida en cada request protegida, conforme al primer slice aprobado. Un profesional miembro de A y B opera sobre la afiliacion del tenant indicado; nunca se busca o actualiza “la afiliacion actual” de forma ambigua.

Una membership suspendida no se elimina ni borra afiliacion, citas o auditoria. La reactivacion permite volver a operar segun la politica del tenant; no republica automaticamente una afiliacion que haya sido retirada o desaprobada por separado.

### 6. Visibilidad publica

- La presencia de un perfil personal global no lo hace publicable en todos los consultorios.
- El directorio publico se construye desde afiliaciones `ACTIVE` del tenant resuelto, con Tenant activo y membership profesional `ACTIVE`. Los filtros se aplican en la consulta de persistencia; no se carga el perfil global para filtrar despues en memoria.
- `GET /api/professionals/Allprofiles` lista perfiles publicables solo del tenant indicado por `X-Tenant-ID`; sin selector valido responde `400`, y nunca cae al directorio global.
- `GET /api/professionals/:id` conserva `:id` como el ID global existente de `ProfessionalProfile` para compatibilidad de identificadores. La consulta exige una afiliacion `ACTIVE` de ese perfil en el tenant seleccionado, membership activa y Tenant activo. El repositorio filtra simultaneamente por ID y tenant antes de devolver el perfil.
- Para `GET /:id`, perfil inexistente, sin afiliacion en ese tenant, afiliacion no publicable o membership inactiva producen la misma respuesta `404` y cuerpo generico; no revelan existencia en otro tenant. El listado devuelve `200 []` si no hay afiliaciones publicables.
- El DTO conserva sus claves y tipos existentes durante el primer corte. Su contenido se arma combinando campos globales expresamente publicables con los campos de afiliacion de ese tenant. `certificates` se conserva como propiedad de respuesta, pero queda vacia hasta que exista divulgacion explicita por afiliacion; `socialLinks`, descripcion, rating y especialidades se limitan al tenant. La afiliacion interna no se expone como nuevo ID HTTP sin versionar/aprobar contrato.
- **Resolucion anonima del tenant:** las rutas publicas reciben `X-Tenant-ID` desde el enlace, dominio o configuracion publica del consultorio. El ID es un selector publico, no una credencial ni prueba de autorizacion. La resolucion valida formato y consulta directamente que el Tenant exista y este `ACTIVE`; no llama a `GET /api/tenancy/current`, no requiere `authMiddleware` ni consulta una membership del visitante. El endpoint `/current` sigue reservado para usuarios autenticados y su validacion de membership no se reutiliza para el directorio.
- Un selector ausente o malformado responde `400` con el error de selector invalido. Un ID bien formado que no corresponde a un Tenant existente o activo responde `404` con un cuerpo generico identico (por ejemplo, `{ "message": "Directorio no disponible" }`); no se distingue entre inexistente e inactivo ni se devuelve metadata del tenant. No se usa fallback global. Un Tenant activo sin perfiles publicables devuelve `200 []`.
- Resolver un Tenant activo no basta para publicar perfiles: la consulta del directorio se filtra en persistencia por ese `tenantId`, afiliacion `ACTIVE`, membership `ACTIVE` del profesional y version aprobada. Las respuestas no incluyen memberships ni contenido pendiente. Un visitante autenticado y uno anonimo obtienen la misma proyeccion publica; la membership del visitante no amplia datos ni permisos.
- El selector numerico puede identificar tenants activos que habilitan un directorio publico; no es un secreto y su enumeracion no concede acceso a datos privados. La proteccion anti-enumeracion de perfiles se mantiene: `GET /:id` responde de forma uniforme para perfil inexistente, ajeno al tenant o no publicable. Si Producto requiere que ni siquiera se pueda descubrir si un ID de tenant esta activo, eso exige otro contrato publico (por ejemplo, selector opaco o resolucion por dominio) y queda como decision previa a implementar, sin cambiar aqui el selector aprobado.
- Las rutas publicas no exponen citas, datos de clientes ni perfiles no aprobados.

#### Matriz propuesta de ownership y visibilidad de campos

| Campo/concepto actual | Owner y scope propuesto | Perfil privado | Directorio publico por tenant |
|---|---|---|---|
| `User.email`, credenciales, verificacion de cuenta | Identity, global | Solo el propio usuario y flujos Identity | Nunca |
| `name`, `lastName` | Profiles, dato personal global del profesional | Profesional y permisos operativos que lo requieran | Proyeccion del nombre solo si existe afiliacion `ACTIVE`; el mismo nombre se comparte entre tenants |
| `phone` | Profiles, global y privado | Profesional y casos de uso autorizados | Nunca; no se serializa en respuesta publica |
| `avatar` | Profiles, global en el primer corte | Profesional | Puede mostrarse solo junto a afiliacion `ACTIVE`; se comparte el mismo asset/valor entre tenants. Un override por tenant queda fuera de este ADR |
| `description` | Profiles, propiedad de la afiliacion tenant-specific | Visible al profesional y OWNER de ese tenant | Solo la ultima descripcion aprobada de la afiliacion `ACTIVE`; una edicion nueva queda pendiente |
| `verificationStatus` legacy de `ProfessionalProfile` | Legacy/global hasta migracion | Visible en administracion autorizada | No es criterio suficiente de publicacion ni se copia automaticamente a cada tenant |
| Estado de afiliacion | Profiles, por perfil+tenant | Profesional y OWNER de ese tenant | Solo `ACTIVE` |
| Rating (`ratingAvg`, `ratingCount`) | Reviews/Profiles projection, por tenant/afiliacion | Profesional y OWNER segun permiso | Solo agregado derivado de reviews del tenant; nunca rating global mezclado |
| `ProfessionalSpecialty` | Profiles, elegibilidad/revision profesional global, ver seccion 7 | Profesional y revisores de plataforma autorizados | No demuestra que se ofrece en la clinica |
| Especialidad ofrecida por la afiliacion | Catalog/Profiles contract, por afiliacion y tenant | Profesional y OWNER | Solo oferta aprobada y activa en ese tenant |
| Certificados | Profiles, evidencia profesional global | Profesional y revisores autorizados | No se publican por defecto; requieren consentimiento/seleccion explicita por afiliacion. Hasta existir esa seleccion, la respuesta publica no expone certificados |
| `SocialLink` | Profiles, publicacion seleccionada por afiliacion | Profesional; OWNER ve la seleccion aprobada y propuestas pendientes | Solo links aprobados/habilitados para esa afiliacion; cambios quedan pendientes y no se propagan globalmente |
| `ClientProfile.name`, `lastName`, `phone`, `avatar` | Profiles, personal/global | Cliente | Nunca en directorio profesional; el consultorio recibe solo proyeccion minima vinculada a una cita autorizada |
| `AdminProfile` y datos de plataforma | Profiles/platform, global | Operadores de plataforma autorizados | Nunca |

Este primer diseno fija defaults conservadores de privacidad. Cualquier override tenant-specific adicional requiere una decision explicita antes de ampliar el DTO.

### 7. Onboarding legacy

`POST /api/auth/register` permanece en `auth` hasta migrar mediante el process coordinator de [ADR_REGISTRATION_ONBOARDING.md](ADR_REGISTRATION_ONBOARDING.md). No crea Tenant, membership ni afiliacion por inferencia, y no se mueve a Identity.

Durante la transicion:

- Se conserva metodo, path, request y DTO/status HTTP existentes.
- Los perfiles profesionales creados por el flujo legacy sin tenant quedan como **legacy/no afiliados**: no aparecen en directorios tenant-scoped ni habilitan servicios, agendas o citas SaaS.
- No se les asigna un tenant por default, por rol, por especialidad ni por ser el unico consultorio conocido.
- La asociacion futura se realiza solo mediante un proceso interno/controlado con mapping validado y auditoria.

En el onboarding futuro, Identity provisiona la cuenta; Profiles provisiona el perfil personal y, cuando se presenta una invitacion/asignacion tenant valida, la afiliacion; Tenancy valida o provisiona membership bajo su contrato; Catalog valida especialidades. La coordinacion conserva una transaccion local unica mientras compartan base, segun la ADR de onboarding. El registro publico no crea consultorios automaticamente bajo este diseno.

La fila `ProfessionalSpecialty` que crea hoy el registro legacy se conserva conceptualmente como **solicitud global de elegibilidad profesional para una especialidad**, en estado `PENDING`; no es una credencial verificada ni una oferta de servicio para una clinica. La aprobacion global habilita que una afiliacion pueda solicitar/ofrecer esa especialidad, pero no publica automaticamente la especialidad en ningun tenant. La especialidad que una clinica ofrece pertenece a una relacion distinta, tenant-scoped y vinculada a la afiliacion, bajo contrato entre Profiles y Catalog. El slice de Catalog debe conservar o migrar las solicitudes legacy sin convertirlas silenciosamente en ofertas por tenant.

La elegibilidad global aprobada es una precondicion para solicitar la oferta local; la oferta se habilita solo cuando un `OWNER` distinto del profesional la aprueba para su afiliacion. Un OWNER profesional tambien necesita un segundo OWNER activo para esa aprobacion. La lista de especialidades aprobadas globalmente no se proyecta automaticamente en directorios tenant.

### 8. Backfill y rollout

No se puede inferir del baseline a que consultorio pertenece cada profesional ni cada cita. Por tanto:

1. Mantener `User`, `ClientProfile` y `AdminProfile` globales; no requieren backfill tenant.
2. Obtener un **conjunto explicito de pares** `(professionalProfileId, tenantId)` con procedencia y aprobacion del owner del dato. Un perfil puede tener cero, una o varias afiliaciones; multiples pares perfil-tenant distintos son validos y no constituyen conflicto por si mismos.
3. Ejecutar primero un dry-run que reporte perfiles sin mapping, pares duplicados, membership faltante, tenant inactivo y dependencias legacy ambiguas. Un conflicto significa informacion contradictoria sobre una asignacion concreta o referencias operativas que no permiten decidir a que afiliacion pertenecen; no significa simplemente que el perfil pertenezca a varios tenants.
4. No insertar afiliaciones para pares ambiguos o sin evidencia. Dejarlos legacy/no publicados hasta resolucion; no usar `DEFAULT_TENANT_ID` ni regla heuristica.
5. Los registros dependientes (especialidad ofrecida, servicio, horario, cita, rating) requieren su propio mapping/criterio tenant-scoped; no se asignan automaticamente a todas las afiliaciones de un perfil.
6. Migrar por tenant/lote con conteos antes/despues, verificacion de FKs y posibilidad de rollback. No eliminar ni reescribir IDs referenciados hasta que los slices dependientes dispongan de un mapping estable.
7. Aplicar constraints finales solo despues de backfill aprobado y despliegue compatible. El estado nullable/transicional, si se necesita, debe tener fecha y criterio de retiro.

### 9. Compatibilidad HTTP

- Mantener paths y metodos actuales de `/api/users/*`, `/api/professionals/*` y `/api/admin/*`; no mover rutas por cambiar ownership.
- Rutas personales de `ClientProfile` y perfil base permanecen globales y autenticadas por Identity; sus datos no se convierten en tenant-scoped.
- Operaciones de afiliacion y directorio se ejecutan con `X-Tenant-ID`. El header es aditivo para clientes tenant-aware, pero volver obligatorio ese header cambia el comportamiento HTTP observable.
- Para preservar seguridad y compatibilidad: desplegar primero la capacidad del frontend/consumidor para enviar el selector; activar enforcement tenant por superficie en un corte coordinado; al corte, rechazar selector ausente (400) y no mantener un fallback global silencioso.
- Antes del corte, una ruta legacy que no exige tenant no se anuncia como tenant-safe y no puede servir datos de tenants nuevos. Usar una ventana de compatibilidad/feature gate solo si su limite y fecha de retiro quedan documentados.
- Las respuestas de autorizacion no revelan si existe un perfil en otro tenant. Para `GET /:id`, el comportamiento propuesto devuelve `404` generico para perfil inexistente, no afiliado o no publicable; el controller actual devuelve `403` para perfiles no aprobados, por lo que ese cambio de status es deliberado y debe coordinarse con frontend antes del corte.
- Las pruebas de contrato cubren DTO/status y la politica uniforme de recurso fuera de contexto. Las rutas y metodos se conservan, pero el header requerido y la politica uniforme de `404` son cambios observables, no se describen como compatibilidad transparente.

### 10. Prerrequisitos para los siguientes slices de Fase 3

1. **Catalog/especialidades:** contrato Profiles–Catalog definido en este ADR y detallado en [FASE3_PROFILES_TENANCY_SLICE.md](FASE3_PROFILES_TENANCY_SLICE.md): `ProfessionalSpecialty` es elegibilidad global, separada de la oferta local. La oferta no forma parte del primer slice Profiles–Tenancy. Conservar el alta legacy `PENDING`; la aprobacion global no equivale a oferta local.
2. **Profiles–Tenancy (slice operativo):** ejecutar el [plano de implementación](FASE3_PROFILES_TENANCY_SLICE.md) una vez cerrados sus tres gates; implementar afiliacion, lifecycle, autorizacion OWNER/MEMBER, matriz de campos, filtros y endpoints publicos tenant-scoped. El slice no migra aun servicios, horarios ni citas, pero sus FKs actuales deben mantenerse compatibles.
3. **Backfill Profiles:** disponer de un conjunto aprobado de pares perfil-tenant y reportar pares no asignables; no habilitar directorios tenant hasta contar con mapping.
4. **Scheduling:** depende de que horario pertenezca a una afiliacion profesional tenant-scoped y que lecturas publicas se resuelvan por tenant.
5. **Catalog de ofertas y Services:** requiere referencia a la afiliacion y validacion de que la especialidad elegible global se ofrece en el tenant. No confundir catálogo de especialidades con oferta clínica.
6. **Appointments:** requiere Catalog y Scheduling tenant-aware; resolver acceso de pacientes no-members, guest booking, participante, privacidad, snapshot y backfill de citas antes de habilitar rutas.
7. **Cron de appointments:** permanece excluido/no tenant-safe hasta que Appointment tenga tenant inequívoco y el worker use scope por tenant en lecturas, transiciones y notificaciones.
8. **Admin/profile review:** no habilitar las rutas legacy de admin sobre perfiles tenant-scoped hasta migrar la revisión de afiliaciones a OWNER y separar soporte de plataforma.
9. **Onboarding:** migrar el registro profesional afiliado después de los contratos de Identity, Profiles, Tenancy y Catalog; conservar el registro de elegibilidad `ProfessionalSpecialty` por separado de oferta tenant.

### 11. Criterios de aceptacion y pruebas requeridas antes de implementar

El diseño fue aprobado por Code Reviewer. Estos criterios verifican la implementación del slice; la aprobación de diseño no se considera aprobación del slice implementado:

| Criterio | Prueba minima |
|---|---|
| Un perfil profesional puede tener afiliaciones independientes en A y B sin compartir estado de publicacion, descripcion ni rating | Integracion: afiliacion activa en A, pendiente en B; consultas y cambios en A no alteran B |
| Editar un campo privado no requiere revision ni lo filtra al directorio | Unit/contrato: guardar telefono u otro campo privado conserva la publicacion y el DTO publico no lo incluye |
| Editar contenido publico en una afiliacion `ACTIVE` conserva la version vigente hasta revision | Integracion: se propone nueva descripcion/link en A; el directorio sigue mostrando la version aprobada, mientras B no cambia |
| Aprobacion/rechazo se aplica solo a la version revisada | Integracion concurrente: edicion posterior invalida la decision sobre la version anterior; aprobar publica exactamente la version revisada y rechazar mantiene la version publicada |
| Campos personales globales no se someten a aprobacion tenant por tenant | Contrato: editar nombre/avatar actualiza la proyeccion global autorizada en cada afiliacion publicable y se registra como cambio global |
| Ningun perfil sin afiliacion activa aparece en el directorio tenant | Integracion: perfil global aprobado pero sin afiliacion, afiliacion pendiente/rechazada/suspendida/withdrawn; todos excluidos |
| Filtro tenant se ejecuta en persistencia | Integracion/review de query: `GET /:id` consulta por ID global + tenant + estado publicable; no hace lookup global para filtrar despues |
| Un ID existente en otro tenant no es enumerable | Contrato HTTP: inexistente, no afiliado y no publicable devuelven mismo 404/body; nunca devuelven datos globales |
| Selector ausente/invalido no produce fallback | Contrato HTTP: `X-Tenant-ID` ausente/malformado -> 400; Tenant inexistente e inactivo comparten el 404 generico definido para cada endpoint; nunca hay fallback global |
| Visitantes anonimos resuelven el tenant sin membership | Contrato HTTP: GET publico con ID de tenant activo funciona sin token; tenant inexistente e inactivo devuelven el mismo 404 generico; membership del visitante no altera la respuesta; el query solo retorna afiliaciones y contenido publicables de ese tenant |
| Resolucion publica no reutiliza el contexto autenticado | Review de ruta/caso de uso: directorio no invoca `/api/tenancy/current` ni requiere `authMiddleware`; valida el selector contra Tenant activo y aplica filtros de publicacion en persistencia |
| Solo OWNER activo distinto aprueba/rechaza afiliaciones y ofertas de especialidad | Unit/integracion: MEMBER no revisa; OWNER del tenant A no revisa B; autoaprobacion se rechaza |
| OWNER profesional sin segundo reviewer no se publica | Integracion: self-review negado y afiliacion permanece pendiente hasta segundo OWNER activo |
| Rechazo, suspension, reactivacion y retiro siguen transiciones permitidas y auditables | Pruebas de tabla de transiciones, incluyendo transiciones invalidas |
| Toda decision y edicion revisable conserva evidencia suficiente | Integracion: submit/edit/approve/reject/suspend/reactivate/withdraw/reopen generan eventos append-only con actor, tenant, afiliacion, accion/transicion, revision y fecha UTC; rechazo/suspension/retiro por OWNER guardan motivo; una afiliacion reabierta conserva el historial anterior |
| Suspender membership bloquea acceso aunque afiliacion este ACTIVE | Integracion: membership suspendida impide operaciones y oculta directorio; no borra historial |
| Especialidad global aprobada no se ofrece automaticamente en tenants | Integracion de contrato Profiles/Catalog: elegibilidad global independiente de oferta de A/B; requiere aprobacion separada por afiliacion |
| Datos personales privados no se filtran | Contrato DTO: email, telefono de profesional y datos de cliente no aparecen en directorio |
| Backfill admite varios tenants y rechaza mapping ambiguo | Prueba dry-run: varios pares explicitos validos; perfil sin mapping/duplicado/refs contradictorias reportados |
| HTTP preserva rutas y shape publico aprobado | Pruebas de contrato para `GET /Allprofiles`, `GET /:id`, body/status y coordinacion del header requerido |

### 12. Contrato de identificadores publicos por endpoint

| Endpoint existente | Recurso e identificador | Consulta obligatoria | Resultado |
|---|---|---|---|
| `GET /api/professionals/Allprofiles` | Coleccion de proyecciones publicas de afiliacion; no retorna un directorio global de `ProfessionalProfile` | Resolver `X-Tenant-ID` contra Tenant `ACTIVE` sin autenticar al visitante; query en persistencia por tenant, afiliacion `ACTIVE`, membership del profesional `ACTIVE` y contenido aprobado | `200 []` si Tenant esta activo y no hay filas elegibles; selector ausente/malformado `400`; Tenant inexistente/inactivo `404` generico |
| `GET /api/professionals/:id` | `:id` sigue siendo el ID global de `ProfessionalProfile` para preservar compatibilidad | Resolver `X-Tenant-ID` como arriba; query en persistencia por `ProfessionalProfile.id = :id` Y afiliacion del tenant seleccionado Y estado/tenant/membership/contenido publicables | `200` solo si la relacion publica existe; perfil no encontrado/no publicable y Tenant inexistente/inactivo comparten `404 {message: "Perfil profesional no encontrado"}` |

No hay fallback global y no se busca el perfil primero por ID para luego comparar tenant en memoria. La forma final del DTO puede mantener claves actuales, pero campos de oferta, rating, links y descripcion deben derivarse de la afiliacion del tenant.

## Consecuencias y riesgos aceptados

- El perfil personal (nombre, apellido y avatar) se comparte entre consultorios; descripcion, aprobacion/publicacion, oferta de especialidades, links seleccionados, servicios, disponibilidad y rating no.
- Usuarios existentes no aparecen automaticamente en directorios tenant. La operacion puede requerir asignacion/manual mapping antes de habilitar SaaS.
- Mantener temporalmente endpoints legacy sin selector permite compatibilidad, pero no puede coexistir como acceso global a los mismos datos despues del corte tenant.
- Este ADR no resuelve el diseno completo de Profiles de Fase 4 ni autoriza la migracion de FKs existentes. Define el contrato semantico requerido para que los slices operativos no inventen ownership.

## Review anterior y cambios aplicados

El Code Reviewer devolvio `CHANGES_REQUESTED` con hallazgos sobre semantica de especialidades, lifecycle y revision de afiliaciones, campos publicos, recurso/ID de endpoints, cardinalidad del backfill y criterios de aceptacion. Esta revision:

| Hallazgo | Resolucion documental |
|---|---|
| P1 — significado de `ProfessionalSpecialty` y oferta local | Se define como solicitud/elegibilidad global; la oferta por afiliacion es una relacion separada aprobada dentro del tenant, y el alta legacy `PENDING` se conserva sin convertirla en oferta. |
| P1 — lifecycle/autoridad de afiliacion | Se especifican estados y transiciones, OWNER distinto como revisor, retiro/reintento y bloqueo fail-closed cuando el OWNER profesional no tiene segundo OWNER activo. |
| P2 — propiedad y privacidad de campos | Se agrega matriz para campos personales, afiliacion, proyeccion publica, certificados, links, rating, clientes y AdminProfile. |
| P2 — recurso y `:id` de rutas publicas | `:id` sigue siendo `ProfessionalProfile.id`; la query requiere ID + tenant + afiliacion/membership publicables y respuestas fuera de contexto son uniformes. Se registra el cambio observable 403→404. |
| P2 — cardinalidad de backfill | El mapping se define como conjunto de pares perfil-tenant; varias afiliaciones distintas son validas. Pares duplicados, evidencia contradictoria o referencias dependientes ambiguas se reportan separadamente. |
| P3 — criterios de aceptacion/pruebas | Se agregan pruebas de aislamiento, permisos, lifecycle, publicacion, query tenant-first, privacidad, backfill y contrato HTTP. |

Una revision posterior `CHANGES_REQUESTED` identifico dos reglas restantes —edicion de contenido publicado y contrato minimo de auditoria—, que se resuelven en las secciones 2, 3, 6 y 11 y en la siguiente matriz:

| Hallazgo | Resolucion documental |
|---|---|
| P1 — edicion de afiliacion activa | Separa datos privados/globales de contenido publico tenant-specific. Cambios publicos se proponen como revision; `ACTIVE` conserva la version aprobada hasta que otro OWNER aprueba, y el rechazo conserva la version publicada. |
| P2 — significado de “auditable” | Se define el evento minimo requerido, los campos de actor/tenant/objeto/accion/transicion/version/fecha y motivo cuando aplica, incluyendo reintentos sobre una afiliacion `WITHDRAWN`. |
| P1 — resolucion anonima del tenant | Se separa la resolucion publica del endpoint autenticado `/current`: el selector identifica un Tenant activo sin membership del visitante; tenant inexistente/inactivo comparte un `404` generico, y la consulta de perfiles aplica tenant, afiliacion, membership del profesional y publicacion en persistencia. |

La recomendacion de arquitectura para el siguiente slice es Profiles–Tenancy. El contrato de ofertas/especialidades con Catalog queda definido en el plano operativo enlazado; su implementacion pertenece a un slice posterior.

## Veredicto y límites de aprobación

El Code Reviewer aprobó el diseño Profiles–Tenancy el 2026-10-14, incluida la resolución anónima del tenant y las respuestas uniformes del directorio. El Responsable del proyecto Consultorios cerró, para el alcance de portafolio, el contrato Profiles–Catalog, la retención de auditoría por 24 meses desde `createdAt` y la aceptación de enumerabilidad de IDs numéricos activos el 2026-10-14. Las decisiones y límites están registrados en [FASE3_PROFILES_TENANCY_SLICE.md](FASE3_PROFILES_TENANCY_SLICE.md). No constituyen asesoría/certificación legal ni aprobación para un despliegue comercial o de producción.

Los servicios, horarios, citas, rutas administrativas legacy y jobs siguen fuera de la aprobación y no se declaran tenant-safe.
