# Misión 9 — Integración, calidad de experiencia y cierre

## Objetivo

Cerrar el rediseño por flujos, retirar implementaciones visuales duplicadas y registrar las brechas que dependen del backend.

## Trabajo

- revisar navegación completa por rol, deep links y rutas no encontradas;
- comprobar responsive, teclado, foco, contraste, formularios y estados de carga/error/vacío;
- revisar cache e invalidación al cambiar tenant, sesión, oferta, agenda o cita;
- revisar nombres de carpetas y eliminar duplicaciones sólo tras confirmar cero consumidores;
- comprobar que DTOs públicos/privados/admin permanecen separados;
- documentar deuda pendiente y contratos aún sujetos a fases backend.

## Criterios de cierre

- Cada flujo prioritario tiene inicio, éxito, error y recuperación coherentes.
- No quedan pantallas críticas que llamen endpoints con contrato no documentado.
- La app sigue compilable y las verificaciones definidas por la misión pasan.
- El cierre no declara terminadas Fases 5–10 del backend ni convierte UI en autoridad de negocio.
