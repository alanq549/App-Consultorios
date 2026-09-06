# PERF-005 — Paginar reseñas

## Contexto
División trazable de una tarjeta amplia de AUDIT-001.

## Problema
Las reseñas por profesional se recuperan sin límite.

## Evidencia
Servicios y consultas identificados por la auditoría estática.

## Impacto
Cambios difíciles de estimar o payloads crecientes dentro del alcance indicado.

## Propuesta
Añadir paginación al listado de reseñas.

## Prioridad
Media. Escalabilidad.

## Dependencias
EC-004 para actualizar el contrato.

## Criterios de aceptación
- Respuesta limitada.
- orden descendente estable.
- todas las reseñas accesibles por páginas.

## Pruebas recomendadas
- Escenario y acción: Probar varias páginas, empates temporales y lista vacía.
- Resultado esperado: esperar ausencia de duplicados.

## Estado
Propuesta aprobada para implementación.

## Trazabilidad
Derivada de PERF-002.
