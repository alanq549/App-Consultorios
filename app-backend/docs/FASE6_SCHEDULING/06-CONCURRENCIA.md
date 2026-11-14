# Misión 5 — Garantía contra reservas solapadas

## Objetivo

Establecer una única garantía transaccional que impida que reservas concurrentes acepten intervalos solapados para el mismo profesional.

## Archivos a crear/tocar

- Revisar `appointments.service.ts`, `prisma/schema.prisma` y helper de lock de Service.
- Implementar constraint PostgreSQL `EXCLUDE USING gist` según D0-5 sobre profesional y `tstzrange(startsAt,endsAt,'[)')`, parcial donde `status <> 'CANCELLED'`; habilitar `btree_gist` en migración controlada.
- Retirar la unicidad legacy por mismo inicio en `(professionalProfileId,date,startMin)`; de lo contrario una cita cancelada seguiría bloqueando ese inicio aunque la constraint parcial la excluya.
- Antes de aplicar, reportar intervalos existentes que colisionan y exigir resolución explícita; no borrar/cancelar datos automáticamente.
- Mantener validación de dominio para respuesta clara, pero tratar la constraint como autoridad final; traducir SQLSTATE de exclusión a HTTP 409.
- Añadir pruebas de integración concurrentes con base real para servicios distintos, inicio distinto, mismo inicio, reservas normales y guest.

## Límites

- El lock de una fila `Service` serializa cambios/reservas de esa oferta, pero no arbitra por sí mismo conflictos de otros servicios del profesional.
- No afirmar garantía por un `findFirst` seguido de `create` sin una exclusión/lock común en la misma transacción.
- La regla de intervalos es semiabierta `[start,end)`; adyacentes válidos. Las citas canceladas no ocupan; cualquier otro estado sí, conforme al baseline.
- Mantener orden estable de locks y timeout/retry explícitos para evitar deadlocks o éxito falso.

## Aceptación

- Requests concurrentes para intervalos solapados, incluso entre clínicas/servicios distintos: exactamente una reserva confirma; la otra recibe conflicto.
- Intervalos no solapados y slots adyacentes válidos según política.
- Pruebas repiten suficiente concurrencia y comprueban persistencia, no solo el código HTTP.
- La garantía persiste ante cualquier ruta de escritura y no depende del mismo `serviceId`.
