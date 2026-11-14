# Plan de misiones — rediseño y arquitectura del frontend

## Propósito

Rediseñar `app-consultorio` de manera incremental mientras el backend continúa sus fases. Cada misión debe dejar la aplicación utilizable y permitir integrar contratos backend por flujo, sin esperar a terminar todas las fases de backend.

La guía concreta de carpetas, responsabilidad por archivo, migración gradual y sincronización de contratos está en [Arquitectura y coordinación](01-ARQUITECTURA-Y-COORDINACION.md). Este archivo funciona como índice de misiones.

Para implementar el primer grupo de pantallas, seguir [Guía de páginas públicas: Home, Registro y Login](GUIA-PAGINAS-PUBLICAS.md), que documenta el árbol de archivos, el orden de migración y los contratos HTTP actuales.

## Estado

- Estado inicial: **PLANIFICADO**.
- Punto de coordinación: cierre de Fase 5 Catalog; confirmar su commit aprobado como base del worktree frontend.
- Trabajo que puede iniciar sin esperar más backend: baseline corto, shell visual y componentes compartidos.

## Enfoque de arquitectura recomendado

Usar una arquitectura **feature-first por flujos de usuario**, con límites explícitos entre UI, estado de servidor y acceso HTTP:

```text
src/
  app/                 # providers, router, configuración de aplicación
  shared/              # UI reutilizable, utilidades y componentes sin negocio
  features/
    auth/              # páginas, componentes, hooks, api/types propios
    discovery/         # directorio y detalle público
    booking/           # selección y creación de cita
    client/            # perfil, citas y reseñas del cliente
    professional/      # perfil, servicios, agenda y citas del profesional
    admin/             # administración global
```

No hace falta replicar Hexagonal + DDD del backend. En el cliente no se posee el dominio autoritativo: el backend valida reglas y persiste. Conviene aplicar dependencias limpias de forma pragmática: componentes de presentación no llaman Axios directamente; los hooks/casos de uso de frontend coordinan queries y comandos; un adaptador API por feature traduce HTTP a tipos de UI; mappers transforman DTOs sólo cuando existe una diferencia real. No crear repositorios, entidades de dominio ni capas de casos de uso ceremoniales para cada pantalla.

Mantener **TanStack Query para estado remoto/cache** y **Redux para estado global de sesión/UI que realmente lo necesite**. Evitar duplicar el mismo dato remoto en Redux. Compartir componentes visuales y tokens de diseño en `shared`; mantener reglas y contratos cerca de su feature. Las rutas, permisos, tenant seleccionado y DTOs deben seguir siendo explícitos.

## Misiones

| Orden | Plano                                                              | Resultado                                                                      | Dependencia / paralelo                                                   |
| ----- | ------------------------------------------------------------------ | ------------------------------------------------------------------------------ | ------------------------------------------------------------------------ |
| 0     | [Baseline y decisiones](01-BASELINE.md)                            | Inventario, flujos objetivo, mapa de contratos y decisiones visuales/técnicas  | Puede iniciar ya; sin dependencia backend                                |
| 1     | [Fundación visual y shell](02-FUNDACION-VISUAL.md)                 | Tokens, componentes base, layouts responsivos y estados compartidos            | En paralelo con cualquier fase backend                                   |
| 2     | [Frontera API y tenant](03-API-TENANT.md)                          | Tipos por feature, manejo de errores y selección/envío del tenant donde aplica | Coordinar con Fase 3 cerrada y decisiones pendientes de SaaS             |
| 3     | [Identidad y perfiles](04-IDENTIDAD-PERFILES.md)                   | Login/registro, sesión, perfil cliente/profesional y guards coherentes         | Backend Fases 2 y 4 cerradas; register sigue legacy/onboarding pendiente |
| 4     | [Descubrimiento y catálogo público](05-DESCUBRIMIENTO-CATALOGO.md) | Directorio, filtros, detalle y oferta pública                                  | UI desde ya; integrar oferta según contrato de cierre de Fase 5 Catalog  |
| 5     | [Reserva y disponibilidad](06-RESERVA.md)                          | Flujo de reserva de punta a punta, estados y recuperación de errores           | UI desde ya; contrato de disponibilidad con Fases 6–7                    |
| 6     | [Espacio del cliente](07-ESPACIO-CLIENTE.md)                       | Citas, perfil y reseñas del cliente                                            | Contrato de citas/reviews se coordina con Fases 7 y 9                    |
| 7     | [Espacio del profesional](08-ESPACIO-PROFESIONAL.md)               | Perfil, oferta/servicios, agenda y gestión de citas                            | Contratos de Catalog, Scheduling y Appointments (5–7)                    |
| 8     | [Administración y notificaciones](09-ADMIN-NOTIFICACIONES.md)      | Operación administrativa y preferencias/notificaciones                         | Backend Notifications Fase 8 y alcance admin pendiente                   |
| 9     | [Integración y cierre](10-INTEGRACION-CIERRE.md)                   | Eliminar duplicaciones de UI, accesibilidad, responsividad y cierre por flujo  | Conforme avanzan las misiones anteriores                                 |

Las misiones 1–3 pueden avanzar mientras backend trabaja en Catalog. Misión 4 puede diseñarse con datos actuales, pero cualquier discrepancia de oferta/servicio debe acordarse antes de integrar. Misiones 5–8 pueden desarrollarse contra interfaces mockeadas o contratos versionados, y conectarse cuando cada flujo backend esté estable. La secuencia por tracks desde el cierre de Fase 5 está en [Arquitectura y coordinación](01-ARQUITECTURA-Y-COORDINACION.md).

## Reglas de trabajo

## Contrato mínimo para trabajar en paralelo

Por cada flujo backend/frontend, acordar antes de conectar:

No es necesario bloquear el trabajo visual esperando el contrato final: se puede trabajar con fixtures etiquetados y adaptar el API adapter una vez acordado.

## Señales para considerar una misión cerrada
