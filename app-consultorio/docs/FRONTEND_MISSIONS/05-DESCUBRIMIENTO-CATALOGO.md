# Misión 4 — Descubrimiento y catálogo público

## Objetivo

Rediseñar la experiencia pública para encontrar profesionales y entender una oferta reservable.

## Dependencia backend

La Fase 5 Catalog está planificada, no cerrada. La UI puede diseñarse contra el directorio vigente, pero el modelo de servicios/ofertas por afiliación y su contrato público deben acordarse con Catalog antes de cerrar integración.

## Trabajo

- rediseñar listado, filtros de especialidad, tarjetas y detalle profesional;
- definir estados de carga, lista vacía, error, perfil no disponible y tenant sin oferta;
- diferenciar identidad pública global del profesional de la información de oferta vinculada al consultorio;
- usar sólo campos públicos: el DTO del directorio no incluye teléfono ni `verificationStatus`;
- no decidir precio, duración, servicio reservable o vigencia a partir de campos administrativos;
- conservar adaptadores de API por feature para absorber cambios de Catalog.

## Contratos por cerrar con backend

Listado público y detalle por tenant, filtros/paginación, shape de oferta reservable, precio/duración, estado de servicio y respuesta cuando se revoca afiliación o elegibilidad.

## Criterios de cierre

- Un usuario puede descubrir un perfil y seleccionar sólo una oferta vigente del tenant indicado.
- La interfaz no expone datos privados ni supone que specialty equivalga a servicio reservable.
- El flujo funciona con contratos Catalog aprobados y estados de error documentados.
