# PERF-004 — Paginar perfiles profesionales

## Contexto
División trazable de una tarjeta amplia de AUDIT-001.

## Problema
El listado de profesionales puede crecer sin límite.

## Evidencia
Servicios y consultas identificados por la auditoría estática.

## Impacto
Cambios difíciles de estimar o payloads crecientes dentro del alcance indicado.

## Propuesta
Añadir paginación y máximo de servidor al recurso de profesionales.

## Prioridad
Media. Escalabilidad.

## Dependencias
EC-004 para actualizar el contrato de transporte.

## Criterios de aceptación
- Cada respuesta respeta el máximo.
- cursor no repite ni omite filas.
- orden estable.

## Pruebas recomendadas
- Escenario y acción: Consultar primera y siguientes páginas, límite máximo y conjunto vacío.
- Resultado esperado: esperar navegación estable.

## Estado
Propuesta aprobada para implementación.

## Trazabilidad
Derivada de PERF-002.
