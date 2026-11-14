# Arquitectura de frontend y coordinación con backend

Este documento concreta cómo separar responsabilidades en `app-consultorio` y cómo emparejar cada flujo con el backend. Complementa el índice de misiones en `00-PLAN.md`.

## Decisión de arquitectura

Adoptar **feature-first modular con capas ligeras por feature**. La UI no necesita reproducir las entidades, agregados, repositorios y casos de uso de dominio del backend: el servidor es dueño de reglas de negocio, autorización y persistencia. El frontend sí debe separar presentación, coordinación de pantalla y comunicación HTTP para evitar componentes, hooks y APIs monolíticos.

```text
Página / ruta
  └─ compone componentes y hooks de la feature
       └─ hook de aplicación (query / mutation / coordinación UI)
            └─ API adapter de la feature (HTTP + mapeo DTO)
                 └─ cliente HTTP compartido
                      └─ backend
```

Las dependencias van hacia abajo. `shared` no importa features. Una feature no importa internals de otra; cuando haga falta colaboración, pasa datos explícitos o se acuerda un contrato compartido pequeño.

## Estructura objetivo

Es una dirección de migración, no una tarea para mover todos los archivos en un solo PR:

```text
src/
  app/
    App.tsx
    router/
    providers/
  shared/
    api/
      http-client.ts
      api-error.ts
    ui/
    hooks/
    lib/
    config/
  features/
    identity/{api,application,model,ui,pages}/
    profiles/{api,application,model,ui,pages}/
    discovery/{api,application,model,ui,pages}/
    catalog-management/{api,application,model,ui,pages}/
    booking/{api,application,model,ui,pages}/
    appointments/{api,application,model,ui,pages}/
    scheduling/{api,application,model,ui,pages}/
    reviews/{api,application,model,ui,pages}/
    notifications/{api,application,model,ui,pages}/
    preferences/{api,application,model,ui,pages}/
    admin/{api,application,model,ui,pages}/
  layouts/
  styles/
```

Las features se nombran en minúscula. No crear carpetas vacías: aparecen al migrar su primer flujo. `layouts/` puede seguir global mientras contenga composición visual y navegación, sin lógica de negocio.

## Responsabilidad por archivo

| Elemento | Responsabilidad | No debe hacer |
|---|---|---|
| `pages/*.tsx` | Componer pantalla, leer parámetros de ruta y conectar layout con hooks | Llamar Axios, contener reglas de negocio o formularios enormes |
| `ui/*.tsx` | Renderizar UI desde props y emitir eventos | Consultar API/cache/router/store directamente |
| `application/use*.ts` | Coordinar queries/mutations, cache y estado del flujo | Construir requests HTTP de bajo nivel |
| `api/*.api.ts` | Encapsular endpoint/headers, tipar DTO HTTP y mapear a modelo de UI si difiere | Contener JSX o decidir permisos/reglas autoritativas |
| `model/*.ts` | Tipos de UI, query keys y funciones puras | Importar React, Axios o internals de otra feature |
| `shared/api/http-client.ts` | Base URL, bearer token, refresh, headers transversales acordados y errores de transporte | Conocer rutas de negocio o inferir el tenant |
| `shared/ui/*` | Componentes visuales genéricos y accesibles | Conocer perfiles, citas o endpoints |
| `app/providers/*` | Configurar Router, Redux, QueryClient y providers | Llevar lógica de pantalla |

### ¿Use cases y repositories en frontend?

Un hook de aplicación como `useCreateAppointment` suele ser suficiente en React. Extraer una función/caso de uso puro cuando coordina pasos no visuales, tiene lógica local relevante o debe usarse fuera de React. No crear clases `UseCase`, `Repository` y `Port` mecánicamente para cada CRUD.

Un repositorio/adaptador explícito se justifica si hay varias fuentes de datos, cache local especializado, transformación compleja o una frontera que realmente necesite aislamiento. Para la mayoría de las pantallas, un API adapter más TanStack Query separan bien las responsabilidades sin una capa ceremonial.

## Estado y datos

- **TanStack Query:** cache y ciclo de vida de datos del servidor; query keys por feature y tenant cuando corresponda.
- **Redux:** sesión/token y estado global que realmente sobreviva entre rutas. No copiar resultados de query a Redux.
- **Estado local React:** inputs, modal abierto, paso del wizard y filtros efímeros.
- **URL:** filtros y selecciones que deban sobrevivir recarga o compartirse.
- Al cerrar sesión o cambiar de tenant, limpiar o particionar la cache para no mostrar datos del contexto anterior.

## Ejemplo concreto: catálogo público

```text
features/discovery/pages/DirectoryPage.tsx
  compone filtros y lista; pasa eventos/props
features/discovery/application/usePublicCatalog.ts
  usa useQuery y la query key del tenant/filtros
features/discovery/api/catalog.api.ts
  pide el endpoint tenant-scoped y convierte el DTO HTTP si hace falta
features/discovery/model/catalog.types.ts
  define los datos que consume la UI
shared/api/http-client.ts
  transporta la petición y aplica políticas transversales
```

La página no conoce headers HTTP. La tarjeta no conoce Axios. El API adapter no decide si un profesional puede publicar. Catalog/backend determina elegibilidad y cuál oferta se puede reservar.

## Migración gradual de un flujo

1. Elegir un flujo vertical y enumerar sus rutas, componentes, hooks, API y tipos actuales.
2. Registrar el contrato backend que consume.
3. Crear la carpeta de feature y migrar sólo ese flujo: API/tipos → hooks de aplicación → página/UI.
4. Mantener fachadas legacy delgadas si hay otros consumidores y migrar referencias gradualmente.
5. Buscar consumidores de los archivos antiguos; borrar duplicados sólo cuando no quede ninguno.
6. Registrar contrato integrado, archivos retirados y verificaciones en la misión.

No mantener dos implementaciones activas de la misma operación. Durante la transición puede quedar una fachada que delega en el módulo nuevo.

## Acuerdo para emparejar con backend

Antes de conectar una operación nueva o alterada, registrar:

```text
Flujo / dueño backend:
Método y ruta:
Autenticación y X-Tenant-ID:
Request (ejemplo):
Response (ejemplo):
Estados / transiciones:
Errores esperados y significado:
Timezone, moneda, paginación u otras convenciones:
Commit/PR que contiene el contrato:
```

Backend es dueño del DTO HTTP y las reglas de negocio. Frontend puede tener un modelo de vista distinto y mapearlo en `api/`. No modificar contratos backend desde la rama frontend sin coordinación.

## Emparejamiento desde el cierre de Fase 5

| Track frontend | Flujo | Referencia backend | Se puede adelantar | Requiere contrato backend acordado |
|---|---|---|---|---|
| A | Base visual y shell | Independiente | Tokens, componentes, navegación y responsive | Nada de Catalog/Scheduling |
| B | Descubrimiento público | Fase 5 Catalog en cierre | UI con fixture o DTO vigente | Oferta por afiliación, lectura pública y qué oferta se puede reservar |
| C | Identidad y perfiles | Fases 2 y 4 cerradas | Ordenar APIs/tipos y formularios existentes | Cambios a registro/onboarding o afiliación aún no expuesta |
| D | Catálogo del profesional | Fase 5 Catalog | Shell y formularios con campos confirmados | Oferta por tenant, activar/desactivar y efecto sobre citas futuras |
| E | Agenda y reserva | Fases 6 Scheduling y 7 Appointments | Wizard, navegación y presentación usando fixtures | Timezone, slots, conflictos concurrentes, guest/auth y transiciones |
| F | Cliente: citas y reseñas | Fases 7 y 9 | UI con contratos vigentes | Cambios a elegibilidad/transiciones de reseña o cita |
| G | Admin y notificaciones | Fases 8–9 y alcance admin | Consolidar layouts | Ownership, tenant scope, canales y permisos reales |

El primer trabajo práctico puede ser Track A mientras backend termina la revisión de cierre de Catalog; en paralelo se inventaría Track B. No cambiar booking al modelo nuevo hasta que backend declare estable su contrato de oferta reservable.

## Git y worktrees

- VS Code, Trae y Antigravity continúan en el árbol principal; Codex edita `app-consultorio/` en su worktree `feature/frontend`.
- Crear el worktree desde un commit identificable que incluya el cierre aprobado de Fase 5, no desde cambios sin commit. Los cambios locales no se copian al worktree.
- Cuando backend comprometa un cambio de contrato necesario, integrar ese commit/branch en `feature/frontend` con el merge/rebase acordado. No hay sincronización automática de archivos.
- Integrar frontend de regreso mediante PR/merge a la rama base acordada. No incluir artefactos `dist/` salvo que el repositorio los versione deliberadamente.
- Mientras el contrato backend no esté comprometido, usar fixtures identificados como tales y registrar el contrato pendiente; no inventar DTOs alternativos.

## Orden recomendado de arranque

1. Identificar el commit/branch que cierra Fase 5 y será base de frontend.
2. Hacer el baseline corto de Misión 0; ya se observa booking duplicado y convenciones inconsistentes de nombres/carpeta.
3. Hacer Misión 1 visual sin tocar transporte HTTP.
4. Elegir un primer vertical slice: directorio público o identidad/perfil, según prioridad del producto.
5. Emparejar booking con Catalog y las decisiones de Scheduling/Appointments cuando sus contratos estén listos.

## Criterios arquitectónicos por feature

- La ruta/página compone la experiencia.
- UI recibe datos y acciones por props.
- Query/mutation vive en hook de aplicación de la feature.
- HTTP vive en el adapter de esa feature con DTO explícito.
- TanStack Query es fuente de verdad para datos remotos; backend para reglas autoritativas.
- Rol, privacidad y tenant coinciden con el contrato del servidor.
- Archivos duplicados se retiran después de migrar todos sus consumidores.
