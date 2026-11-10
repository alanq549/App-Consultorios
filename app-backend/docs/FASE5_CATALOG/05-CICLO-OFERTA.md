# Misión 4 — Ciclo de vida y reglas de Service

## Objetivo

Migrar crear, editar y desactivar ofertas reservables con ownership, elegibilidad y protección de citas coherentes.

## Archivos a crear/tocar

- Casos de uso Catalog para `CreateService`, `UpdateService`, `DeactivateService`.
- Migrar `src/modules/services/service.service.ts`, controller, DTO y routes a adapters.
- Crear política/port de lectura de citas futuras hasta que Appointments exponga su contrato; no importar Prisma de Appointments.
- Añadir validación de datos y tests unitarios/HTTP en `tests/catalog/`.

## Reglas requeridas

- Validar que el actor sea dueño de la afiliación/oferta y tenga los permisos decididos en D0.
- Validar specialty activa y elegibilidad aprobada del profesional.
- Validar nombre, duración múltiplo de 15 dentro del rango aprobado, precio/moneda y límites de actualización.
- Aplicar D0 a servicios/especialidades con citas futuras; hasta snapshots de Fase 7, no alterar términos que cambiarían reserva/histórico.
- Soft deactivate; no borrar oferta referenciada por citas.

## Aceptación

- ID de otra afiliación/tenant no permite lectura ni modificación.
- Actualizaciones que violan regla de cita futura fallan sin escritura parcial.
- Desactivación y cambios concurrentes siguen la garantía acordada con Appointments.
- Error de dominio se traduce explícitamente al contrato HTTP; no catches/fallbacks de éxito.
- Tests cubren límites, owner, specialty y citas futuras.
