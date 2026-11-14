# Misión 1 — Fundación visual y shell

## Objetivo

Crear la base visual del rediseño y mejorar los layouts compartidos sin cambiar las reglas de negocio de cada flujo.

## Estado

**PLANIFICADA.** Puede empezar inmediatamente, en paralelo con backend.

## Alcance

- definir tokens de color, tipografía, espaciado, radios, elevación y breakpoints;
- crear una biblioteca pequeña de componentes compartidos: Button, Input, Select, Card, Dialog/Modal, Badge, Skeleton, EmptyState, ErrorState y feedback;
- establecer navegación, header/sidebar y contenedores responsive por público/cliente/profesional/admin;
- normalizar focus visible, disabled/loading y errores de validación;
- integrar estilos con Tailwind/CSS existente según decisión de Misión 0, sin añadir otra librería UI por defecto.

## Archivos probables

- `src/styles/`, `src/index.css`, `src/App.css`;
- `src/components/` o nueva `src/shared/ui/`;
- `src/layouts/`, `src/App.tsx` y `src/routes/AppRouter.tsx`.

## Criterios de cierre

- Shell principal se adapta a móvil y escritorio.
- Componentes cubren variantes y estados de interacción necesarios, con accesibilidad básica.
- Las features existentes pueden migrarse una por una sin acoplarse entre sí.
- Sin cambios de contrato HTTP o de permisos.
