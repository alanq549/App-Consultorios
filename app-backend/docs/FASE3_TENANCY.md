# Fase 3 — Tenancy

## Estado

- Contexto Tenant/Membership (`GET /api/tenancy/current`): **APPROVED**.
- Profiles–Tenancy, diseño: **APPROVED**.
- Profiles–Tenancy Slice A, directorio público: **APPROVED**.
- Profiles–Tenancy Slice B, ciclo de vida de afiliación: **en preparación; no aprobado**.
- Fase 3 completa: **abierta**.

## Orden de trabajo

1. **Dominio B listo:** máquina de estados y tests unitarios 30/30.
2. Implementar casos de uso, persistencia, autorización OWNER y auditoría transaccional.
3. Añadir rutas y pruebas de integración; solicitar revisión del Slice B.
4. Planear backfill/retención operativos al habilitar SaaS; no asignar tenants por defecto.
5. Abrir slices separados para Catalog, Scheduling, Appointments y demás superficies.

## Límites

- `X-Tenant-ID` selecciona contexto; no concede acceso.
- Rutas públicas solo consultan afiliaciones publicables del tenant seleccionado.
- No inferir tenant por rol, especialidad, perfil único ni datos de citas.
- El `APPROVED` del directorio no vuelve tenant-safe Services, Schedule, Appointments, Reviews, Admin ni jobs.
- No crear membresías ni tenants automáticamente desde el registro legacy.

## Documentos de esta fase

- [FASE3_PROFILES_TENANCY.md](FASE3_PROFILES_TENANCY.md): decisiones aprobadas del límite.
- [FASE3_PROFILES_TENANCY_SLICE.md](FASE3_PROFILES_TENANCY_SLICE.md): estado real y siguiente slice.

## Evidencia vigente

- Slice A: 20 pruebas de directorio, suite reportada 83/83 y TypeScript sin errores al aprobarse (2026-10-15).
- Migración `20261015012759_profiles_tenancy` aplicada en base de pruebas.
- El documento técnico previo reportó discrepancia del historial de migraciones; volver a verificarla con Prisma antes del despliegue.
- Slice B local: tipos, máquina de estados, cuatro puertos y prueba unitaria; no hay aún casos de uso, adapters Prisma ni rutas.
- Prueba local observada (2026-10-17): `domain-state-machine.unit.test.ts`, 30/30.
- Esto valida solo la máquina de estados; no implica que Slice B esté implementado ni aprobado.
- TypeScript local: `npx tsc --noEmit`, sin errores.

## Cierre de Fase 3

La fase solo se cierra tras aislar y revisar los módulos operativos incluidos en el alcance SaaS acordado, probar rutas públicas y autenticadas, revisar jobs y migraciones, y obtener aprobación final. Ningún slice parcial equivale a ese cierre.
