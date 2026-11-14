# Misión 7 — Espacio del profesional

## Objetivo

Unificar y rediseñar el espacio de trabajo profesional: perfil, catálogo/ofertas, agenda y citas.

## Dependencias backend

Catalog (Fase 5), Scheduling (6) y Appointments (7). Los perfiles públicos pueden diferir por consultorio/afiliación, mientras la identidad y algunos atributos del profesional son globales.

## Trabajo

- dashboard con tareas/estados respaldados por API;
- edición de contenido público, enlaces, certificados y verificación usando las operaciones de Profiles;
- administración de ofertas sólo sobre la afiliación/tenant seleccionado según el contrato Catalog;
- agenda semanal y excepciones según la política de Scheduling;
- gestión de citas según transiciones que el backend permita;
- explicar estados distintos de verificación profesional, elegibilidad specialty y afiliación tenant sin mezclarlos.

## Criterios de cierre

- Ninguna mutación administrativa global aparece como operación del profesional.
- Cambiar tenant no mezcla oferta o agenda de otro consultorio.
- Horarios y citas representan timezone y transiciones del backend.
- Flujos legacy se retiran sólo después de migrar todos sus consumidores.
