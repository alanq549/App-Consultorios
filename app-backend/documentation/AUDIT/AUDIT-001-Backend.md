# AUDIT-001 — Backend

## Resumen

Auditoría estática de `app-backend` (Express, TypeScript, Prisma y PostgreSQL). No se modificó código. Los riesgos prioritarios son autorización administrativa incompleta, IDOR en notificaciones, consistencia de reservas y condiciones de carrera.

## Fortalezas

- Contraseñas con bcrypt y tokens sensibles almacenados como hash.
- Rotación de refresh tokens y revocación al cambiar contraseña.
- DTO con Zod en operaciones relevantes.
- Restricciones e índices Prisma útiles.
- Comprobaciones de pertenencia en citas, servicios y horarios.

## Hallazgos

| ID | Severidad | Título |
|---|---|---|
| SEC-001 | Alta | Operaciones administrativas sin RBAC |
| SEC-002 | Alta | IDOR al marcar notificaciones |
| SEC-004 | Media | Ausencia de rate limiting |
| SEC-005 | Media | Validación insuficiente de archivos públicos |
| SEC-006 | Baja | Cabeceras de seguridad ausentes |
| BUG-001 | Alta | Cita persistida aunque falle su notificación |
| BUG-002 | Alta | Reservas concurrentes solapadas |
| BUG-004 | Media | Destinatario incorrecto de notificación de reseña |
| EC-001 | Media | Servicios con responsabilidades excesivas |
| EC-003 | Media | Manejo inconsistente de errores HTTP |
| PERF-001 | Media | Filtrado temporal en memoria |
| PERF-002 | Media | Listados sin paginación |

## Integración

El informe transversal canónico es [AUDIT-001-Integracion.md](AUDIT-001-Integracion.md). Las fichas relacionadas en ambos proyectos solo contienen referencias cruzadas.

## Tarjetas derivadas durante la normalización

Para reducir alcance sin alterar los hallazgos se derivaron:

- [EC-005](../EC/EC-005.md) — perfiles profesionales;
- [EC-006](../EC/EC-006.md) — autenticación;
- [EC-007](../EC/EC-007.md) — adopción inicial de errores tipados;
- [PERF-004](../PERF/PERF-004.md) — perfiles profesionales;
- [PERF-005](../PERF/PERF-005.md) — reseñas;
- [PERF-006](../PERF/PERF-006.md) — historial de citas.

## Limitaciones

No se ejecutaron servidor, base de datos, worker, migraciones ni pruebas dinámicas. `node_modules` no estaba disponible para typecheck, lint o auditoría de dependencias.

## Convención de numeración

La numeración de BUG, SEC, PERF y EC es global para el repositorio. Un mismo identificador puede existir en frontend y backend cuando representa el mismo hallazgo transversal: una tarjeta es la fuente canónica y la otra contiene únicamente contexto y referencia cruzada.
