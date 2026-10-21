# Slice Profiles–Tenancy — plan ejecutable

## Estado real

| Parte | Estado |
|---|---|
| A — directorio público tenant-scoped | **APPROVED** (2026-10-15); schema/migración y queries ya están. |
| B — afiliación propia, revisión OWNER y auditoría | Dominio listo (30/30); aplicación, persistencia y HTTP pendientes. |
| C — backfill y expiración de auditoría | Diferido hasta tener mappings/operación SaaS; no asignar tenants automáticamente. |

El schema/migración aditiva ya contiene afiliación, revisiones, links y auditoría. No crear otra migración salvo que el diseño revisado detecte un gap concreto.

## Revisión de lo implementado para B

Existen estados/tipos, máquina de estados, puertos de membership/afiliación/revisión/auditoría y pruebas unitarias de dominio.

Validación observada:

- `npx tsc --noEmit`: pasa.
- `npx vitest run tests/profiles/profiles-affiliations/domain-state-machine.unit.test.ts`: **30/30** (2026-10-17).
- Aún faltan casos de uso, adapters Prisma, transacciones y endpoints B; los 30 tests validan reglas de dominio, no el slice integrado.

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

30/30 pruebas de dominio; integración HTTP y persistencia multi-tenant; auditoría atómica; suite completa, `tsc`, build y migración verificados; aprobación explícita del Code Reviewer.
