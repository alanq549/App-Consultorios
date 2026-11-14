# Misión 0 — Baseline y decisiones de frontend

## Objetivo

Definir alcance del rediseño, inventariar experiencia existente y acordar las decisiones que afectan a todas las features, sin empezar una migración masiva.

## Estado

**PLANIFICADA.**

## Observación inicial

La aplicación tiene capas y features útiles (`api`, `features`, `layouts`, `routes`, `store`, `types`, `mappers`), pero algunos nombres y flujos están duplicados o inconsistentes: por ejemplo `Client`/`client`, `Professional`/`professional`, `appointment`/`appointments`, y hay dos conjuntos de componentes de booking. Las rutas y APIs están centralizadas parcialmente. La misión debe inventariar consumidores antes de consolidar.

## Archivos a revisar

- `src/routes/AppRouter.tsx`, `src/layouts/`, `src/pages/`;
- `src/features/**`, `src/api/**`, `src/types/**`, `src/mappers/**`;
- `src/main.tsx`, `src/App.tsx`, `src/store/`, `src/styles/`, `src/index.css`;
- los contratos backend vigentes de `docs/BASELINE_CONTRACTS.md`, Fase 4 Profiles y Fases 5–9.

## Trabajo

1. Enumerar pantallas y flujos actuales por rol (público, cliente, profesional, admin).
2. Registrar rutas actuales y señalar rutas duplicadas, inaccesibles o inconsistentes, sin borrarlas todavía.
3. Para cada pantalla, mapear API, DTO/type, estado remoto/global y backend owner/fase.
4. Definir alcance del rediseño visual: identidad visual, navegación, breakpoint objetivo y prioridades del usuario.
5. Acordar decisiones transversales: dónde viven componentes compartidos, query/cache, manejo de formularios, feedback y límites entre features.
6. Crear un registro de contratos inestables que requieren coordinación con backend.

## Criterios de cierre

- Existe inventario de pantallas, roles, rutas y APIs.
- Se eligió estructura objetivo feature-first sin imponer DDD en la UI.
- Hay secuencia y prioridades aprobadas para el rediseño.
- Se sabe qué se puede implementar con el contrato actual y qué espera una decisión backend.

## Exclusiones

No cambiar contratos backend, no migrar todas las features, no eliminar rutas/código por intuición y no escoger un sistema de diseño visual sin referencias o decisión del producto.
