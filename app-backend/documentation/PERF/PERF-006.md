# PERF-006 — Paginar historial de citas

## Contexto
División trazable de una tarjeta amplia de AUDIT-001.

## Problema
El historial completo se devuelve en una solicitud.

## Evidencia
Servicios y consultas identificados por la auditoría estática.

## Impacto
Cambios difíciles de estimar o payloads crecientes dentro del alcance indicado.

## Propuesta
Añadir paginación al historial sin cambiar filtros de propiedad.

## Prioridad
Media. Rendimiento y privacidad.

## Dependencias
BUG-003 para semántica temporal y EC-004 para contrato.

## Criterios de aceptación
- Respuesta limitada.
- solo contiene citas del usuario.
- navegación estable.

## Pruebas recomendadas
- Escenario y acción: Probar cliente y profesional con varias páginas y acceso cruzado.
- Resultado esperado: esperar datos propios sin duplicados.

## Estado
Propuesta aprobada para implementación.

## Trazabilidad
Derivada de PERF-002.
