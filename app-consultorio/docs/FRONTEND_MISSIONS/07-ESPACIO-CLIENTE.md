# Misión 6 — Espacio del cliente

## Objetivo

Rediseñar citas, perfil y reseñas del cliente con navegación consistente y datos remotos actualizados.

## Dependencias backend

Appointments y Reviews ya tienen contratos HTTP y aislamiento parcial por propiedad/tenant, pero su extracción arquitectónica continúa en Fases 7 y 9. Preferences también se define en Fase 9.

## Trabajo

- historial y próximas citas con filtros/estados legibles y acciones autorizadas;
- refrescar query al cancelar/actualizar cita y mostrar conflictos de transición;
- reseñar sólo citas elegibles según respuesta/contrato backend;
- perfil y preferencias con estado de guardado y validación clara;
- mantener lecturas propias por propiedad sin exigir selector tenant cuando la ruta no lo requiere.

## Criterios de cierre

- Los estados `PENDING`, `CONFIRMED`, `COMPLETED`, `CANCELLED` se presentan según reglas actuales.
- Las mutaciones reflejan el resultado del servidor y actualizan el cache.
- Errores de autorización/no encontrado no filtran datos de otra persona.
- La configuración personal no se presenta como configuración de consultorio.
