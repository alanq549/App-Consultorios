# Fase 4 — Registro de decisiones de Profiles

## Estado

**APPROVED — 2026-11-06.** Propuesta arquitectónica aprobada basada en schema, código, rutas y decisiones aprobadas de Fase 3. Establece la base para la ejecución de las Misiones 1–7.

## Reglas de separación

- `User`/Identity es cuenta global y conserva email, contraseña, verificación de cuenta y el único rol global.
- `ProfessionalProfile` base es global; `ProfessionalTenantAffiliation` y sus revisiones son tenant-scoped.
- La frontera, publicación y lifecycle de afiliaciones siguen las decisiones de [Fase 3](../FASE3_PROFILES_TENANCY.md); no se rediseñan aquí.
- Publicar exige contexto tenant válido y sus reglas de afiliación; `X-Tenant-ID` selecciona, no autoriza.
- Ningún `ADMIN` global sustituye a un OWNER/MEMBER ni obtiene bypass tenant.

## Ocho decisiones

### D1 — `ClientProfile`

- **Owner/scope:** Profiles; global, una fila por `User`. Campos `name`, `lastName`, `phone`, `avatar`.
- **Modifica:** el propio cliente autenticado, derivando `userId` del actor. Nadie puede elegir otro `userId`.
- **Revisa:** no hay aprobación de perfil; Identity verifica la cuenta, no los datos del perfil.
- **Ve/rutas:** el dueño en `GET /api/users/me` y modifica vía `PATCH /api/users/profile`, avatar vía `PATCH /api/users/avatar`. No hay directorio de clientes. Appointments solo puede usar la proyección mínima requerida por sus participantes; no amplía acceso a la ficha.
- **Privacidad:** phone y ficha no son públicos; OWNER de tenant y ADMIN no reciben acceso automático.

### D2 — `ProfessionalProfile` base

- **Owner/scope:** Profiles; global, uno por `User`. `name`, `lastName`, `avatar`, `phone`, `description` legacy, `verificationStatus`. Rating pertenece conceptualmente a Reviews/Fase 9 aunque sus columnas sigan en este modelo.
- **Modifica:** profesional dueño modifica datos base; solo ADMIN de plataforma modifica `verificationStatus`. `ratingAvg`/`ratingCount` los mantiene el flujo autorizado de Reviews, nunca el profesional.
- **Revisa:** ADMIN global solo el lifecycle de verificación global; OWNER solo revisa la revisión de afiliación de su tenant.
- **Ve/rutas:** dueño por `GET /api/users/me`; `PATCH /api/users/profile` y `/api/users/avatar`. Público, solo `name`, `lastName`, `avatar` y contenido aprobado de la afiliación por `GET /api/professionals/:id` o `/Allprofiles`, ambos con tenant activo.
- **Privacidad/contrato:** `phone`, `description` global y `verificationStatus` no se publican. El dueño y ADMIN pueden ver datos privados en sus vistas autorizadas; OWNER tenant no recibe acceso automático. Los endpoints públicos solo listan perfiles globalmente `APPROVED`, con al menos una specialty aprobada y afiliación publicable. **Cambio intencional de contrato:** quitar `verificationStatus` del DTO serializado de `GET /api/professionals/:id` y `/Allprofiles`; conservarlo en el DTO privado de `/api/users/me`. Actualizar el baseline y consumidores frontend antes de retirar el campo.
- **Gap observado:** ambos listados públicos actuales omiten el filtro global `APPROVED` y serializan `verificationStatus`; resolver en Misión 3, no mantenerlo por compatibilidad.

### D3 — ADMIN y `AdminProfile`

- **Owner/scope:** Identity posee el rol único global `ADMIN`; Profiles posee `AdminProfile` personal global (`name`, `lastName`, `avatar`).
- **Modifica:** ADMIN edita solo su propio perfil/avatar. El rol ADMIN autoriza operaciones globales de plataforma expresamente protegidas; no concede acceso a tenants.
- **Revisa:** no hay revisión de `AdminProfile`; Fase 3 reserva decisiones tenant a OWNER activo, distinto del profesional.
- **Ve/rutas:** ADMIN consulta su perfil en `/api/users/me`; avatar por `/api/users/avatar`. Rutas `/api/admin/*` exponen acciones globales de plataforma, no un perfil editable de otros admins. `/api/users/profile` hoy no acepta rol ADMIN; conservar esa limitación salvo cambio de contrato aprobado.

### D4 — `ProfessionalProfile.verificationStatus`

- **Owner/scope:** Profiles; estado único global, independiente de cualquier tenant y de `ProfessionalTenantAffiliation.status`.
- **Modifica/revisa:** ADMIN global autenticado; no el profesional ni OWNER/MEMBER. Centralizar ambos endpoints legacy en una sola regla: `PATCH /api/admin/profiles/:profileId/review` y `PATCH /api/admin/profiles/:profileId/status`.
- **Transiciones:** `PENDING → APPROVED | REJECTED`; `APPROVED → SUSPENDED`; `SUSPENDED → APPROVED`; `REJECTED` terminal. `APPROVED` exige al menos una `ProfessionalSpecialty` global `APPROVED`; perder la última specialty aprobada deja el perfil global `SUSPENDED`.
- **Visibilidad:** dueño y ADMIN pueden ver el estado en vistas privadas; no se publica el enum. Solo `APPROVED` puede pasar el gate público, además de cumplir afiliación y revisión aprobadas del tenant.
- **Distinción obligatoria:** el OWNER aprueba/rechaza `ProfessionalAffiliationRevision` y cambia el estado de afiliación dentro de su tenant por `/api/tenancy/affiliations`; esto no cambia `verificationStatus`.
- **Gap observado:** `reviewProfile` hoy omite el guard de specialty/transiciones de `setProfileStatus`; resolver al implementar D4, no aquí.
- **Notificaciones:** best-effort posterior al commit. Fallar la notificación no revierte ni cambia a error la revisión ya persistida; responder éxito de revisión, registrar el fallo con actor/perfil/acción en observabilidad y no afirmar entrega. Fase 4 no garantiza retry; outbox/reintentos confiables quedan en Fase 8.

### D5 — `ProfessionalSpecialty`

- **Owner/scope:** Catalog (Fase 5) es dueño de la relación global de elegibilidad entre profesional y taxonomía `Specialty`; no es oferta de un tenant. La oferta clínica tenant-scoped pertenece al slice de Catalog.
- **Modifica:** profesional solicita su elegibilidad por la ruta activa; no existe ruta activa de auto-retiro. ADMIN de plataforma revisa `PENDING/APPROVED/REJECTED`. OWNER de tenant no revisa esta relación global.
- **Rutas actuales:** solicitud activa `POST /api/professionals/specialties/:specialtyId`; revisión activa `PATCH /api/admin/:professionalId/specialties/:specialtyId/status` y alias `/api/professionals/:professionalId/specialties/:specialtyId/status`. El router separado `professionalSpecialty.routes.ts` no está montado en `app.ts`; su ruta `/me/specialties/...` no se considera contrato activo.
- **Visibilidad:** no se presenta por sí sola como servicio u oferta pública. Catalog decide qué oferta mostrar por tenant. Solo el resultado de elegibilidad necesario para el gate de aprobación se consume por Profiles como contrato de lectura.
- **Regla transversal:** aprobación global de specialty habilita elegibilidad, no publica perfil ni crea afiliación; cambio de afiliación no muta esta relación.
- **Coordinación Fase 4/5:** Profiles es owner del invariant de `verificationStatus`; Catalog es owner de la relación. El caso de uso de Catalog es dueño de la transacción exterior y pasa al contrato/port de Profiles la misma unidad de trabajo o cliente transaccional ya abierto. El adaptador/caso de uso de Profiles opera sobre ese contexto y **no abre otra transacción**. Al revocar la última specialty aprobada, Catalog llama síncronamente a Profiles para suspender el perfil antes del commit. Si la suspensión falla, el error se propaga y la transacción exterior revierte tanto la revocación como cualquier escritura parcial del perfil. Profiles define el contrato en Fase 4; Catalog lo integra en Fase 5. La consulta pública además exige estado `APPROVED` y specialty aprobada (defensa en profundidad). No cerrar las misiones afectadas hasta probar revocación, rollback por fallo de suspensión y ausencia del perfil en el directorio.

### D6 — `Certificate`

- **Owner/scope:** Profiles / credenciales profesionales; global y asociado al perfil del profesional, no a una afiliación.
- **Modifica:** solo el profesional dueño puede cargar/eliminar evidencia. En esta fase no se declara que el documento certifique una credencial verificada: el modelo no guarda estado de revisión.
- **Revisa:** nadie hasta que exista un flujo de revisión explícito; no inferir aprobación por haber subido archivo.
- **Ve/rutas:** el dueño en `/api/users/me`; carga/eliminación actuales en `/api/professionals/certificates` y `/:id`. No incluir metadata ni enlace en respuesta pública.
- **Privacidad objetivo:** archivo privado, accesible solo al dueño mediante entrega autorizada. **Gap bloqueante de implementación:** `app.ts` sirve `/certificates` como estático público; Fase 4 debe retirarlo o reemplazarlo por entrega autorizada antes de declarar certificados privados. No se corrige en Misión 0.

### D7 — Roles múltiples

- **Owner/scope:** Identity posee un único `Role` global por `User` (`ADMIN`, `PROFESSIONAL`, `CLIENT`), como establece el schema actual; no se agrega relación multi-role ni cambia JWT en Fase 4.
- **Modifica/revisa:** únicamente el flujo confiable de provisioning de Identity asigna el rol; no hay endpoint de Profiles para elevarlo o editarlo. Cambios futuros de política requieren aprobación de Identity/plataforma.
- **Permisos tenant:** se determinan por `TenantMembership` activa y rol contextual; la afiliación profesional es relación aparte. El perfil nunca concede membership.
- **Ve/rutas:** el actor ve su rol en `GET /api/users/me`; Identity lo usa en auth/JWT y middleware. `/api/admin/*` requiere rol global ADMIN; rutas OWNER validan membership/tenant mediante casos de uso. No autorizar por `role` enviado en body/header ni exponerlo en respuestas públicas.

### D8 — `description` y enlaces públicos

- **Decisión:** `ProfessionalProfile.description` es campo global legacy, privado y no es la biografía pública. No copiarlo automáticamente ni usarlo como fallback.
- **Owner/scope del contenido público:** Profiles/Affiliations; `ProfessionalAffiliationRevision.description` y `ProfessionalAffiliationRevisionSocialLink` pertenecen a cada `ProfessionalTenantAffiliation`, con versiones/revisión tenant-scoped de Fase 3.
- **Modifica/revisa:** el profesional propone contenido para su afiliación; un OWNER activo distinto lo aprueba/rechaza para ese tenant. La edición pendiente no sustituye la última aprobada.
- **Ve/rutas:** profesional ve sus afiliaciones por `/api/professionals/me/affiliations`; envía contenido por `POST /api/professionals/me/affiliations/:tenantId/revisions`; OWNER revisa por `/api/tenancy/affiliations/:affiliationId/revisions/:revisionId/review`; público ve solo la versión aprobada por `GET /api/professionals/:id` o `/Allprofiles` con `X-Tenant-ID`.
- **Legacy:** `/api/professionals/social-links*` y edición de `description` en `/api/users/profile` no pueden publicar contenido; retirarlos o adaptarlos a revisión de afiliación manteniendo compatibilidad documentada.

## Revisión y límites de la misión

- Confirmar/refutar estas propuestas explícitamente, en especial transición global, elegibilidad specialty y privacidad de certificados.
- Distinguir gaps de código de decisiones de dominio; no corregirlos en esta misión.
- No tocar Prisma, migraciones, rutas ni código. Tras aprobación, desbloquear solo misiones cuya decisión esté aceptada.
