# Misión 4 — Cálculo de disponibilidad

## Objetivo

Separar el cálculo de slots de la reserva y asegurar que usa la misma agenda, zona, duración y criterios de ocupación.

## Archivos a crear/tocar

- Crear query/use case `GetAvailability` y política de slots bajo `src/modules/scheduling/`.
- Migrar `AppointmentsController.availability`, `AppointmentService.getAvailability` y `availability.util.ts` a consumidores/contratos explícitos.
- Consultar ofertas vía `CatalogReader` y citas vía contrato de Appointments conforme a ownership aprobado.
- Implementar la política de slots registrada y aprobada en Misión 0: incremento/alineación, buffers, anticipación mínima/máxima, estados ocupantes y tratamiento de slots parciales.
- Mantener DTO/ruta existente o versionar contrato; probar tests HTTP para actor público/guest.

## Límites

- Disponibilidad es una proyección informativa, no una reserva ni garantía de persistencia.
- Tomar fecha civil, zona, `dayOfWeek`, DST y duración únicamente de decisiones aprobadas.
- Aplicar D0-7: incremento 15 min desde inicio del bloque, buffers 0, lead time configurado 0 min sin ofrecer pasado ni inicio `<= ahora` hoy, sin máximo de anticipación, estados no-CANCELLED ocupan y duración completa (sin slots parciales). Cualquier cambio requiere aprobación y versionado/documentación.
- Aplicar D0-1/D0-8 para construir fecha/hora local e instantes; ignorar/rechazar inicios DST inexistentes o ambiguos, no ofrecer el bloque ese día si un límite no es representable y calcular fin como duración transcurrida.
- Las reservas y cambios de cita comparan `startsAt/endsAt`; disponibilidad entrega la hora local y el instante asociado, sin crear una reserva.
- La reserva debe revalidar con la misma política determinante que usó el cálculo de disponibilidad, dentro de su transacción.
- Fallo o ausencia de tenant/afiliación se maneja explícitamente sin fallback.

## Aceptación

- Lista de slots coincide con el CRUD y la validación transaccional de reserva.
- Pruebas fijan incremento, buffers, anticipación, estados ocupantes, duración parcial y slots pasados para hoy.
- Domingo, extremos de día, DST, citas existentes y diferentes duraciones cubiertos.
- La disponibilidad de tenant A no revela horario/ofertas no visibles en tenant B.
- Prueba demuestra que un slot mostrado puede dejar de estar libre y la reserva revalida atómicamente.
