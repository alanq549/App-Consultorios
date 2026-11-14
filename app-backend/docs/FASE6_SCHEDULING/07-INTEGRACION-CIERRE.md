# Misión 6 — Integrar, retirar legacy y cerrar Fase 6

## Objetivo

Consolidar scheduling, la lectura de disponibilidad y el punto transaccional de reserva sin duplicar reglas.

## Archivos a revisar/tocar

- Registrar el contexto objetivo en `src/app.ts`/composition root; retirar handlers duplicados de `src/modules/schedule/` tras migrar consumidores.
- Revisar `src/modules/appointments/`, `src/modules/catalog/`, workers, seeds y cualquier uso de fecha/minutos/`dayOfWeek`.
- Actualizar `prisma/schema.prisma`, migraciones y documentación solo con decisiones aprobadas.
- Actualizar `docs/REFACTOR_PHASES.md`, baseline y contratos frontend si cambia API.

## Validación requerida

- Tests de zona IANA, titularidad/autorización, perfil sin zona, domingo, transición DST, mapeo de datos, ownership y política de cambios.
- Integración HTTP/DB para disponibilidad y carreras con distintos servicios/inicios; suite enfocada y completa.
- Prueba concurrente en DB real de `SetProfessionalTimeZone` vs create normal/guest, cubriendo ambas órdenes de lock y ausencia de cita con zona obsoleta.
- Pruebas concurrentes en DB real de `UpdateSchedule`/`DeactivateSchedule` vs reserva normal y guest; cubrir ambas órdenes y demostrar que nunca se confirma una cita fuera del horario final.
- Pruebas concurrentes en DB real para `CreateSchedule`/`UpdateSchedule`/`DeactivateSchedule` entre sí, incluyendo cambios aparentemente aditivos; demostrar serialización antes de lectura y ausencia de bloques solapados o citas sin cobertura.
- `npx tsc --noEmit`, `npm run build`, validación de migraciones y revisión de datos reconciliados.
- Buscar conversiones locales `new Date("...T00:00:00")`, mapeos `0/7` inconsistentes y consultas de citas por fecha sin convención temporal.

## Cierre

- Decisiones de Misión 0 están aprobadas; no quedan defaults temporales o tenant implícitos.
- Reserva usa una única garantía persistente; la disponibilidad no se presenta como bloqueo.
- Cambios de horario respetan las citas existentes bajo política aprobada.
- Reviewer independiente aprueba sin hallazgos bloqueantes; riesgos pendientes pasan explícitamente a Fase 7.
