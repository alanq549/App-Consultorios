# Slice Profiles–Tenancy — plan ejecutable

## Estado real

| Parte | Estado |
|---|---|
| A — directorio público tenant-scoped | **APPROVED** (2026-10-15); schema/migración y queries ya están. |
| B — afiliación propia, revisión OWNER y auditoría | **COMPLETED & TESTED** y cerrado (2026-10-23); dominio (33/33), casos de uso y UoW transaccional, HTTP (`/api/professionals/me/affiliations`, `/api/tenancy/affiliations`), validación de tenant activo, concurrencia pesimista en PostgreSQL verificada a nivel de repositorio y de caso de uso, y pruebas E2E (102/102). Sin hallazgos abiertos del Code Reviewer. |
| C — backfill y expiración de auditoría | Diferido hasta tener mappings/operación SaaS; no asignar tenants automáticamente. |

El schema/migración aditiva ya contiene afiliación, revisiones, links y auditoría. No crear otra migración salvo que el diseño revisado detecte un gap concreto.

## Revisión de lo implementado para B

Existen estados/tipos, máquina de estados, puertos de membership/afiliación/revisión/auditoría/tenant-checker, casos de uso completos para profesional y OWNER, adaptadores Prisma transaccionales (`PrismaAffiliationUnitOfWork`), endpoints HTTP protegidos y pruebas unitarias, de integración PostgreSQL y HTTP E2E.

Validación observada:

- `npx tsc --noEmit`: pasa sin errores (0).
- `npm run build`: `tsc && tsc-alias` compila a `dist/` exitosamente (0).
- `npx vitest run tests/profiles/profiles-affiliations`: **102/102 tests aprobados** (10 archivos de prueba).
- `npx vitest run`: **185/185 tests aprobados** en toda la suite (23 archivos de prueba sin regresiones).
- `npx vitest run tests/profiles/profiles-affiliations/concurrency-and-locking.integration.test.ts`: **7/7 tests aprobados**; comprueba en `pg_stat_activity`/`pg_blocking_pids` que el `FOR UPDATE` sobre `ProfessionalTenantAffiliation` se emite tanto en el repositorio como en los casos de uso de envío de contenido y de decisión del OWNER.
- Falsación ejecutada (mutación temporal, revertida): al retirar el lock del caso de uso, la sesión competidora queda bloqueada por la FK del `INSERT` (`KEY SHARE`), no por el `FOR UPDATE`; la aserción exige la sentencia específica, por lo que un bloqueo incidental no satisface la prueba.

## Orden de implementación de B

1. **Aplicación/persistencia:** use cases de solicitar/reabrir, consultar/editar contenido; OWNER lista, aprueba, rechaza, suspende y reactiva. Persistir cada transición y evento de auditoría en una transacción. Revalidar tenant y membership en cada operación.
2. **HTTP:** rutas protegidas para profesional y OWNER bajo `/api/professionals` y `/api/tenancy`; mantener `/api/tenancy/current`, registro legacy y directorio A sin cambios.
3. **Integración/revisión:** pruebas A/B, roles, autoaprobación, concurrencia, rollback de auditoría, contrato HTTP; suite, typecheck y build; enviar B al reviewer.

## Contrato mínimo de B

- Profesional: solicitar/reabrir, leer su afiliación, proponer descripción/enlaces, retirarse.
- OWNER activo distinto: listar, aprobar/rechazar afiliación o revisión, suspender/reactivar/retirar con motivo cuando corresponda.
- Rechazo de postulación cambia afiliación a `REJECTED`; rechazo de edición conserva `ACTIVE` y la versión publicada.
- `ADMIN` global no da permisos tenant. MEMBER no revisa ni administra afiliaciones ajenas.
- Todo lookup/escritura incluye `tenantId` en persistencia; ID de otro tenant se trata como no encontrado.

## Fuera de B

Catalog/ofertas, Services, Scheduling, Appointments, Reviews, clientes, certificados públicos, onboarding, cron y administración global.

## Operación diferida (C)

Backfill solo con mappings explícitos aprobados y dry-run; hoy no hay fuente para asignar perfiles existentes. Purga/anonimización de eventos se implementa antes de que venza el primer plazo de 24 meses o antes de un despliegue comercial. Sin cron automático; ejecución controlada e idempotente.

## Aceptación de B

33/33 pruebas de dominio; integración HTTP y persistencia multi-tenant; auditoría atómica; suite completa, `tsc`, build y migración verificados; Code Reviewer: P2 de concurrencia (lock del repositorio) resuelto, cobertura de lock por caso de uso añadida y sin hallazgos abiertos en la revisión final (2026-10-23).
