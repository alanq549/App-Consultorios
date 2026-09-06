# PERF-002 — Listados sin paginación ni límites

- Severidad: Media
- Confianza: Confirmado
- Área: Rendimiento backend
- Archivos: servicios de profesionales, notificaciones, reseñas y citas

## Problema
Varios `findMany` devuelven colecciones completas.

## Recomendación
Incorporar paginación por cursor o límites estables con máximo de servidor.

## Validación
Medir tamaño y latencia con conjuntos grandes.

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

## Dependencias
Ninguna adicional, salvo las indicadas expresamente o en su tarjeta canónica.

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

## Alcance delimitado
Esta tarjeta queda limitada a paginar notificaciones. Profesionales, reseñas e historial de citas se separan en [PERF-004](PERF-004.md), [PERF-005](PERF-005.md) y [PERF-006](PERF-006.md).
