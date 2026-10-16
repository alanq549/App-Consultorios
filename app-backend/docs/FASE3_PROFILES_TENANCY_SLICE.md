# Plano de implementación — Fase 3: Profiles–Tenancy

## Estado y alcance de aprobación

**Diseño Profiles–Tenancy: `APPROVED` por Code Reviewer (2026-10-14).**

**Los tres gates de diseño están cerrados para el alcance de portafolio.** La decisión de retención y enumerabilidad fue tomada por el Responsable del proyecto Consultorios el 2026-10-14. No constituye certificación legal ni aprobación para un despliegue comercial o de producción.

Este documento descompone [FASE3_PROFILES_TENANCY.md](FASE3_PROFILES_TENANCY.md) en un primer slice operativo verificable. La aprobación del ADR no aprueba por sí misma este código ni hace tenant-safe otros módulos de Fase 3.

### Estado de implementación por sub-slice

El slice operativo se ejecuta en dos sub-slices independientes para conservar incrementos verificables y revisables por separado:

| Sub-slice | Alcance | Estado |
|---|---|---|
| **Slice A — Directorio público tenant-scoped** | Esquema y migración aditiva; resolución pública de `Tenant ACTIVE` por `X-Tenant-ID`; lecturas públicas tenant-scoped (`GET /api/professionals/Allprofiles`, `GET /api/professionals/:id`); respuestas `400`/`404` uniformes; DTO con `certificates` y `specialties` vacíos y `rating` en cero | **APPROVED** por Code Reviewer. Evidencia en la sección “Evidencia de implementación — Slice A”. |
| **Slice B — Ciclo de vida de afiliación y comandos OWNER** | Solicitar/editar/retirar/reabrir la afiliación propia; revisión `OWNER` (aprobar/rechazar/suspender/reactivar); escritura de auditoría append-only; control de concurrencia; backfill controlado y comando de retención de auditoría | **PENDIENTE de implementación.** Sin autorización de código hasta recibir el plano del Slice B. |

El alcance funcional, los criterios de aceptación y el contrato HTTP descritos en este documento cubren ambos sub-slices. El `APPROVED` del Slice A no acredita el Slice B ni autoriza módulos fuera de alcance (Catalog, Scheduling, Appointments, Services, clientes, certificados públicos ni revisión admin global).

## Gates de diseño y decisiones previas

Estado y evidencia de los gates al 2026-10-14:

| Gate | Estado | Decisión / evidencia para cierre |
|---|---|---|
| Catalog — oferta de especialidades | **CERRADO como decisión de arquitectura para el límite Profiles–Catalog.** | Contrato fijado en la sección “Contrato Profiles–Catalog” de este documento. No autoriza a implementar ofertas dentro de este slice. |
| Auditoría — política de retención del portafolio | **CERRADO como decisión de diseño; no es asesoría ni certificación legal.** | Responsable del proyecto Consultorios acepta 24 meses desde `createdAt`, append-only durante operación normal, eliminación/anonimización controlada al vencer y excepciones documentadas para obligaciones legales, investigaciones de seguridad o preservación justificada. |
| Enumerabilidad — decisión de producto del portafolio | **CERRADO como decisión de diseño del proyecto.** | Responsable del proyecto Consultorios acepta la enumerabilidad de IDs numéricos de tenants activos. El ID no es credencial; se mantienen respuestas genéricas y filtros de datos públicos. |

La decisión se toma por el Responsable del proyecto Consultorios porque es un proyecto de portafolio sin equipo independiente de Producto ni asesoría Legal asignada. Es válida como política del alcance actual; antes de un despliegue comercial/producción debe revisarse con responsables competentes. Si la decisión de enumerabilidad cambia, se requiere revisar selector y resolución pública como cambio de diseño; no se sustituye silenciosamente por slug o dominio.

### Registro de decisión del proyecto

Estas decisiones son independientes de la aprobación del ADR y se registran explícitamente:

| Decisión | Resultado | Responsable y rol | Fecha | Condiciones / referencia |
|---|---|---|---|---|
| Política de retención de auditoría | **ACCEPTED** | Responsable del proyecto Consultorios | 2026-10-14 | 24 meses desde `createdAt`; proceso controlado para eliminar o anonimizar; excepciones justificadas y documentadas. No certifica cumplimiento legal. |
| Enumerabilidad de tenants activos mediante `X-Tenant-ID` numérico | **ACCEPTED** | Responsable del proyecto Consultorios | 2026-10-14 | El ID identifica el directorio público, nunca autoriza datos privados; tenant inexistente/inactivo comparte 404 genérico. |

## Objetivo del slice

Crear afiliaciones profesionales independientes por tenant, someter la primera publicación y cambios de contenido público a revisión de `OWNER`, y servir el directorio público únicamente desde una afiliación publicable del tenant seleccionado. Todo filtro tenant-owned se ejecuta en persistencia.

Al terminar el slice:

- un profesional puede tener cero o una afiliación por tenant y varias afiliaciones en tenants distintos;
- solicitar o reabrir afiliación no publica contenido;
- solo un `OWNER` activo distinto del profesional puede aprobar/rechazar;
- la membership activa del profesional es requisito operativo; suspenderla bloquea mutaciones y oculta el directorio;
- el directorio anónimo recibe tenant por `X-Tenant-ID` sin consultar membership del visitante;
- cada edición pública produce una revisión versionada; solo la versión revisada puede aprobarse;
- no existe backfill implícito ni se asignan tenants por rol, especialidad o heurística.

## Alcance funcional exacto

### Incluido

1. Afiliación `ProfessionalProfile`–`Tenant`, lifecycle `PENDING_REVIEW`, `ACTIVE`, `REJECTED`, `SUSPENDED`, `WITHDRAWN`.
2. Revisión versionada de la descripción pública y de los social links que se publican en esa afiliación.
3. Auditoría append-only de solicitudes, cambios, decisiones, suspensión/reactivación, retiro, reapertura y backfill.
4. Proceso operacional controlado para expirar datos de auditoría después de 24 meses, con dry-run y ejecución explícita.
5. Consultas públicas existentes `GET /api/professionals/Allprofiles` y `GET /api/professionals/:id`, ahora tenant-scoped y con `X-Tenant-ID`.
6. Operaciones autenticadas para solicitar/consultar/editar/retirar la afiliación propia y para listar/revisar/administrar afiliaciones del tenant como `OWNER`.
7. Resolución pública independiente del contexto autenticado `/api/tenancy/current`.
8. Importación de mappings perfil–tenant revisados, ejecutable primero en modo dry-run.
9. Una ampliación binaria de estado de tenant para poder distinguir `ACTIVE` e `INACTIVE` en la resolución pública. No se agregan workflows administrativos de lifecycle de tenant.

### Resultado público del primer slice

Para conservar las claves y tipos del DTO legacy sin publicar datos globales como si fueran tenant-owned:

- nombre y avatar proceden del perfil global, solo cuando existe afiliación publicable;
- descripción y social links proceden de la última revisión aprobada de esa afiliación;
- `certificates` se conserva como propiedad vacía; no se implementa divulgación de certificados;
- `specialties` se conserva como propiedad vacía hasta implementar el slice Catalog que materialice las ofertas;
- `ratingAvg` y `ratingCount` se mantienen como `0` mientras no exista rating tenant-scoped;
- `verificationStatus` conserva su valor legacy global por compatibilidad y no determina la publicación. El consumidor debe dejar de usarlo como indicador de autorización/publicabilidad;
- no se serializan email, teléfono, datos de cliente, membership ni estado de revisión pendiente.

La forma externa de respuesta conserva rutas, claves y tipos del DTO actual, con esos cambios intencionales de contenido. El listado no obtiene fallback global.

## Contrato Profiles–Catalog

Este contrato cierra la ambigüedad semántica para el límite; la oferta local y el módulo Catalog siguen fuera del código de este slice.

### Conceptos y ownership

1. **`Specialty`**: definición global del catálogo, propiedad de Catalog. Catalog controla identidad, nombre/metadata global y disponibilidad (`isActive`). Profiles referencia `specialtyId`; no crea ni modifica definiciones de catálogo.
2. **`ProfessionalSpecialty`**: elegibilidad global del profesional, propiedad de Profiles y asociada a `ProfessionalProfile`. Conserva el lifecycle legacy `PENDING` / `APPROVED` / `REJECTED`; nunca significa oferta ni publicación en un tenant.
3. **Oferta clínica**: relación distinta, conceptual `ProfessionalAffiliationSpecialty`, propiedad de Profiles y asociada a `ProfessionalTenantAffiliation` + `Specialty`. No se implementa en el primer slice Profiles–Tenancy. Su ownership en Profiles refleja que su alcance es la afiliación y que el `OWNER` del tenant decide su publicación; Catalog conserva la autoridad sobre la definición global del término.

### Contrato de la oferta para el slice Catalog posterior

- Cardinalidad: única por `(affiliationId, specialtyId)`. El tenant se deriva de la afiliación y no se duplica en la fila de oferta.
- Campos mínimos: `id`, `affiliationId`, `specialtyId`, `status`, `requestedByUserId`, `requestedAt`, `reviewedByUserId?`, `reviewedAt?`, `rejectionReason?`, `createdAt`, `updatedAt`; índices por `(affiliationId, status)` y `(specialtyId, status)`.
- Estados: `PENDING_REVIEW`, `APPROVED`, `REJECTED`, `WITHDRAWN`. Profesional con membership `ACTIVE` propone; un `OWNER` activo distinto del profesional aprueba/rechaza; rechazo requiere motivo; reintento crea una nueva solicitud/auditoría conservando la decisión anterior. No existe autoaprobación ni aprobación global por `ADMIN`.
- Precondiciones de publicación: afiliación `ACTIVE`, membership `ACTIVE` del profesional, definición `Specialty.isActive = true`, elegibilidad global `ProfessionalSpecialty.status = APPROVED` y oferta local `APPROVED`. Todas se verifican en la query de directorio, no solo en el servicio de escritura.
- Suspensión de la afiliación o membership, desactivación de `Specialty` o pérdida de elegibilidad global elimina la especialidad del resultado público inmediatamente, sin borrar la oferta ni su auditoría. La reactivación solo vuelve a exponerla cuando todas las precondiciones estén satisfechas.
- El API futuro consumido por Catalog/Profiles usa `specialtyId` estable y devuelve estado de elegibilidad y disponibilidad; no comparte entidades Prisma entre módulos ni permite que Catalog apruebe la afiliación/oferta.
- El slice actual conserva `specialties: []` en el DTO público y no crea offers desde `ProfessionalSpecialty`, ni en onboarding ni en backfill.

## Cambios de schema y migración Prisma

Los gates de diseño están cerrados para el alcance del portafolio. El schema y la migración solo se modifican al iniciar formalmente la implementación del slice; este documento no aprueba ni ejecuta esos cambios.

### Modelos/enums aditivos

1. **`TenantStatus`:** agregar `INACTIVE` junto a `ACTIVE`; mantener `ACTIVE` como default. El resolver público solo acepta `ACTIVE`; `INACTIVE` no es resoluble y comparte error con tenant inexistente. Este es un ajuste explícito al lifecycle mínimo previo de Tenancy: solo añade el estado binario necesario para cumplir el contrato del directorio, sin introducir invitaciones, suspensión temporal, archivado o borrado.
2. **`ProfessionalAffiliationStatus`:** `PENDING_REVIEW`, `ACTIVE`, `REJECTED`, `SUSPENDED`, `WITHDRAWN`.
3. **`AffiliationRevisionStatus`:** `PENDING_REVIEW`, `APPROVED`, `REJECTED`, `SUPERSEDED`.
4. **`AffiliationAuditAction`:** `APPLY`, `SUBMIT_CONTENT`, `SUPERSEDE_CONTENT`, `APPROVE_AFFILIATION`, `REJECT_AFFILIATION`, `APPROVE_CONTENT`, `REJECT_CONTENT`, `SUSPEND`, `REACTIVATE`, `WITHDRAW`, `REOPEN`, `BACKFILL`.
5. **`ProfessionalTenantAffiliation`:**
   - `id`, `professionalProfileId`, `tenantId`, `status`, `createdAt`, `updatedAt`;
   - relaciones a `ProfessionalProfile` y `Tenant` con regla referencial explícita `onDelete: Restrict`;
   - `unique(professionalProfileId, tenantId)`;
   - índices `(tenantId, status)` y `(professionalProfileId, status)`.
   - No almacena `userId` duplicado ni `membershipId`: la pertenencia se valida contra `ProfessionalProfile.userId` y `TenantMembership(userId, tenantId)` en cada operación.
6. **`ProfessionalAffiliationRevision`:**
   - `id`, `affiliationId`, `revisionNumber`, `status` (`AffiliationRevisionStatus`), `description`;
   - relación a `ProfessionalTenantAffiliation` con regla referencial explícita `onDelete: Restrict`;
   - `submittedByUserId`, `submittedAt`, `reviewedByUserId?`, `reviewedAt?`, `rejectionReason?`, `createdAt`;
   - `unique(affiliationId, revisionNumber)` e índices `(affiliationId, status)` y `(status, submittedAt)`.
   - Una revisión se inserta; una edición pendiente la marca `SUPERSEDED` y crea otra. Una decisión recibe `revisionId` y solo opera si esa es la última revisión pendiente. Revisar una versión vieja devuelve conflicto y no altera la publicada.
7. **`ProfessionalAffiliationRevisionSocialLink`:**
   - `id`, `revisionId`, `type`, `url`, `createdAt`;
   - relación a `ProfessionalAffiliationRevision` con regla referencial explícita `onDelete: Restrict`;
   - `unique(revisionId, type)` e índice `(revisionId)`. Cada versión contiene su conjunto completo de links aprobado; no apunta a los links globales actuales.
8. **`ProfessionalAffiliationAuditEvent`:**
   - `id`, `tenantId`, `affiliationId`, `revisionId?`, `actorUserId?`, `action` (`AffiliationAuditAction`), `previousStatus?`, `nextStatus?`, `reason?`, `changedFields` JSON, `sourceReference?`, `occurredAt`, `createdAt`;
   - desacoplado de cascadas: los identificadores de actor, tenant, afiliación y revisión son snapshots escalares sin FKs relacionales en cascada que borren el historial;
   - índices por `(tenantId, affiliationId, occurredAt)`, `(actorUserId, occurredAt)` y `(createdAt)`;
   - `occurredAt` registra cuándo ocurrió la acción; `createdAt` registra cuándo se persistió y es el ancla inmutable de retención (24 meses). No se copian payloads privados ni credenciales.

`ProfessionalProfile` recibe la relación inversa a afiliaciones. No se alteran los campos actuales ni las FK de `Service`, `Schedule`, `Appointment`, `ProfessionalSpecialty`, `Certificate` o `SocialLink`.

### Contrato de persistencia: integridad referencial e inmutabilidad histórica

Para garantizar que ningún registro histórico o de auditoría sea eliminado accidentalmente por operaciones en cascada:

1. **Acciones referenciales compatibles con PostgreSQL y Prisma:**
   - `ProfessionalTenantAffiliation`:
     - `@relation(fields: [professionalProfileId], references: [id], onDelete: Restrict)`
     - `@relation(fields: [tenantId], references: [id], onDelete: Restrict)`
     *Regla:* Un borrado directo de `ProfessionalProfile` o `Tenant` es bloqueado por la base de datos (PostgreSQL `23503 foreign_key_violation`, Prisma `P2003`). Se prohíbe terminantemente `onDelete: Cascade`.
   - `ProfessionalAffiliationRevision`:
     - `@relation(fields: [affiliationId], references: [id], onDelete: Restrict)`
     *Regla:* La afiliación no puede eliminarse si contiene revisiones.
   - `ProfessionalAffiliationRevisionSocialLink`:
     - `@relation(fields: [revisionId], references: [id], onDelete: Restrict)`
     *Regla:* Los links de una versión específica quedan inmutables vinculados a su revisión.

2. **Decisión deliberada de arquitectura sobre `ProfessionalAffiliationAuditEvent`:**
   - Los campos `tenantId`, `affiliationId`, `revisionId` y `actorUserId` son **escalares snapshot sin claves foráneas (FK) físicas en PostgreSQL**.
   - *Justificación arquitectónica:*
     - Desacoplar el ciclo de vida del log forense de las entidades operativas del dominio.
     - Inmunidad absoluta contra borrados en cascada no deseados provocados por modificaciones futuras en tablas padre.
     - Prevención de dependencias circulares y bloqueos durante el proceso operacional de purga/anonimización controlada a los 24 meses.
     - Preservación del registro histórico aun ante archivado de cuentas o tenants en fases posteriores.
   - *Garantía de consistencia:* La validez de estos identificadores se verifica en la capa de aplicación dentro de la transacción interactiva antes de emitir el evento.
   - *Índices de consulta forense:* Se crean índices específicos en PostgreSQL:
     - `@@index([tenantId, affiliationId, occurredAt])`
     - `@@index([actorUserId, occurredAt])`
     - `@@index([createdAt])` (para retención y dry-run de purga a 24 meses).

### Contrato de atomicidad y control de concurrencia

Regla de oro de persistencia: **"Cero transiciones de estado o revisiones sin evento de auditoría"**.

1. **Transaccionalidad obligatoria:** Toda operación que altere el estado de una afiliación (`ProfessionalTenantAffiliation.status`), inserte una nueva revisión, altere el estado de una revisión (`ProfessionalAffiliationRevision.status`) o superseda una propuesta, **DEBE ejecutarse dentro de una transacción interactiva de Prisma (`prisma.$transaction(async (tx) => { ... })`)**.

2. **Estrategia explícita de concurrencia (Prevención de race conditions):**
   Para evitar que dos revisiones concurrentes se aprueben simultáneamente, o que decisiones concurrentes se sobrescriban (lost update):
   - **Bloqueo pesimista de fila raíz en PostgreSQL (`SELECT ... FOR UPDATE`):**
     Al iniciar la transacción de decisión o mutación de contenido, se adquiere un bloqueo exclusivo sobre la afiliación:
     ```ts
     await tx.$queryRaw`SELECT id FROM "ProfessionalTenantAffiliation" WHERE id = ${affiliationId} FOR UPDATE`;
     ```
     Esto serializa cualquier intento concurrente de revisión, aprobación, rechazo o edición sobre la misma afiliación a nivel de motor de base de datos.
   - **Actualización condicional atómica:**
     La mutación de la revisión se ejecuta con precondición estricta sobre el estado pendiente:
     ```ts
     const updated = await tx.professionalAffiliationRevision.updateMany({
       where: { id: revisionId, affiliationId, status: "PENDING_REVIEW" },
       data: { status: "APPROVED", reviewedByUserId, reviewedAt: now },
     });
     if (updated.count === 0) {
       throw new ConflictException("La revisión ya no se encuentra en estado pendiente o fue procesada por otra operación");
     }
     ```
   - **Rollback y consistencia:** Si `updated.count === 0`, o si falla la inserción en `ProfessionalAffiliationAuditEvent`, la transacción lanza excepción y PostgreSQL ejecuta `ROLLBACK` completo, respondiendo con `409 Conflict`. Queda prohibido el uso de listeners asíncronos en memoria para persistir auditoría.

### Migración y orden en PostgreSQL

- **Naturaleza aditiva y restricciones de enums en PostgreSQL:**
  - `ALTER TYPE "TenantStatus" ADD VALUE IF NOT EXISTS 'INACTIVE';` es aditivo.
  - *Restricción de versión de PostgreSQL:* En PostgreSQL, un nuevo valor añadido a un tipo enum no puede ser utilizado en operaciones DML (`INSERT`/`UPDATE`) ni referenciado como default en la misma transacción DDL que lo crea (error 55P04: *unsafe use of new value of enum type*).
  - La migración de este slice se limita estrictamente a declarar el nuevo valor en el enum; no ejecuta `UPDATE` sobre registros existentes hacia `'INACTIVE'` en esa migración (los existentes permanecen `'ACTIVE'`).
- **Disciplina operacional de migraciones (Cero destructividad):**
  - Queda **terminantemente prohibido** ejecutar `prisma db push --force-reset`, `prisma migrate reset` o cualquier comando destructivo que reinicialice la base de datos o altere el historial de migraciones existente.
  - La migración debe generarse exclusivamente mediante `npx prisma migrate dev --create-only` para auditar manualmente el archivo SQL resultante antes de su ejecución con `npx prisma migrate deploy` / dev.
- **Relaciones y FKs:**
  - Las nuevas tablas respetan integridad referencial con `onDelete: Restrict`; la tabla de auditoría no usa FKs con cascada.
  - La reversión no debe borrar datos operativos ya creados. Antes de rollout, definir migración correctiva/roll-forward para registros parciales y conservar backup conforme a política.

### Retención y eliminación/anonimización controlada

- Implementar un comando operacional específico de auditoría, fuera del request path y no ejecutado automáticamente por un cron en este slice. Sin `--execute` es dry-run y reporta conteo/rango de eventos cuyo `createdAt <= now - 24 months`.
- La ejecución requiere invocación explícita por operador autorizado y una segunda confirmación del ambiente/alcance. Para eventos bajo excepción de preservación, recibe referencias de hold documentadas y los excluye; nunca se infiere una excepción.
- Al vencer el plazo sin hold, el proceso puede borrar o anonimizar según el modo aprobado para esa ejecución. Debe ser idempotente, por lotes y registrar quién, cuándo, modo, rango y conteo en un log operacional separado que no se escriba en la tabla que está expirando.
- Errores parciales deben reportar lotes completados/fallidos y permitir reejecución segura; no se presenta éxito si quedan filas vencidas sin tratar.
- La aplicación mantiene la auditoría append-only durante operación normal. La expiración aprobada es el único proceso de eliminación/anonimización y no altera eventos vigentes.

## Casos de uso y autorización

### Profesional afiliado

- **Solicitar afiliación:** usuario autenticado cuyo ID corresponde a `ProfessionalProfile.userId` y con `TenantMembership` activa en el tenant del selector. No usa `User.role` para conceder autoridad tenant. Crea una afiliación `PENDING_REVIEW` y su revisión inicial pendiente. No requiere ni crea membership, tenant o especialidad.
- **Consultar afiliación propia:** la query exige simultáneamente `professionalProfile.userId = actor.id`, `tenantId` seleccionado y membership activa.
- **Editar contenido público:** solo el profesional dueño de la afiliación y con membership activa. Crea una revisión completa de descripción y links; si había una propuesta pendiente, la supersede. La versión aprobada se sigue sirviendo.
- **Retirarse/reabrir/reintentar:** retiro propio pasa a `WITHDRAWN`. Reapertura de una afiliación en `WITHDRAWN` o reintento de postulación tras haber sido `REJECTED` inicia un nuevo ciclo `PENDING_REVIEW` reutilizando el registro existente (respetando la restricción `unique(professionalProfileId, tenantId)`), crea una nueva versión de revisión pendiente y conserva auditoría y revisiones previas.

### OWNER del tenant

- Listar afiliaciones del tenant y revisar la afiliación/revisión pendiente; la consulta siempre incluye el `tenantId` validado y `TenantMembership.role = OWNER`, `status = ACTIVE`.
- Aprobar/rechazar usando la versión `revisionId` que se revisó. Autoaprobación/autoría propia se deniega. Rechazo requiere motivo.
  - **Rechazo sobre afiliación `PENDING_REVIEW` (`REJECT_AFFILIATION`):** rechaza la solicitud de afiliación completa (afiliación -> `REJECTED`, revisión -> `REJECTED`); no queda publicable.
  - **Rechazo sobre afiliación `ACTIVE` (`REJECT_CONTENT`):** rechaza únicamente la propuesta de actualización de contenido (`revisionId` -> `REJECTED`); la afiliación **permanece `ACTIVE`** y la versión de contenido previamente aprobada continúa publicada e inalterada en el directorio. Para dar de baja una afiliación activa, el OWNER utiliza `/withdraw` o `/suspend`, no `/reject`.
- Suspender/reactivar/retirar afiliaciones únicamente dentro del tenant propio; suspensión y retiro requieren motivo. Reactivación exige que tenant y membership del profesional estén activos.
- Un tenant con un único OWNER no puede autoaprobar su afiliación; queda pendiente hasta que exista otro OWNER activo. No se introduce bypass de plataforma.

`User.role === ADMIN` no otorga acceso ni bypass tenant. La revisión global legacy de profesional/especialidad continúa separada y no puede aprobar una afiliación.

## Endpoints y contrato HTTP propuesto

Todas las rutas protegidas usan `authMiddleware`, parsean `X-Tenant-ID` y verifican membership activa en base de datos por request. El resolver público no usa `authMiddleware` ni `/api/tenancy/current`.

| Método y ruta | Acceso/operación | Respuesta y errores principales |
|---|---|---|
| `GET /api/professionals/Allprofiles` | Público anónimo; resolver tenant activo y listar revisiones publicables tenant-scoped | `200 []` si no hay resultados; header ausente/malformado `400`; tenant inexistente/inactivo `404 {message:"Directorio no disponible"}` |
| `GET /api/professionals/:id` | Público anónimo; `:id` sigue siendo `ProfessionalProfile.id`; query conjunta por perfil + tenant + afiliación/revisión publicables | `200` si publicable; el mismo `404 {message:"Perfil profesional no encontrado"}` para inexistente, ajeno, inactivo o no publicable; header inválido `400` |
| `POST /api/professionals/affiliations` | Usuario autenticado que posee perfil profesional y membership activa; body `{description, socialLinks:[{type,url}]}`. Crea afiliación si no existe, o reabre/reintenta una en estado `WITHDRAWN` o `REJECTED` iniciando nuevo ciclo `PENDING_REVIEW` con nueva revisión pendiente | `201` al crear; `200` al reabrir/reintentar; afiliación en trámite o activa duplicada (`PENDING_REVIEW`, `ACTIVE`, `SUSPENDED`) `409`; perfil inexistente `404`; sin membership `403`; validación `400` |
| `GET /api/professionals/affiliations/me` | Profesional dueño, tenant seleccionado y membership activa | `200`; afiliación propia inexistente `404`; sin membership `403` |
| `PUT /api/professionals/affiliations/me/content` | Profesional dueño; body `{description, socialLinks:[{type,url}]}` reemplaza la propuesta completa y crea nueva revisión pendiente | `202`; conflicto de estado `409`; sin membership `403`; validación `400` |
| `POST /api/professionals/affiliations/me/withdraw` | Profesional dueño retira; requiere motivo cuando la transición la inicia OWNER, no al retiro propio | `200`; estado no transicionable `409` |
| `GET /api/tenancy/professional-affiliations?status=PENDING_REVIEW` | OWNER activo del tenant | `200 []` o colección tenant-scoped; MEMBER `403` |
| `POST /api/tenancy/professional-affiliations/:id/approve` | OWNER activo; body `{revisionId}`; aprueba afiliación inicial y versión o, si ya está `ACTIVE`, solo publica la revisión; sin autoaprobación | `200`; revisión obsoleta/estado inválido `409`; fuera del tenant `404`; self-review `403` |
| `POST /api/tenancy/professional-affiliations/:id/reject` | OWNER activo; body `{revisionId, reason}`. Si afiliación está en `PENDING_REVIEW`: rechaza afiliación (`REJECTED`) y revisión (`REJECTED`) emitiendo `REJECT_AFFILIATION`. Si afiliación está en `ACTIVE`: rechaza únicamente la revisión de contenido (`REJECTED`) emitiendo `REJECT_CONTENT`, manteniendo la afiliación `ACTIVE` y la publicación vigente intacta | `200`; motivo requerido `400`; fuera del tenant `404`; self-review `403`; revisión no pendiente/obsoleta `409` |
| `POST /api/tenancy/professional-affiliations/:id/suspend` | OWNER activo; body `{reason}` | `200`; motivo requerido `400`; fuera del tenant `404` |
| `POST /api/tenancy/professional-affiliations/:id/reactivate` | OWNER activo | `200`; precondición inactiva/estado inválido `409` |
| `POST /api/tenancy/professional-affiliations/:id/withdraw` | OWNER activo retira afiliación de otro profesional; body `{reason}` | `200`; motivo requerido `400`; no se permite operar fuera del tenant |

Los status/body para membresía siguen la política tenant aprobada: selector inválido `400`, no autenticado `401`, tenant/membership inexistente o inactivo y falta de rol contextual `403` en rutas protegidas. Ninguna ruta pública expone metadata del tenant inactivo.

## Superficies y archivos que implementará el slice

Los paths son la distribución objetivo; no se crean en este trabajo documental.

| Archivo o módulo | Cambio previsto |
|---|---|
| `prisma/schema.prisma` | Enum binario `TenantStatus`, enums/modelos de afiliación, revisión, links versionados y auditoría; relación inversa a `ProfessionalProfile`. |
| `prisma/migrations/<timestamp>_profiles_tenancy/` | Migración aditiva con enums, tablas, FK e índices; sin backfill automático. |
| `prisma/backfills/profiles-tenancy-backfill.ts` | Comando separado, dry-run por defecto, input explícito de pares aprobados e informe reproducible. |
| `scripts/retention/professional-affiliation-audit.ts` | Comando controlado de retención, dry-run por defecto, ejecución explícita, soporte documentado para holds y log operacional fuera de la auditoría expirada. |
| `src/modules/tenancy/application/ports/` y `use-cases/` | Puerto y caso de uso de resolución pública `Tenant ACTIVE` por ID, independiente de membership del visitante. |
| `src/modules/tenancy/infrastructure/prisma/` | Query selectiva del tenant público activo. No reutiliza `findMembershipContext` para visitas anónimas. |
| `src/modules/profiles/affiliations/domain/` | Estados, transiciones y errores de dominio. |
| `src/modules/profiles/affiliations/application/ports/` | Puertos de afiliación/revisión/auditoría; contratos para membership activa y TenantContext explícitos. |
| `src/modules/profiles/affiliations/application/use-cases/` | Solicitar, consultar propia, editar, revisar, suspender, reactivar, retirar, reabrir y consultar directorio. |
| `src/modules/profiles/affiliations/infrastructure/prisma/` | Implementaciones tenant-scoped, transacciones de decisión+auditoría y consulta pública filtrada en persistencia. |
| `src/modules/profiles/affiliations/http/` | DTOs, controller y router de comandos/revisiones; rutas montadas bajo `/api/professionals` y `/api/tenancy`. |
| `src/modules/users/professionalprofile/professionalprofile.routes.ts` | Mantener las dos rutas públicas existentes, delegando a consulta tenant-scoped; no exponer rutas globales equivalentes. Orden estricto de registro en router: (1) `GET /Allprofiles`, (2) sub-rutas `/affiliations/*`, `/social-links/*`, `/certificates/*`, y (3) la ruta dinámica `GET /:id` estrictamente al final para evitar captura accidental de rutas literales. |
| `src/modules/users/professionalprofile/professionalprofile.controller.ts`, `professionalprofile.service.ts`, `professionalprofile.dto.ts`, `professionalprofile.type.ts` | Mantener paths y shape; quitar lookup global público y mapear proyección aprobada; las rutas personales legacy no mutan contenido publicado por afiliación. |
| `src/modules/tenancy/http/tenancy.routes.ts` y/o `src/app.ts` | Montar routers sin alterar `/api/tenancy/current`; este último sigue autenticado. |
| `tests/profiles-affiliations/` | Unit/integración/HTTP de lifecycle, autorización, revisión, aislamiento, auditoría y backfill. |
| `tests/tenancy/` | Casos del resolver público activo/inactivo y verificación de que `/current` sigue protegido. |

No se cambia `auth.service.ts`: el registro legacy sigue creando perfil y solicitud global `ProfessionalSpecialty`, pero no afiliación.

## Backfill y rollout

### Backfill explícito

- Fuente: archivo aprobado de pares, mínimo `professionalProfileId,tenantId,sourceReference,approvedByUserId`. Un perfil puede tener varios pares tenant distintos; el par duplicado se reporta como conflicto.
- No derivar mappings desde citas, servicios, horarios, especialidad, rol global, tenant único ni heurística. El script no crea Tenant ni membership.
- Dry-run obligatorio: validar perfil, Tenant `ACTIVE`, membership `ACTIVE` del mismo usuario/tenant, aprobación/procedencia y duplicados; emitir conteos y filas rechazadas sin escrituras.
- Carga: transacción por lote idempotente; crear afiliación `PENDING_REVIEW` y una revisión inicial pendiente. La descripción global puede copiarse solo como propuesta no publicada para revisión del OWNER; links no se seleccionan automáticamente. Registrar evento `BACKFILL` y origen.
- Ninguna fila importa el `verificationStatus` global como aprobación local. No hay asignación por defecto. Si no hay mappings aprobados, el directorio SaaS queda vacío hasta solicitudes explícitas.
- No migrar en este slice servicios, horarios, citas, reseñas, notificaciones ni sus FKs.

### Corte compatible

1. Gates de diseño cerrados para el portafolio; antes de un despliegue comercial/producción, revisar estas políticas con Producto/Legal y seguridad. Desplegar soporte frontend/consumidores para `X-Tenant-ID` en directorio.
2. Aplicar migración, ejecutar dry-run y aprobar el reporte; luego importar mappings.
3. Activar el nuevo query público en ambos paths en un único corte coordinado. Sin header válido: `400`, nunca fallback global.
4. Comunicar el cambio actual de `GET /:id` para no aprobado (`403` actual) a `404` uniforme y el nuevo filtrado de lista. Paths, claves y tipos del DTO se mantienen; contenido global deja de proyectarse como tenant.
5. Mantener separados los endpoints legacy autenticados de SocialLink/Certificate y revisión global de admin. Sus datos no aparecen en directorio salvo que estén incluidos en una revisión de afiliación aprobada.

La ruta `GET /api/tenancy/current` no sirve a visitantes y no se usa para resolver el header del directorio. El slice no incorpora una operación HTTP de administración de lifecycle para cambiar `Tenant.status`; el estado `INACTIVE` queda disponible para provisioning/plataforma autorizado y fixtures, sujeto al contrato de administración futuro.

## Fuera de este slice

- Catalog: cambios de catálogo y asociación/aprobación de especialidades ofrecidas. `specialties` público queda vacío; cerrar el gate no equivale a implementar el slice Catalog.
- Services, horarios/Scheduling, Appointment, guest booking, Reviews/rating real, citas, snapshots y sus backfills/FKs.
- Clientes, `ClientProfile`, `AdminProfile`, onboarding/registro con tenant o creación automática de membership.
- Revisión administrativa global de `ProfessionalProfile`/`ProfessionalSpecialty`; no se convierte `User.role=ADMIN` en OWNER.
- Certificados públicos, almacenamiento/divulgación tenant-scoped de certificados.
- Notificaciones, workers/cron, pagos, reportes y exportaciones.
- Selector por slug, dominio/subdominio, tenant switching UX y cualquier fallback al directorio global.
- Roles/estados de membership nuevos, invitaciones, organizaciones, sucursales, hard delete o políticas completas de baja de tenant.
- Fase 3 completa: aprobar este slice no certifica aislamiento operativo fuera de Profiles–Tenancy.

## Pruebas y criterios de aceptación para solicitar review

### Unitarias

- Tabla completa de transiciones de afiliación y revisión; estados inválidos retornan conflicto.
- MEMBER/OWNER pueden modificar solo acciones permitidas; ADMIN global no recibe bypass.
- No autoaprobación; un OWNER profesional requiere otro OWNER activo.
- Decisión sobre una revisión obsoleta no se aplica a una revisión posterior.
- Rechazos/suspensiones/retiros requeridos fallan sin motivo; auditoría captura actor, tenant, transición, revisión y UTC.
- Ediciones append-only superseden pendiente anterior y conservan la versión publicada.

### Integración/repositorio

- Queries de lista e ID incorporan tenant, Tenant ACTIVE, afiliación ACTIVE, membership profesional ACTIVE y revisión APPROVED en la misma query; no hay fetch global seguido de filtro en memoria.
- Usuario con afiliaciones A y B no lee, cambia ni revisa contenido de la otra.
- Suspender membership oculta del público y deniega mutaciones sin borrar affiliation/revision/audit.
- Tenant inactivo e inexistente devuelven exactamente el mismo error público; tenant activo vacío devuelve lista vacía.
- Todas las transiciones y su evento de auditoría confirman atómicamente dentro de `prisma.$transaction`; una falla inducida en la inserción de auditoría aborta la transacción y revierte cualquier cambio en la afiliación o revisión (rollback verificado en base de datos).
- Integridad referencial: el intento de borrado directo (`DELETE`) de un `Tenant`, `ProfessionalProfile` o `ProfessionalTenantAffiliation` asociado a revisiones falla con error de clave foránea (`P2003` en Prisma, `23503` en PostgreSQL) por `onDelete: Restrict`.
- Control de concurrencia: dos decisiones concurrentes (`approve` vs `approve`, o `approve` vs `reject`) sobre la misma revisión compiten bajo `Promise.all`; el bloqueo pesimista o actualización condicional garantiza que exactamente una triunfa (200 OK) y la otra es rechazada con conflicto (409 Conflict), persistiendo un único evento en `ProfessionalAffiliationAuditEvent`.
- Auditoría/revisiones no se borran por cascada accidental; retención/eliminación coincide con política aprobada.
- Eventos con menos de 24 meses no se eliminan; dry-run informa precisamente los elegibles; ejecución requiere flag explícito, respeta holds y es idempotente. El registro operacional de ejecución no contiene motivos ni payloads de auditoría.

### HTTP/contrato

- GET público activo funciona sin token y da la misma proyección con token o sin él; membership del visitante no la altera.
- `X-Tenant-ID` ausente, malformado, inexistente o inactivo cumple códigos/cuerpos de la matriz HTTP; no hay fallback.
- ID de perfil ajeno, inexistente o no publicable produce el mismo `404` y body.
- MEMBER no puede aprobar/rechazar; OWNER de A no modifica afiliaciones de B; self-review denegado.
- Los dos paths públicos existentes conservan DTO key/type; no se filtran email, teléfono, certificates, memberships ni propuesta pendiente.
- Rutas existentes de `/api/tenancy/current`, registro legacy y operaciones personales no cambian su autenticación ni shape.
- El orden de registro en Express garantiza que `GET /api/professionals/Allprofiles` y sub-rutas como `/affiliations/me` nunca sean capturadas erróneamente por el handler dinámico `GET /api/professionals/:id`.

### Backfill/validación

- Dry-run no escribe; salida incluye totales importables, duplicados, referencias inválidas, tenants/memberships inactivos y pares sin procedencia.
- Mapping explícito permite varios tenants para un perfil; rerun no duplica y no convierte `PENDING_REVIEW` en `ACTIVE`.
- `npm test`, `npx tsc --noEmit`, `npm run build`, `npx prisma validate` y tests de integración contra PostgreSQL pasan después del cambio. Probar migración desde baseline actual y rollback/roll-forward en ambiente de prueba.

## Criterio de cierre

El slice completo (Slice A + Slice B) se solicita a Code Reviewer después de implementar y pasar las pruebas anteriores, revisar el diff de schema/migración, y confirmar que no se modificaron los límites fuera de alcance. Los gates de diseño se aceptan para este portafolio; esa aceptación no equivale a certificación legal ni `APPROVED` de implementación. El Slice A ya cumple este criterio dentro de su alcance; el Slice B permanece pendiente.

## Evidencia de implementación — Slice A: Directorio público tenant-scoped

> Esta sección registra la evidencia técnica del Slice A, aprobada por el Code Reviewer. Se mantiene separada de las decisiones de diseño de las secciones anteriores. El veredicto se limita al directorio público de solo lectura; no acredita el Slice B ni los módulos fuera de alcance.

**Veredicto del Code Reviewer:** `APPROVED` para el alcance del directorio público multi-tenant (2026-10-15).

### Cambios de código

| Capa | Archivo | Responsabilidad |
|---|---|---|
| Tenancy / Application | `src/modules/tenancy/application/ports/public-tenant-repository.ts` | Puerto `PublicTenantRepository` y tipo `PublicTenantRecord`. |
| Tenancy / Application | `src/modules/tenancy/application/use-cases/resolve-public-tenant-use-case.ts` | `ResolvePublicTenantUseCase`: valida `Tenant ACTIVE` sin membership del visitante y lanza `404` (`PUBLIC_TENANT_NOT_FOUND`, “Directorio no disponible”). |
| Tenancy / Infrastructure | `src/modules/tenancy/infrastructure/prisma/prisma-public-tenant-repository.ts` | Consulta Prisma `tenant.findFirst({ id, status: "ACTIVE" })`. No reutiliza `findMembershipContext`. |
| Tenancy / HTTP | `src/modules/tenancy/http/resolve-public-tenant.middleware.ts` | Middleware público: parsea `X-Tenant-ID` (`400` si es ausente/malformado), resuelve el tenant activo y expone `res.locals.tenantId`. |
| Shared | `src/shared/errors/AppError.ts` | Campo opcional `code` para identificar el error (`PUBLIC_TENANT_NOT_FOUND`). |
| Profiles / HTTP | `src/modules/users/professionalprofile/professionalprofile.routes.ts` | Registra `GET /Allprofiles` primero, mantiene sub-rutas y deja `GET /:id` al final con `resolvePublicTenantMiddleware(profileTenantNotFoundHandler)`. |
| Profiles / HTTP | `src/modules/users/professionalprofile/professionalprofile.controller.ts` | Delega al servicio usando `res.locals.tenantId`; elimina el `403` por `verificationStatus` y unifica el `404` genérico. |
| Profiles / Application | `src/modules/users/professionalprofile/professionalprofile.service.ts` | `getPublicById`/`getAllPublic` filtran en persistencia por `tenantId`, `status: ACTIVE`, `tenant.status: ACTIVE`, `TenantMembership ACTIVE` del profesional y revisión `APPROVED`; proyectan nombre/avatar globales con descripción y links de la última revisión aprobada. |

### Esquema y migración

- **`prisma/schema.prisma`:** enums `ProfessionalAffiliationStatus`, `AffiliationRevisionStatus`, `AffiliationAuditAction`; `TenantStatus` recibe `INACTIVE`; modelos `ProfessionalTenantAffiliation` (`unique(professionalProfileId, tenantId)`), `ProfessionalAffiliationRevision`, `ProfessionalAffiliationRevisionSocialLink` y `ProfessionalAffiliationAuditEvent` (identificadores snapshot sin FKs en cascada); relaciones inversas en `User` y `ProfessionalProfile`. `onDelete: Restrict` en las nuevas FKs.
- **`prisma/migrations/20261015012759_profiles_tenancy/migration.sql`:** migración aditiva (enums, tablas, índices y FKs); `ALTER TYPE "TenantStatus" ADD VALUE 'INACTIVE'` sin `UPDATE` en la misma migración y sin backfill automático.

### Resultados de validación

| Validación | Resultado | Comando ejecutado |
|---|---|---|
| Pruebas del directorio público | **20/20** | `npx vitest run tests/professionals/public-directory.http.test.ts` |
| Suite completa | **83/83, 13 archivos** | `npx vitest run` |
| TypeScript | **Sin errores** | `npx tsc --noEmit` |

**Cobertura de escenarios (`tests/professionals/public-directory.http.test.ts`):** listado público sin autenticación; proyección idéntica con y sin token; aislamiento entre tenants; exclusión de afiliaciones `PENDING_REVIEW`, `SUSPENDED`, `REJECTED`, `WITHDRAWN` y sin revisión `APPROVED`; ocultamiento por membership `SUSPENDED`; conservación de la versión aprobada ante una edición pendiente; `400` por `X-Tenant-ID` ausente/malformado; `404` uniforme para tenant inexistente/inactivo, perfil inexistente y perfil ajeno al tenant; calificaciones en cero; ausencia de `email`/`phone` y de `certificates`/`specialties` en la proyección pública.

### Límites explícitos de este sub-slice

- **No implementa** el ciclo de vida de afiliación ni los comandos autenticados (solicitar/editar/retirar/reabrir/revisar); corresponden al Slice B.
- **No implementa** la escritura de eventos de auditoría, el backfill controlado ni el comando de retención de auditoría, pese a que las tablas ya existen.
- **No declara** tenant-safe los módulos operativos (Catalog, Scheduling, Appointments, Services, clientes, certificados públicos, revisión admin global ni cron).
- La tabla `ProfessionalAffiliationAuditEvent` existe pero aún no recibe escrituras; su contrato de atomicidad permanece sin validar hasta el Slice B.

### Estado de migraciones por entorno

La migración `20261015012759_profiles_tenancy` está generada y aplicada en la base de pruebas. Subsiste el **antecedente de discrepancia del historial de migraciones** registrado en [FASE3_TENANCY.md](FASE3_TENANCY.md) (sección 19.6): las pruebas HTTP operan sobre el esquema ya aplicado y no reconcilian el historial. La reconciliación debe validarse antes de declarar lista la estrategia de despliegue.
