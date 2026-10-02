# Informe técnico — Fase 1: Shared Kernel mínimo

## 1. Propósito y alcance

Fase 0 está `CLOSED / APPROVED`. Este informe redefine el alcance de Fase 1 del plan de fases para consolidar únicamente infraestructura y contratos internos cuya transversalidad está respaldada por el código actual.

La fase debe preservar el comportamiento funcional, las rutas y los contratos HTTP existentes. No migra bounded contexts ni crea una arquitectura completa de capas.

### Incluido

- Consolidar el contrato mínimo del actor autenticado.
- Validar la estructura y los valores actuales de `userId` y `role` antes de construir ese actor.
- Mover el error técnico/HTTP legado y el manejador HTTP a ubicaciones compartidas explícitas.
- Mover la instancia Prisma a `shared/database`, sin centralizar consultas de negocio.
- Sacar el bootstrap del backend de `core/` y fijar una ubicación concreta.
- Registrar los elementos que permanecerán temporalmente en `core/`, su destino y su hito de retiro.

### Fuera de alcance

- `shared/events/`, eventos de dominio e infraestructura de eventos/outbox.
- **`JWT_SECRET` — comportamiento fuera de alcance:** Fase 1 no modifica la estrategia actual de configuración ni introduce validación fail-fast de `JWT_SECRET`. La aserción TypeScript `!` no constituye validación runtime. Si `JWT_SECRET` está ausente o es inválido, Fase 1 no redefine el comportamiento actual del arranque ni de la verificación/firma. La validación explícita de configuración y su política de fail-fast son precondición de Fase 2. Incorporarla en Fase 1 requeriría aprobar explícitamente un cambio de alcance.
- `tenantId`, memberships, scopes, permisos o rediseño de roles.
- Separación ejecutable entre errores de dominio y errores HTTP.
- Cambios de schema Prisma, migraciones, queries, contratos HTTP o funcionalidad de módulos.
- Refactor de las dependencias actuales entre módulos.
- JWT como abstracción transversal: la emisión/verificación continúa en Auth/Identity.

## 2. Evidencia del estado actual

| Evidencia | Observación relevante |
|---|---|
| [`src/middlewares/auth.middleware.ts`](../src/middlewares/auth.middleware.ts) | Verifica JWT, castea el payload a una interfaz local y asigna `req.user.id` y `req.user.role`; no valida estructuralmente ambos claims antes de usarlos. |
| [`src/types/express.d.ts`](../src/types/express.d.ts) y [`src/middlewares/types/express.d.ts`](../src/middlewares/types/express.d.ts) | Hay declaraciones de Express equivalentes; la declaración usa `Role` de Prisma. Debe quedar una única augmentation canónica y eliminarse la duplicada. |
| [`src/middlewares/auth.middleware.ts`](../src/middlewares/auth.middleware.ts) | `JWT_SECRET` se obtiene mediante una aserción no nula de TypeScript (`!`), que no valida su existencia en runtime. La evidencia estática no permite concluir por sí sola que el proceso arranque en estado inválido ni que se acepten claims no conformes. |
| [`src/core/errors/AppError.ts`](../src/core/errors/AppError.ts) | `AppError` tiene `statusCode` e `isOperational`; su semántica actual es técnica/HTTP, no un error de dominio neutral. |
| [`src/core/errors/errorHandler.ts`](../src/core/errors/errorHandler.ts) | El handler común traduce errores Zod, `AppError`, Prisma y Multer a respuestas HTTP. |
| `src/core/errors/httpStatus.ts` | El archivo observado está vacío; no se debe crear contenido ni moverlo como parte de Fase 1. Confirmar que no tenga imports y retirarlo como artefacto vacío si ninguno existe. |
| [`src/core/prisma.ts`](../src/core/prisma.ts) | Crea y exporta una instancia de `PrismaClient` consumida directamente por varios módulos. |
| [`src/core/config/media.ts`](../src/core/config/media.ts) | Define `DEFAULT_AVATAR`; el uso observado corresponde al alta de perfiles desde Auth, no demuestra que sea configuración global. |
| [`src/core/storage/upload.ts`](../src/core/storage/upload.ts) | Configura Multer, filesystem, límites y tipos MIME; es un adaptador concreto con comportamiento que debe preservarse. |
| [`src/core/server/index.ts`](../src/core/server/index.ts) | Ejecuta seeds, inicia Express e importa el worker de appointments como parte del arranque. |
| [`src/index.ts`](../src/index.ts) | Es el punto de entrada ejecutable actual e invoca `startServer` desde `core/server`. |

## 3. Componentes compartidos y límites

### Destino `src/shared/`

```text
src/shared/
  errors/
    AppError.ts                 # error técnico/HTTP legado; no es error de dominio
  database/
    prisma.ts                   # instancia/configuración técnica solamente
  http/
    errorHandler.ts             # traducción de errores existentes a HTTP
    express.d.ts                # única augmentation canónica
  types/
    actor-context.ts            # contrato mínimo del actor
```

No crear `shared/config/`, `shared/auth/` ni `shared/events/` en esta fase. Tampoco crear archivos vacíos para anticipar necesidades.

### Dependencias permitidas de `shared/`

```text
shared/
  ├─> librerías/frameworks técnicos
  └─> tipos primitivos o contratos propios de shared

shared/ ─X─> modules/*
shared/ ─X─> DTOs de módulos
shared/ ─X─> services de módulos
shared/ ─X─> controllers de módulos
shared/ ─X─> entidades/modelos de negocio de módulos
```

Esta regla no impide que `shared/http/errorHandler.ts` use Express y librerías técnicas para traducir errores al protocolo HTTP. Impide que el handler y cualquier otro componente de `shared/` consulten o importen lógica o modelos de negocio de los módulos.

| Elemento | Clasificación | Evidencia/motivo | Impacto | Fase 1 |
|---|---|---|---|---|
| `shared/types/actor-context.ts` | Shared Kernel definitivo mínimo | El middleware entrega `id` y `role` en `req.user`, consumidos por middleware/rutas. | Desacopla el contrato interno de la augmentation HTTP y del tipo Prisma. | Obligatorio |
| `shared/errors/AppError.ts` | Infraestructura compartida; error técnico/HTTP legado | Contiene `statusCode` y es serializado por el handler. | Permite conservar el comportamiento mientras se mueven consumidores. No establece errores de dominio. | Obligatorio |
| `shared/http/errorHandler.ts` | Adaptador HTTP compartido | Traduce errores de librerías/infraestructura a las respuestas actuales. | Centraliza el límite Express sin mover reglas de negocio. | Obligatorio |
| `shared/http/express.d.ts` | Tipado de integración HTTP | La integración Express requiere tipar `Request.user`. | Será la única augmentation canónica; los dos archivos actuales se consolidan aquí y se elimina el duplicado tras verificar referencias y compilación. | Obligatorio |
| `shared/database/prisma.ts` | Infraestructura compartida | Existe una instancia común de Prisma. | Evita instancias dispersas; no migra queries ni modelos de dominio. | Obligatorio |
| `shared/config/` | Pospuesto | `DEFAULT_AVATAR` es una constante de presentación de perfil, no evidencia de configuración global. | Evita un contenedor genérico de configuración. | No crear |
| `shared/events/` | Pospuesto | No forma parte de las necesidades técnicas mínimas probadas para esta fase; notifications/events pertenecen a fases posteriores. | Evita anticipar contratos, retries u outbox. | No crear |
| `shared/auth/` / utilidades JWT | Pospuesto/no Shared Kernel | JWT está usado por Auth/Identity; no se observó un mecanismo transversal entre contextos. | Mantiene claims y credenciales bajo su propietario. | No crear |
| Queries o repositories Prisma globales | Excluido | Los módulos realizan operaciones de negocio diferentes. | Previene el repositorio global y el acoplamiento entre contextos. | Prohibido en esta fase |

## 4. `ActorContext` y validación de JWT

El contrato interno transicional debe contener solamente los datos actuales necesarios para identificar al actor:

```ts
export interface ActorContext {
  id: number;
  role: "ADMIN" | "PROFESSIONAL" | "CLIENT";
}
```

`role` transporta temporalmente uno de los valores actuales aceptados por el backend; la unión literal representa el contrato existente y no define semántica futura. Antes de construir `ActorContext`, el middleware/Auth debe comprobar:

- `userId` es un entero positivo válido para el identificador actual;
- `role` es uno de los valores actualmente admitidos (`ADMIN`, `PROFESSIONAL`, `CLIENT`);
- la verificación de firma/expiración JWT terminó correctamente;
- la asignación del rol validado no usa `as any`.

La comprobación de claims es validación de frontera, no un rediseño de roles ni de JWT. No agregar `tenantId`, `membershipId`, `scope`, permisos ni reglas de ownership.

La validación de claims no valida ni configura `JWT_SECRET`; son controles distintos. El estado actual usa `process.env.JWT_SECRET!`, que solo silencia una comprobación de TypeScript y no verifica la variable al arrancar. Si la variable falta, la verificación o firma de tokens puede fallar en runtime según el flujo que use la clave; la evidencia revisada no demuestra que esto permita aceptar claims inválidos. La aceptación de claims no conformes es un problema independiente que se aborda validando estructura y valores después de verificar la firma.

**Decisión de alcance:** la validación fail-fast de `JWT_SECRET` y la configuración global validada al arrancar quedan fuera de Fase 1. No se afirma que Fase 1 endurezca toda la frontera de autenticación. Añadir esa validación en Fase 1 requiere aprobarlo como cambio explícito de alcance y documentar el cambio de comportamiento de arranque.

Por tanto, no describir la ausencia de `JWT_SECRET` como evidencia de que se aceptan claims no conformes ni como prueba de que la aplicación arranque en estado inválido. El hallazgo sustentado es que `!` no hace validación runtime y que la configuración no tiene fail-fast documentado.

La definición completa de Identity —incluidos `JWT_SECRET`, el contrato general de claims, rotación y compatibilidad de tokens— es una **precondición/riesgo de Fase 2**. Antes de considerar Identity migrado, debe existir una política explícita para configuración ausente o inválida y validación del contrato de tokens. La validación mínima de estructura/valores de `userId` y `role` antes de formar `ActorContext` sí es obligatoria en Fase 1.

## 5. Frontera de Prisma

`shared/database` proporciona la instancia y, solo si hay necesidad demostrada, configuración técnica y ciclo de vida del cliente Prisma.

No debe:

- contener queries de negocio como `findUser` o `createAppointment`;
- concentrar repositories de todos los módulos;
- imponer políticas de ownership, autorización o tenancy;
- ofrecer modelos Prisma como contratos de dominio o HTTP;
- implicar que mover el cliente equivale a aislar persistencia.

Los módulos actuales pueden continuar importando Prisma durante esta migración. Extraer persistencia y decidir contratos entre contextos se hará en las fases de los módulos correspondientes.

## 6. Salida de `core/`: hitos, destinos y criterio de retiro

| Elemento actual | Hito | Destino concreto | Tratamiento |
|---|---|---|---|
| `src/core/errors/AppError.ts` | Fase 1 | `src/shared/errors/AppError.ts` | Mover conservando `statusCode`, `isOperational` y semántica existente. Clasificarlo como error técnico/HTTP legado, nunca como error de dominio. |
| `src/core/errors/errorHandler.ts` | Fase 1 | `src/shared/http/errorHandler.ts` | Mover y ajustar imports sin alterar status, cuerpo ni manejo actual. |
| `src/core/errors/httpStatus.ts` | Fase 1 | Sin destino | Está vacío: confirmar ausencia de consumidores y retirar únicamente el archivo vacío. No inventar una abstracción. |
| `src/core/prisma.ts` | Fase 1 | `src/shared/database/prisma.ts` | Mover la instancia y actualizar imports; no mover queries. |
| `src/core/server/index.ts` | Fase 1 | `src/bootstrap/server.ts` | Trasladar la composición de arranque conservando la invocación desde `src/index.ts`, seeds y worker actuales. `src/index.ts` permanece como entrypoint del proceso. |
| `src/core/config/media.ts` | Fase 4 — Profiles | `src/modules/profiles/media/default-avatar.ts` | Reubicar cuando Profiles tenga propietario definido; no tratarlo como config global en Fase 1. |
| `src/core/storage/upload.ts` | Fase 4 — Profiles/infraestructura | `src/modules/profiles/infrastructure/storage/multer-upload.ts` | Mantener el comportamiento y evaluar políticas de avatar/certificate al migrar Profiles. El destino es un adaptador del módulo, no Shared Kernel. |

### Regla de retiro de `core/`

**`core/` no se elimina hasta que esté vacío y todos sus consumidores hayan sido migrados.**

Al cierre de Fase 1 podrán permanecer temporalmente `core/config/media.ts` y `core/storage/upload.ts`; sus destinos e hitos están fijados en la tabla. No se permitirá que `core/` funcione como una segunda arquitectura permanente ni agregarle nuevas responsabilidades compartidas. Una vez que `core/` esté vacío y los imports/consumidores hayan sido migrados y validados, se podrá eliminar la carpeta.

### Consolidación obligatoria de Express augmentation

```text
src/types/express.d.ts
src/middlewares/types/express.d.ts
                ↓
src/shared/http/express.d.ts   (única augmentation canónica)
                ↓
eliminar la augmentation duplicada
```

La migración debe confirmar primero qué declaraciones incluye TypeScript, trasladar la declaración necesaria a la ubicación canónica y retirar el segundo archivo con augmentation equivalente. No basta con que el compilador tolere dos declaraciones mergeables.

## 7. Dependencias e imports

```text
app/bootstrap ──> módulos
app/bootstrap ──> shared
middlewares ────> shared
módulos ─────────> shared
shared ──────────> shared
shared ──────────X módulos
```

- `shared/` no importa controllers, services, DTOs ni modelos de negocio de módulos.
- `shared/database` exporta infraestructura; no queries.
- `shared/` solo puede depender de librerías/frameworks técnicos y tipos primitivos o contratos propios de `shared`; no importa módulos, DTOs, services, controllers ni entidades/modelos de negocio de módulos.
- Cualquier nuevo elemento en `shared/` debe justificarse como infraestructura técnica transversal o contrato/primitiva propiedad de `shared`, sin depender de un bounded context específico.
- No se prohíbe absolutamente `module → module`. Los cruces existentes se mantienen en Fase 1; los cruces entre bounded contexts deben usar contratos explícitos apropiados. La elección entre port, facade, read model, referencia por ID, evento u otro mecanismo se hace en la fase correspondiente.
- JWT permanece en Auth/Identity; el middleware traduce claims validados al `ActorContext`.
- Ningún movimiento debe crear ciclos ni cambiar rutas, respuesta HTTP o comportamiento.

## 8. Cambios pospuestos

- Separar errores de dominio de errores HTTP. `AppError` permanece como error técnico/HTTP legado en Fase 1; su evolución se decide al diseñar capas de aplicación/dominio por contexto.
- Fail-fast de `JWT_SECRET`, configuración global validada al arrancar y modelo definitivo de Identity/Auth: Fase 2, salvo aprobación explícita de cambio de alcance para Fase 1.
- Tenant, memberships, scopes, permisos y significado nuevo de roles: fases de Identity/Tenancy según sus precondiciones.
- Eventos, outbox, retries e idempotencia.
- Mover `DEFAULT_AVATAR` y el adaptador de subida antes de la fase de Profiles.
- Repositories, ports, queries locales y contratos cross-context concretos.
- Refactor de los services, DTOs y contratos de módulos.

## 9. Orden y criterios de aceptación

1. Inventariar consumidores de errores, Prisma, `req.user`, `media`, storage y bootstrap. Confirmar que no hay imports de `httpStatus.ts`.
2. Crear solo las carpetas compartidas con contenido justificado; no crear `config`, `events` ni JWT genérico.
3. Mover `AppError` y el handler; comprobar que se conservan respuestas para AppError, Zod, Prisma, Multer y errores inesperados.
4. Mover la instancia Prisma; comprobar que solo hay una instancia runtime y que no se centralizaron queries.
5. Implementar la validación mínima de claims antes de construir `ActorContext`; consolidar la augmentation de Express.
6. Mover bootstrap a `src/bootstrap/server.ts`; mantener el entrypoint `src/index.ts` y los efectos actuales de startup.
7. Registrar `media` y `upload` como transitorios hasta Fase 4; no cambiar su comportamiento.
8. Ejecutar type-check/build, pruebas disponibles y una verificación de arranque pertinente.

Fase 1 estará lista para Code Review cuando:

- el alcance de este informe y el de `REFACTOR_PHASES.md` coincidan;
- `src/shared/http/express.d.ts` sea la única augmentation canónica y no quede ningún segundo archivo con augmentation equivalente;
- `tsc --noEmit` termine exitosamente;
- la revisión de imports/propiedad confirme que `shared/` no referencia módulos, DTOs, schemas, services, controllers, entidades, modelos ni lógica de negocio de módulos; cada elemento compartido tenga justificación transversal propia;
- `shared/` contenga solo las piezas señaladas y no lógica específica de negocio;
- haya un solo contrato efectivo de `Request.user`;
- los claims se validen antes de formar `ActorContext`;
- el rol validado se asigne sin `as any`;
- `AppError` conserve sus campos/semántica y siga siendo explícitamente técnico/HTTP legado;
- el handler conserve las respuestas HTTP actuales;
- Prisma esté compartido como infraestructura, sin repositorio global;
- `shared/` solo dependa de librerías/frameworks técnicos y tipos primitivos o contratos propios de `shared`, sin imports de módulos o sus contratos/modelos de negocio;
- `core/` no se use como arquitectura paralela y sus excepciones tengan hito/destino;
- no cambien schema/migraciones, rutas, contratos HTTP ni comportamiento funcional;
- pasen las validaciones del proyecto.
