# Fase 3 — Decisión Profiles–Tenancy

## Estado

**Diseño APPROVED por Code Reviewer — 2026-10-14.**
La aprobación cubre el límite de dominio, no el código del Slice B ni otros módulos.

## Decisiones

- `User`, `ClientProfile`, `ProfessionalProfile` y `AdminProfile` siguen globales.
- Una `ProfessionalTenantAffiliation` une perfil profesional y tenant: como máximo una por par; un perfil puede afiliarse a varios tenants.
- `TenantMembership` activa habilita operar; no equivale a afiliación profesional.
- Lifecycle de afiliación: `PENDING_REVIEW`, `ACTIVE`, `REJECTED`, `SUSPENDED`, `WITHDRAWN`.
- Solo un OWNER activo distinto del profesional puede aprobar/rechazar. No hay autoaprobación ni bypass por `User.role === ADMIN`.
- Bio y enlaces públicos son de la afiliación y requieren revisión. Se sirve la última versión aprobada mientras una edición está pendiente.
- Nombre/avatar son globales. Teléfono, email, datos de clientes y estado pendiente no se publican.
- Directorio público conserva sus paths e IDs de perfil; requiere `X-Tenant-ID` activo y filtra en persistencia. Sin selector: 400; tenant inexistente/inactivo: 404 genérico; sin resultados: 200 vacío.
- No se asignan tenants por defecto. El backfill requiere pares perfil–tenant explícitos y aprobados.
- `ProfessionalSpecialty` significa elegibilidad global, no oferta clínica. La oferta por afiliación corresponde a otro slice de Catalog.

## Decisiones de portafolio registradas

- Retención de auditoría: 24 meses desde `createdAt`; append-only durante operación normal; después, eliminación o anonimización controlada, salvo holds documentados.
- Se acepta que IDs numéricos de tenants activos sean enumerables. El ID no es credencial ni permite datos privados.
- Estas decisiones no son certificación legal ni aprobación de despliegue comercial.

## No cubierto

Services, horarios, citas, Reviews/rating, clientes, certificados públicos, onboarding tenant-aware, administración global y workers requieren decisiones/slices propios.

## Implementación

Ver [FASE3_PROFILES_TENANCY_SLICE.md](FASE3_PROFILES_TENANCY_SLICE.md). Slice A aprobado; Slice B **COMPLETED & TESTED** y cerrado (2026-10-23), con documentación sincronizada y sin hallazgos abiertos del Code Reviewer; Slice C: retención de auditoría (C1) y purga de auditoría vencida (C2) **COMPLETED & TESTED** (2026-10-24); el backfill permanece diferido hasta contar con mappings perfil–tenant explícitos aprobados.
