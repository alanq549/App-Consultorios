# PERF-001 — Filtrado temporal de citas en memoria

- Severidad: Media
- Confianza: Confirmado
- Área: Rendimiento backend
- Archivo: `src/modules/appointments/appointments.service.ts`
- Símbolo: `getUpcomingAppointmentsByUser`

## Problema
Se recuperan todas las citas no canceladas y después se filtran las pasadas en JavaScript.

## Recomendación
Filtrar en PostgreSQL una vez definida la política temporal de BUG-003.

## Dependencias
Depende de BUG-003.

## Contexto
Esta tarjeta procede de AUDIT-001 y conserva su alcance técnico original.

## Evidencia
La evidencia corresponde a los archivos, símbolos o comportamientos citados en la tarjeta y en AUDIT-001.

## Impacto
Consumo creciente de recursos en el flujo descrito.

## Propuesta
Aplicar únicamente la recomendación técnica documentada, sin ampliar el alcance funcional.

## Prioridad
Implementar después de los defectos o decisiones declarados como dependencias.

## Criterios de aceptación
- Se registra una línea base reproducible.
- La medición posterior reduce o acota el trabajo descrito.
- El resultado funcional coincide con la línea base.

## Pruebas recomendadas
- Línea base: medir el escenario; resultado esperado: métrica registrada.
- Comparación: repetir con los mismos datos; resultado esperado: trabajo menor o acotado.
- Regresión: comparar respuesta; resultado esperado: datos equivalentes.

## Estado
Propuesta aprobada para implementación.
