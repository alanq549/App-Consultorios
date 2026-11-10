# Misión 0 — Decisiones de Catalog

## Objetivo

Resolver las decisiones bloqueantes de Fase 5 antes de modificar comportamiento, persistencia o datos.

## Hechos actuales

- `Specialty.name` es único global; CRUD está en `src/modules/specialty/`.
- `ProfessionalSpecialty` global tiene estados propios y la solicitud/revisión está en `src/modules/specialty/ProfessionalSpecialty/`.
- `Service` usa `profileId`, `specialtyId`, precio y duración; no guarda tenant/afiliación.
- El listado público de services deriva afiliación activa (Fase 3), pero la reserva consulta solo `serviceId + profileId`.
- Cambios de `Service` no bloquean citas futuras; desactivación sí intenta bloquearlas.
- Fase 4 aprobó Catalog como owner de la elegibilidad y `SuspendOnSpecialtyRevokedUseCase`; no reimplementar ese contrato.

## Estado

**READY FOR REVIEW — 2026-11-10.** Registro formal de decisiones D1–D8 elaborado en [01-DECISIONES-ARQUITECTURA.md](01-DECISIONES-ARQUITECTURA.md) para revisión y aprobación independiente del code reviewer.

## Decisiones sometidas a aprobación (D1 – D8)

El detalle completo se encuentra documentado en [01-DECISIONES-ARQUITECTURA.md](01-DECISIONES-ARQUITECTURA.md):

1. **D1 (Taxonomía):** `Specialty` permanece como catálogo global único de plataforma, administrado exclusivamente por `ADMIN`. No se duplica por tenant.
2. **D2 (Elegibilidad):** `ProfessionalSpecialty` es global, solicitada por profesional (máx. 2 pendientes) y revisada por `ADMIN`. Revocar la última especialidad aprobada invoca transaccionalmente `SuspendOnSpecialtyRevokedUseCase` de Profiles con row-level locking.
3. **D3 (Oferta tenant-scoped con vínculo canónico):** La oferta de servicio clínico se vincula de forma canónica y obligatoria a `ProfessionalTenantAffiliation` mediante `affiliationId`, garantizando la relación perfil/tenant por FK (respaldada por `@@unique([professionalProfileId, tenantId])` en `schema.prisma:137`). La unicidad pasa a `@@unique([affiliationId, name])`, permitiendo el mismo nombre de servicio en distintas clínicas con precio y duración independientes.
4. **D4 (Autorización de escritura):** Modificar ofertas requiere profesional autenticado, con perfil aprobado, membresía de tenant activa, afiliación activa en el tenant y especialidad globalmente aprobada.
5. **D5 (Inmutabilidad absoluta pre-snapshots ante cualquier cita):** Dado que los DTOs de `Appointment` leen precio y duración dinámicamente de `Service`, se bloquea toda modificación de `price`, `durationMin` o `specialtyId` si el servicio tiene **cualquier cita asociada** (pasada o futura; `ServiceImmutableTermsWithAppointmentsError`). Para nuevos términos comerciales, el profesional debe crear una nueva oferta. Desactivar servicios (`isActive = false`) con citas futuras o en curso (`Appointment.date` estandarizado a medianoche UTC, evaluando que `buildUTCDate(date, endMin) > now` con `status IN ('PENDING', 'CONFIRMED')`) está bloqueado con `ServiceHasPendingAppointmentsError`. **PRE-D5:** La regla de desactivación no es operativa hasta unificar la creación de `Appointment.date` en UTC en todos los flujos (`appointments.service.ts:42` y `:127`), evaluar datos existentes y agregar pruebas; estos requisitos son bloqueantes para la misión que implemente la desactivación.
6. **D6 (Especialidad inactiva):** Desactivar una `Specialty` bloquea nuevas solicitudes y nuevas ofertas, e inhabilita las ofertas existentes para nuevas reservas (`bookable = false`), preservando el histórico y citas existentes.
7. **D7 (Precio unívoco y moneda):** Moneda base **MXN**. Salida JSON estrictamente como `string` decimal con dos decimales (`/^\d+\.\d{2}$/`). Entrada valida máximo 2 decimales y rechaza con `400` cualquier valor con más decimales (sin redondeo silencioso). Obligatorio `price > 0`.
8. **D8 (Backfill controlado):** No se asignan tenants mágicos por defecto. Misión 3 ejecutará script de inventario, categorizando mapeos unívocos y marcando ambiguos para revisión humana previa al dry-run. No se modifica `schema.prisma` en Misión 0.

## Entregables y aceptación

- Registrar cada decisión con owner, scope, actor autorizado, rutas, efecto en citas y evidencia requerida: cumplido en [01-DECISIONES-ARQUITECTURA.md](01-DECISIONES-ARQUITECTURA.md).
- Mantener separado catálogo global, elegibilidad global y oferta tenant-scoped: delimitado en D1, D2 y D3.
- Registrar contratos de compatibilidad y esquema/migración requeridos: documentado en D5, D7 y D8.
- Estado **READY FOR REVIEW** hasta aprobación explícita; no cambiar `schema.prisma` en esta misión.
- Si una decisión no se aprueba, marcar las misiones afectadas BLOCKED y no inferir defaults.
