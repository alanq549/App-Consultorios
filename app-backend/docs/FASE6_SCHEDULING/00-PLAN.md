# Fase 6 — Plan de obra: Scheduling

## Propósito

Consolidar agenda, disponibilidad y validación de slots, con semántica temporal y garantía de concurrencia definida antes de migrar código.

## Estado

- **PLANIFICADA — NO APROBADA PARA IMPLEMENTACIÓN.**
- `src/modules/schedule/` es el módulo legacy actual; `src/modules/scheduling/` es el contexto objetivo, no una carpeta ya existente.
- Appointments persiste fecha calendario a medianoche UTC y minutos del día; la interpretación de zona horaria sigue pendiente.
- No confundir disponibilidad calculada con reserva confirmada ni con su serialización transaccional.

## Misiones

| Orden | Plano | Resultado |
|---|---|---|
| 0 | [Decisiones de diseño](01-DECISIONES.md) | Revisar/aprobar D0-1–D0-9 antes de implementación |
| 1 | [Semántica temporal y migración](02-TIEMPO-Y-MIGRACION.md) | Unificar fechas, timezone, semana y datos históricos |
| 2 | [Ownership de agenda](03-OWNERSHIP-AGENDA.md) | Aplicar la decisión global aprobada en Fase 3 E |
| 3 | [Gestión de horarios](04-GESTION-HORARIOS.md) | Migrar CRUD y aplicar política ante citas futuras |
| 4 | [Disponibilidad](05-DISPONIBILIDAD.md) | Calcular slots con una convención temporal única |
| 5 | [Concurrencia de reserva](06-CONCURRENCIA.md) | Impedir solapamientos incluso entre servicios distintos |
| 6 | [Integración y cierre](07-INTEGRACION-CIERRE.md) | Retirar legacy y demostrar criterios |

## Dependencias

Misión 0 bloquea 1–5. Misión 2 depende de 0 y 1; Misión 3 depende de 0–2; Misión 4 depende de 1–3; Misión 5 depende de 0–4. Misión 6 depende de todas.

## Reglas comunes

- No cambiar semántica de citas históricas mediante una reinterpretación implícita de UTC/local; aplicar solo el mapping aprobado en D0-1/D0-2.
- No declarar segura una reserva por una prueba de disponibilidad: reservas, cambio de zona y todas las mutaciones de horario (Create/Update/Deactivate) comparten el lock transaccional del perfil antes de cualquier lectura de estado.
- Probar simultaneidad sobre horarios superpuestos con horas de inicio distintas y servicios distintos.
- Coordinar cambios de formato/semántica de `Appointment` con Fase 7; la agenda no debe inventar snapshots ni lifecycle de cita.

## Cierre

Exigir decisiones aprobadas, migración reversible y reconciliada, pruebas de zona/DST y domingo, aislamiento según ownership, pruebas concurrentes de base de datos real, suite, typecheck/build y revisión independiente.
