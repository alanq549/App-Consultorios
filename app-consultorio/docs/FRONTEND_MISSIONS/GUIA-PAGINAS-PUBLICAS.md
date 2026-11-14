# Guía de implementación — Home, Registro y Login

## Objetivo y alcance

Implementar el nuevo diseño Stitch para las tres vistas públicas prioritarias:

- Home;
- Registro;
- Login.

Esta guía propone cómo dividir vistas Stitch de 700+ líneas en archivos con responsabilidades claras, qué mover primero, qué conservar y qué contrato del backend consume cada flujo. **No requiere reescribir todo el frontend ni cambiar el backend.**

No incluye por ahora rediseñar verificación de cuenta, recuperación/restablecimiento de contraseña, catálogo público o booking. Esas rutas deben seguir funcionando y sus enlaces deben apuntar a las rutas nuevas de Login/Registro.

## Arquitectura para estas tres vistas

Usar módulos por feature con capas simples:

```text
src/
  routes/
    AppRouter.tsx          # conservar aquí durante este alcance
  features/
    public-site/
      pages/HomePage.tsx
      ui/
        PublicHeader.tsx
        PublicFooter.tsx
        home/
          HomeHero.tsx
          HomeSectionNameFromStitch.tsx
          ...
    auth/
      api/auth.api.ts
      application/
        useLogin.ts
        useRegister.ts
      model/auth.types.ts
      pages/
        LoginPage.tsx
        RegisterPage.tsx
      ui/
        AuthLayout.tsx
        LoginForm.tsx
        RegisterForm.tsx
        RegisterRoleSelector.tsx
        RegisterIdentityFields.tsx
        ProfessionalFields.tsx
        PasswordField.tsx
    specialties/
      api/specialty.api.ts
      application/useActiveSpecialties.ts
      model/specialty.types.ts
  shared/
    ui/                  # sólo componentes que ya se reutilizan
    api/                 # cliente HTTP transversal existente, migrar después
  layouts/
  styles/
```

`SectionNameFromStitch` se sustituye por el nombre semántico que tenga cada sección del diseño real. No crear una carpeta o componente por cada elemento HTML: separar secciones visuales completas y piezas con estado/comportamiento propio.

No mover `AppRouter.tsx` a `app/` en esta primera implementación. El repo ya lo tiene en `src/routes/`; cambiar de ubicación no aporta al objetivo de dividir las tres vistas y generaría movimiento de imports sin beneficio funcional.

### Qué va en cada capa

- `pages`: conecta la ruta, el layout y los hooks; no debe contener cientos de líneas de markup ni requests HTTP.
- `ui`: JSX y estilos de una pieza visual; recibe datos y callbacks por props.
- `application`: hooks que orquestan la API, errores, loading, Redux y navegación.
- `api`: función que conoce método/ruta HTTP y el DTO del backend.
- `model`: tipos de request/response y tipos de vista; no importa React ni Axios.
- `shared/ui`: sólo controles visuales que Home, Login y Registro realmente compartan (por ejemplo Button, TextField, PasswordField). Si el componente sólo sirve para Home, se queda en Home.

No crear repositorios/clases de casos de uso para cada request. En este flujo basta con API adapter + hook de React Query/Redux o una función de aplicación. No migrar `axios.ts`, Redux y todas las features como parte de esta guía.

## Cómo partir código Stitch de más de 700 líneas

1. Mantener el diseño abierto y marcar sus secciones semánticas: header, hero, bloque de beneficios, pasos, testimonios, CTA final, footer u otras secciones que realmente aparezcan.
2. Crear la página como composición breve de esas secciones.
3. Extraer cada sección visual grande a `ui/home/NombreDeSeccion.tsx`.
4. Extraer piezas repetidas sólo si aparecen en más de una vista o tienen interacción independiente (menú móvil, selector de rol, control de mostrar contraseña).
5. Dejar el estado cerca del componente que lo usa. Por ejemplo, apertura del menú en `PublicHeader`; show/hide password en `PasswordField` o en el formulario, según el diseño.
6. Mantener los estilos de cada sección junto a su JSX (Tailwind/CSS actual). Tokens globales sólo para valores compartidos reales.
7. Cuando el renderizado visual ya esté dividido, conectar API y comportamiento. No mezclar la extracción de markup con una reescritura de estado/API completa.

Una página de composición puede tener aproximadamente 30–80 líneas, pero es una guía de lectura, no una cuota. Un componente de sección puede tener más si una interacción propia lo justifica. La meta es que cada archivo tenga un motivo claro para cambiar.

Los archivos/capturas Stitch de las tres vistas no aparecen actualmente en el repo inspeccionado; por eso los nombres de secciones de ejemplo son marcadores. Al implementar, sustituirlos por las secciones que realmente aparecen en cada diseño y conservar sus assets originales.

### Ejemplo para Home

```text
HomePage.tsx                 # composición / orden de secciones
PublicHeader.tsx             # navegación y menú responsive
HomeHero.tsx                 # mensaje principal + CTA
HowItWorksSection.tsx        # sólo si esa sección existe en Stitch
BenefitsSection.tsx          # sólo si esa sección existe en Stitch
HomeFinalCta.tsx             # bloque final de conversión
PublicFooter.tsx             # navegación secundaria y contacto
```

### Ejemplo para Login

```text
LoginPage.tsx                # AuthLayout + LoginForm
AuthLayout.tsx               # marco visual compartido por Login/Registro
LoginForm.tsx                # campos y eventos del formulario
PasswordField.tsx            # sólo si realmente se comparte con Registro
useLogin.ts                  # mutation, sesión, /users/me y navegación
auth.api.ts                  # POST /auth/login y GET privado /users/me
```

### Ejemplo para Registro

```text
RegisterPage.tsx             # AuthLayout + RegisterForm
RegisterForm.tsx             # coordina valores, validación y submit
RegisterRoleSelector.tsx     # CLIENT / PROFESSIONAL
RegisterIdentityFields.tsx   # email, nombre, apellido, teléfono, contraseña
ProfessionalFields.tsx       # especialidad y descripción, sólo PROFESSIONAL
useRegister.ts               # request y estado de submit
useActiveSpecialties.ts      # opciones del selector desde Catalog
```

## Archivos actuales: destino y acción

| Archivo actual | Acción para este alcance | Destino / notas |
|---|---|---|
| `src/pages/Home.tsx` | Reemplazar su uso y luego eliminar | Mover la ruta a `features/public-site/pages/HomePage.tsx`; borrar el archivo viejo después de verificar imports |
| `src/features/auth/pages/auth.tsx` | Dejar de usar como página con tabs; conservar temporalmente o convertir en redirect | Crear `LoginPage.tsx` y `RegisterPage.tsx`; la ruta `/auth` redirige a `/login` durante compatibilidad |
| `src/features/auth/components/LoginForm.tsx` | Refactorizar y mantener | Dejar sólo UI del login; quitar request/redirect/toast acoplados; conservar accesibilidad y estados del diseño |
| `src/features/auth/components/RegisterForm.tsx` | Refactorizar y mantener durante la migración | Dividir por secciones semánticas; conservar discriminación de payload por rol |
| `src/api/auth.api.ts` | Reutilizar y completar si hace falta | Convertir en única frontera HTTP para login/register; login hoy la evita desde `useAuthActions` |
| `src/hooks/auth/useAuthActions.ts` | No eliminar en esta misión | Tiene consumidores de login, registro, logout, forgot y reset; separar `useLogin`/`useRegister` gradualmente y mantener las otras acciones |
| `src/hooks/specialties/useSpecialties.ts` | Reutilizar primero | Registro ya consulta specialties. Mover la query a `features/specialties/` sólo cuando se comprueben y migren todos sus consumidores admin |
| `src/api/specialty.api.ts` | Reutilizar primero | `/specialties` lo sirve Catalog. No duplicar la llamada en auth |
| `src/routes/AppRouter.tsx` | Modificar | `HomePage` en `/` (o conservar `/home` como alias); añadir `/login`, `/register`; conservar rutas privadas y auxiliares |
| `src/features/auth/pages/ForgotPassword.tsx` | Ajuste mínimo de enlaces | Dejar `/auth` y usar `/login` |
| `src/features/auth/pages/ResetPasswordPage.tsx` | Ajuste mínimo de enlaces/redirect | Usar `/login` en vez de `/auth/login`; mantener el resto fuera de alcance |
| `src/features/auth/pages/VerifyAccount.tsx` | Ajuste mínimo de enlaces | Usar `/login` en vez de la ruta inválida `/auth/auth`; no rediseñar ahora |
| `src/App.tsx`, `src/main.tsx`, `src/api/axios.ts`, `src/store/` | No mover en esta misión | Mantener providers, refresh y store actuales mientras las tres vistas se separan |
| `src/types/auth.types.ts` | Dividir sólo los tipos necesarios | Crear request/response de auth en `features/auth/model`; dejar perfiles/session types compartidos hasta inventariar todos los consumidores |

### Qué no borrar todavía

- No borrar `useAuthActions.ts` hasta migrar todos sus consumidores, incluidos forgot/reset y logout.
- No borrar `specialty.api.ts` ni su hook hasta verificar los consumidores del panel admin.
- No borrar `AuthPage` de inmediato si enlaces/bookmarks aún apuntan a `/auth`; primero conservar un redirect.
- No borrar `Home.tsx` hasta que `AppRouter` use `HomePage` y una búsqueda confirme que no hay otros imports.

## Rutas propuestas

| Ruta nueva | Vista | Compatibilidad durante migración |
|---|---|---|
| `/` | Home pública | Puede conservar `/home` como alias a `/` |
| `/login` | Login | `/auth` redirige a `/login` |
| `/register` | Registro | Si se conserva `/auth?mode=register`, redirigir a `/register` o ignorar el query según el enlace histórico |
| `/verify` | Verificación existente | Se conserva |
| `/forgot-password` | Recuperar contraseña existente | Se conserva |
| `/reset-password` | Restablecer contraseña existente | Se conserva |

No usar un mismo `AuthPage` con estado `mode` para dos URL si el objetivo es navegación directa y enlaces compartibles a Login/Registro. `AuthLayout` sí puede ser común.

## Contratos actuales del backend

Los prefijos siguientes parten de `app.ts`: `/api/auth` y `/api/specialties`. No requieren `X-Tenant-ID` para estos flujos.

### Home

La Home actual es estática y no consume API. El nuevo diseño puede conservar ese comportamiento. Si el Stitch muestra specialties dinámicas, consultar `GET /api/specialties` y tratarlo como contenido de Catalog; no asumir que hace falta cargar catálogo/ofertas para renderizar Home.

### Selector de especialidad del registro profesional

```http
GET /api/specialties
```

- Público, sin bearer token ni `X-Tenant-ID`.
- Respuesta: arreglo de specialties activas con campos públicos `id`, `name`, `description` (descripción puede ser `null`).
- No usar endpoints de specialties inactivas/admin en registro.
- La especialidad elegida se envía como `specialtyId: number` al endpoint de registro.

### Registro

```http
POST /api/auth/register
Content-Type: application/json
```

Cliente:

```json
{
  "role": "CLIENT",
  "email": "persona@example.com",
  "password": "minimo-8-caracteres",
  "profile": {
    "name": "Ana",
    "lastName": "López",
    "phone": "5512345678"
  }
}
```

Profesional:

```json
{
  "role": "PROFESSIONAL",
  "email": "profesional@example.com",
  "password": "minimo-8-caracteres",
  "profile": {
    "name": "Luis",
    "lastName": "Pérez",
    "phone": "5512345678",
    "specialtyId": 12,
    "description": "Atención en ..."
  }
}
```

Reglas actuales observadas en `RegisterDTO`:

- Roles públicos permitidos: `CLIENT` y `PROFESSIONAL`; no ofrecer `ADMIN`.
- `email` debe tener formato de email; `password` mínimo 8 caracteres.
- `profile.name` requerido.
- `lastName` y `phone` son opcionales en backend para ambos roles, aunque la UI actual los marca requeridos. Si producto quiere hacerlos obligatorios, se puede validar en frontend, pero no hay que asumir que el backend ya lo exige.
- `specialtyId` es requerido para `PROFESSIONAL`; `description` es opcional.
- Respuesta `201`: `{ id, email, role, isVerified, createdAt, updatedAt }`.
- El registro dispara verificación de correo; mostrar una confirmación y no iniciar sesión salvo que el contrato se cambie.
- No incluir el formulario/selector de tenant: este registro profesional **no crea una afiliación de consultorio ni una oferta reservable**. La solicitud de specialty y la oferta por afiliación son conceptos distintos.

### Login y completar sesión

```http
POST /api/auth/login
Content-Type: application/json
```

Request:

```json
{ "email": "persona@example.com", "password": "..." }
```

Respuesta `200`:

```json
{
  "token": "<access-token>",
  "refreshToken": "<refresh-token>",
  "user": {
    "id": 42,
    "email": "persona@example.com",
    "role": "CLIENT",
    "isVerified": true
  }
}
```

El login rechaza credenciales inválidas y cuentas no verificadas con error de credenciales. La UI debe mostrar un mensaje general y no intentar distinguir si el email existe.

Tras guardar los tokens, el frontend actual hace:

```http
GET /api/users/me
Authorization: Bearer <access-token>
```

Esta llamada es necesaria para completar perfil/config en Redux y decidir la navegación por rol. Mantener ese paso hasta que Identity/backend defina un contrato distinto. Si falla `me`, no presentar el flujo como login totalmente completado; limpiar o manejar explícitamente la sesión parcial.

### Renovación de sesión

El interceptor existente usa el flujo de refresh. El contrato actual es:

```http
POST /api/auth/refresh
Content-Type: application/json

{ "refreshToken": "<refresh-token>" }
```

No rehacer refresh dentro de los formularios. La solicitud de refresh debe continuar usando el cliente/configuración existente de `src/api/refresh.ts` y no provocar un ciclo de refresh si falla.

## Plan por archivos/commits

### Paso 1 — Describir las vistas Stitch

- Crear una lista de secciones por cada diseño, sin copiar todavía todo el JSX.
- Identificar assets, fuentes, iconos y qué elementos son interactivos.
- Registrar qué contenido es estático y cuál necesita API.

### Paso 2 — Crear shell visual y páginas nuevas

Crear:

```text
src/features/public-site/pages/HomePage.tsx
src/features/public-site/ui/PublicHeader.tsx
src/features/public-site/ui/PublicFooter.tsx
src/features/public-site/ui/home/<secciones reales>.tsx
src/features/auth/pages/LoginPage.tsx
src/features/auth/pages/RegisterPage.tsx
src/features/auth/ui/AuthLayout.tsx
```

En este paso se puede renderizar el contenido Stitch con datos/handlers temporales, pero los botones deben navegar a rutas reales.

### Paso 3 — Partir formularios por intención

Crear los componentes de Registro de la estructura propuesta. Implementar los formularios como `form` HTML y los botones de rol como `type="button"`. No crear un único `PublicPages.tsx` que contenga las tres vistas.

Mantener errores junto al campo cuando backend tenga detalle seguro; loading y submit-disabled en ambos formularios; y anuncio accesible para errores globales. Evitar `alert()` como feedback final y no dejar mensajes de error de login que revelen existencia de una cuenta.

### Paso 4 — Encapsular las acciones de auth

- Hacer que login y register llamen `authApi`, no Axios directamente desde componentes.
- `useLogin` realiza POST login, guarda credenciales, consulta `/users/me`, actualiza config y navega según rol.
- `useRegister` realiza POST register y devuelve estado de éxito para una vista de confirmación.
- Reutilizar `specialtyApi.getAll()` y el query existente al principio; evitar duplicar `GET /specialties`.
- Mantener `useAuthActions` hasta haber migrado forgot/reset/logout y verificado todos los consumidores.

### Paso 5 — Conectar rutas y compatibilidad

- Cambiar `/` para mostrar Home.
- Añadir `/login` y `/register`.
- Mantener `/home` como redirect a `/` durante transición.
- Mantener `/auth` como redirect a `/login`.
- Actualizar enlaces desde Home, Login, Registro, Forgot, Reset y Verify.
- Confirmar que `/verify`, `/forgot-password` y `/reset-password` siguen montadas aunque sus diseños no se cambien.

### Paso 6 — Limpiar después de migrar

- Buscar imports de `Home.tsx`, `AuthPage`, `useAuthActions`, `LoginForm`, `RegisterForm` y `specialtyApi`.
- Retirar sólo código reemplazado sin consumidores.
- No borrar utilidades de auth usadas por páginas fuera del alcance.

## Checklist de cierre

- Home, Login y Registro usan el diseño Stitch dividido en secciones/componentes con responsabilidad clara.
- Login y Registro tienen URL propia y funcionan al abrir/recargar directamente esa URL.
- Registro cliente/profesional envía el payload discriminado correcto.
- En registro profesional se cargan specialties activas del endpoint público.
- Se muestra éxito de registro y guía al usuario a revisar su correo.
- Login guarda tokens, consulta `/users/me` y navega según el rol devuelto.
- Login no revela si una cuenta existe y bloquea reenvío mientras está en curso.
- Menú responsive, formularios, labels, foco, errores y loading contemplan móvil/teclado.
- Verify/Forgot/Reset siguen alcanzables desde links válidos.
- Los contratos se mantuvieron: no se cambió backend ni se inventaron DTOs.
- Archivos viejos se borraron sólo tras revisar consumidores.
