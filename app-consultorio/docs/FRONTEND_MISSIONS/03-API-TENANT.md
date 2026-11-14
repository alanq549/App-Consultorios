# Misión 2 — Frontera API, errores y contexto tenant

## Objetivo

Hacer explícita y consistente la frontera del cliente con la API, incluida la selección del consultorio en operaciones tenant-scoped.

## Estado

**PLANIFICADA.** Backend Fase 3 cerró los slices A–H dentro de su alcance. La estrategia de membresías/tenant para SaaS no debe darse por completamente terminada.

## Trabajo

1. Inventariar endpoints usados por el frontend y asociarlos con sus DTOs y fase propietaria.
2. Confirmar cómo se selecciona un tenant/consultorio, cuándo se persiste y qué endpoints requieren `X-Tenant-ID`.
3. Revisar `src/api/axios.ts`: definir un único punto para auth, header tenant condicional, refresh y errores de transporte, evitando adjuntar tenant a rutas que no lo usan.
4. Encapsular endpoints y tipos cerca de cada feature; no permitir llamadas Axios desde UI compartida.
5. Normalizar tratamiento de `400`, `401`, `403`, `404`, `409` y errores de red, conservando mensajes de campo cuando existan.
6. Documentar DTOs de frontend por endpoint; usar validación runtime sólo en fronteras donde el contrato sea frágil o externo, sin duplicar todos los schemas del backend.

## Riesgo observado a confirmar

El interceptor de Axios inspeccionado adjunta bearer token y gestiona refresh; no se vio ahí `X-Tenant-ID`. El header podría estar puesto en otra capa. Confirmar uso real y comportamiento antes de cambiarlo. Directorio, catálogo, agenda pública y reserva requieren contexto según sus contratos actuales; lecturas propias de citas y perfil no necesariamente lo requieren.

## Criterios de cierre

- Matriz endpoint/header/contrato disponible y revisada junto a backend.
- La selección tenant no se confunde con autorización.
- Cambiar o limpiar tenant no deja caché visible del tenant anterior.
- Refresh fallido termina sesión de manera controlada y no crea ciclos de reintento.
