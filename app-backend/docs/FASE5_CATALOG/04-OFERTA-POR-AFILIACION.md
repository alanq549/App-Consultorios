# Misión 3 — Modelar oferta por afiliación

## Objetivo

Implementar el modelo de oferta reservable conforme a D0, distinguiéndolo del catálogo global y de la elegibilidad profesional.

## Por qué

`Service` hoy pertenece a un perfil global y no tiene tenant/afiliación. El listado se filtra por afiliación activa, pero precio, duración y specialty del mismo servicio se comparten entre todas sus afiliaciones.

## Archivos a crear/tocar

- Diseñar el agregado/relación aprobada en D0; especificar constraints, ownership y referencias antes de editar schema.
- Si requiere migración, modificar `prisma/schema.prisma` y crear migración aditiva o segura, con plan de rollback.
- Adaptar `src/modules/catalog/` para que cada oferta pertenezca a una afiliación existente y elegibilidad global válida.
- Actualizar `src/modules/appointments/` solo en lo necesario para conservar una referencia inequívoca; el cambio de reader se define en Misión 5.
- Crear reporte/dry-run de mappings de servicios legacy a afiliación; exigir aprobación de mappings antes de aplicar backfill.
- Tests de integridad, acceso cruzado, tenants múltiples y mapping.

## Límites

- No copiar automáticamente cada Service a todas las afiliaciones de un profesional.
- Sin mapping fiable, bloquear backfill/rollout; no asignar tenant por defecto.
- No romper citas existentes ni eliminar filas/referencias históricas.
- `ProfessionalSpecialty` sigue siendo elegibilidad global; la oferta se vincula a specialty elegible según política aprobada.

## Aceptación

- La base impide oferta huérfana o ligada a afiliación equivocada.
- Un profesional con varias afiliaciones puede tener términos distintos por consultorio según D0.
- Dry-run contabiliza filas que se crearán, omitirán o requieren decisión humana.
- Aplicación del mapping es repetible/segura y probada antes/después; sin mappings aprobados no se ejecuta.
