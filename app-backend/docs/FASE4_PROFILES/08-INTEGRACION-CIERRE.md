# Misión 7 — Integrar, retirar legacy y cerrar Fase 4

## Objetivo

Demostrar que las misiones acordadas funcionan en conjunto, retirar el despacho legacy obsoleto y registrar deuda restante.

## Archivos a revisar/tocar

- `src/modules/users/users.service.ts`: eliminar `profileServiceMap` y responsabilidades de Profiles cuando ya no tenga consumidores.
- `src/modules/users/users.controller.ts` y `users.routes.ts`: mantener solo fachada temporal o funciones que correspondan a Identity/Preferences.
- `src/app.ts`: conectar rutas definitivas sin registrar duplicados.
- `tests/profiles/`, `tests/professionals/` y pruebas HTTP existentes: actualizar suites y contratos.
- `docs/REFACTOR_PHASES.md`, `docs/FASE4_PROFILES/00-PLAN.md` y decisiones: registrar resultado real.

## Validación requerida

- `npm test` y pruebas enfocadas de cada misión aprobada.
- `npm run build` (incluye typecheck) y revisar salida sin errores.
- Verificar rutas, autenticación, DTOs públicos y aislamiento entre tenants.
- Verificar como excepción intencional al contrato público previo: `verificationStatus` no se serializa en directorio público, el frontend no lo espera allí y `/api/users/me` sí lo conserva.
- Verificar certificado no accesible por URL estática/anónima; dueño autorizado puede leerlo y otro usuario no.
- Coordinar cierre con Fase 5: revocar última specialty aprobada suspende globalmente el perfil en la misma unidad transaccional y lo excluye del directorio.
- Probar revisión persistida cuando falla notificación: resultado de revisión sigue exitoso y el fallo queda registrado observablemente; no afirmar retry garantizado.
- Buscar `profileServiceMap`, `Record<Role, any>`, imports circulares y referencias a servicios legacy.
- Confirmar que no cambió Identity, Preferences, Catalog ni afiliaciones fuera de contratos aprobados.

## Cierre

- Todas las rutas migradas conservan compatibilidad o tienen migración aprobada.
- No quedan dos implementaciones activas de la misma regla.
- No queda activo el static public route de certificados ni el campo privado `verificationStatus` en respuestas públicas.
- La integración de specialty está demostrada por tests Fase 4/5 acordados, no solo por contrato documental.
- Cada pendiente indica owner/fase y riesgo; no marcar tenant-safe lo que no se probó.
- Actualizar estados sólo con evidencia de comandos realmente ejecutados.
- Solicitar revisión independiente; cerrar como APPROVED sólo sin hallazgos bloqueantes.
