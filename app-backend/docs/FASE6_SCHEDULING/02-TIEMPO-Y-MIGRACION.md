# Misión 1 — Semántica temporal y migración

## Objetivo

Implementar las decisiones de Misión 0 para fecha civil, timezone, límites diarios, DST y día de semana sin reinterpretar el pasado.

## Archivos a crear/tocar

- Crear value objects/helpers temporales bajo `src/modules/scheduling/` o el shared temporal aprobado; evitar lógica duplicada en controllers.
- Migrar `src/shared/time/appointment-datetime.ts`, `src/modules/appointments/appointments.controller.ts` y `appointments.service.ts` solo conforme al contrato aprobado.
- Revisar `src/modules/schedule/schedule.dto.ts`, seeds, adapters, workers y cualquier lector/escritor de `dayOfWeek`.
- Añadir/validar `ProfessionalProfile.timeZone` (propiedad de Profiles) y `Appointment.timeZone`, `startsAt`, `endsAt @db.Timestamptz(3)`; mantener `Appointment.date` como fecha civil codificada en UTC, con `startMin/endMin` como hora local.
- En Profiles, crear `SetProfessionalTimeZone` y ruta autenticada `PUT /api/professionals/me/time-zone` (propuesta); solo el titular cambia la zona. Validar identificador IANA y devolver error de dominio explícito si no existe.
- Tocar route/controller, DTO/validador, use case, port/repository y composition root de Profiles; no ampliar la entrada genérica `UpdateProfessionalProfile`.
- Hacer que set/cambio de zona y `AppointmentService.create/createGuest` tomen primero el mismo row lock del `ProfessionalProfile` dentro de sus transacciones. Reserva lee zona y crea cita en esa unidad; el cambio cuenta `PENDING/CONFIRMED` con `endsAt > now` y aborta si hay alguna.
- Exponer un helper transaccional único compartido para adquirir el row lock de Profile; debe requerir el `TransactionContext` activo y fallar explícitamente si falta.
- Inicializar perfiles sin zona solo por ese endpoint con valor explícito; no aceptar valor faltante, usar default ni heredar timezone del sistema/tenant. Bloquear disponibilidad y reservas hasta configurar.
- Migrar `appointment-lifecycle.ts` y `catalog/infrastructure/prisma/prisma-offer-appointment-policy.ts` a `startsAt/endsAt`; son consumidores de tiempo real y hoy combinan fecha/minutos como UTC.
- Si el modelo requiere columnas/índices, actualizar `prisma/schema.prisma` y crear migración con dry-run, conteo, rollback y reconciliación.
- Añadir tests unitarios para domingo, fecha civil, límites de día, zona IANA y transiciones DST.

## Límites

- Usar biblioteca/soporte temporal aprobado y validar nombres IANA; no usar timezone local del proceso.
- Aplicar D0-8: filtrar inicios DST inexistentes/ambiguos, cerrar el bloque de ese día si un límite no es representable de forma única, calcular duración como tiempo transcurrido y comparar contra límites reales del bloque.
- No reescribir `Appointment.date/startMin` en masa sin mapping revisado y respaldo.
- Para `dayOfWeek`, usar ISO 1–7; mapear `0 → 7` solo si el origen confirma que 0 era domingo. Investigar todo 7 (incluida la seed con comentario contradictorio) y valores fuera de rango; no inferir si hay corrupción.
- Para timezone, exigir fuente aprobada por perfil. Si falta o hay discrepancias, poner el perfil/datos en cuarentena para decisión; no usar UTC ni la zona del host como fallback.
- Mantener la transacción completa del cambio de zona (lock → consulta de citas activas → update) y la de reserva (lock → lectura de zona → validación → insert). Prueba concurrente en base real debe demostrar ambos órdenes y ausencia de escritura parcial.
- Backfill preexistente: verificar que `date` esté a medianoche UTC, asignar `timeZone=UTC` y derivar `startsAt/endsAt` UTC exactamente como el contrato pre-Fase-6; valores no canónicos bloquean y requieren resolución manual. No recalcular históricos con el nuevo timezone profesional.
- Las citas activas migradas también quedan snapshot en UTC; bloquear la configuración inicial del perfil mientras siga alguna `PENDING/CONFIRMED` con `endsAt > now`. Debe terminar/cancelarse por su flujo normal antes de habilitar zona local y nuevas reservas.
- Las nuevas reservas capturan la zona profesional y los instantes resultantes. Así los cambios posteriores no reinterpretan citas ya creadas.
- Revisar `update-professional-profile.use-case.ts` y su DTO: no añadir timezone al PATCH genérico; el flujo dedicado aplica validación y coordinación especial.
- Mantener compatibilidad de API o versionar explícitamente cualquier cambio de fecha/slot.

## Aceptación

- Todos los caminos interpretan el mismo instante/calendario usando la zona decidida.
- Domingo conserva el mismo día lógico en creación, disponibilidad y CRUD de Schedule.
- Tests pasan bajo más de una zona del proceso y cubren días de 23/25 horas.
- Dry-run explica cada dato existente cambiado, omitido o bloqueado; migración validada en staging.
