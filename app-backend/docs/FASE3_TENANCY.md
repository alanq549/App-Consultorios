# Fase 3 — Tenancy

## Estado

- Contexto Tenant/Membership (`GET /api/tenancy/current`): **APPROVED**.
- Profiles–Tenancy, diseño: **APPROVED**.
- Profiles–Tenancy Slice A, directorio público: **APPROVED**.
- Profiles–Tenancy Slice B, ciclo de vida de afiliación: **COMPLETED & TESTED y cerrado (2026-10-23)**; sin hallazgos abiertos del Code Reviewer.
- Fase 3 completa: **abierta**.

## Orden de trabajo

1. **Dominio B:** máquina de estados y tests unitarios 33/33 — completado.
2. Casos de uso, persistencia, autorización OWNER y auditoría transaccional — completado.
3. Rutas y pruebas de integración; revisión del Slice B — completado (2026-10-23), sin hallazgos abiertos.
4. Planear backfill/retención operativos al habilitar SaaS; no asignar tenants por defecto — pendiente (Slice C, no iniciado).
5. Abrir slices separados para Catalog, Scheduling, Appointments y demás superficies — pendiente.

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
- Slice B cerrado (2026-10-23): dominio, casos de uso, UoW transaccional Prisma, rutas HTTP, validación de tenant activo, auditoría atómica y concurrencia pesimista en PostgreSQL verificada a nivel de repositorio y de caso de uso. Detalle en [FASE3_PROFILES_TENANCY_SLICE.md](FASE3_PROFILES_TENANCY_SLICE.md).
- Prueba local observada (2026-10-23): `domain-state-machine.unit.test.ts`, 33/33; módulo `profiles-affiliations`, 102/102; suite completa, 185/185.
- La aprobación del diseño del límite no equivale al cierre del código: el cierre de B se sostiene en la evidencia de suite registrada en el documento del slice.
- TypeScript local: `npx tsc --noEmit`, sin errores.

## Cierre de Fase 3

La fase solo se cierra tras aislar y revisar los módulos operativos incluidos en el alcance SaaS acordado, probar rutas públicas y autenticadas, revisar jobs y migraciones, y obtener aprobación final. Ningún slice parcial equivale a ese cierre.
