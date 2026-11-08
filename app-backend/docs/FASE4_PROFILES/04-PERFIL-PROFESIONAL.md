# Misión 3 — Migrar perfil profesional

## Objetivo

Separar operaciones del perfil profesional del módulo `users` sin reimplementar el directorio ni el workflow de afiliación de Fase 3.

## Por qué

`ProfessionalProfileService` mezcla datos personales globales, directorio público, certificados, enlaces, especialidades y revisión. La mezcla de contenido global con revisión tenant-aware puede publicar una biografía equivocada.

## Archivos a crear/tocar

- Crear casos de uso/repositorios y DTOs en `src/modules/profiles/` para campos profesionales aprobados por Misión 0.
- Migrar la actualización de nombre, apellido y teléfono desde `professionalprofile.service.ts`.
- Conservar `professionalprofile.routes.ts` y su controller como fachada hasta comprobar compatibilidad.
- Adaptar `GET /api/professionals/:id` y `/Allprofiles` al caso de lectura/mappers Profiles; reusar afiliación activa y tenant resuelto existentes.
- Aplicar el cambio D2 intencional: eliminar `verificationStatus` del DTO público, filtrar perfiles globalmente `APPROVED` y con alguna specialty global aprobada, y mantener estado solo en la respuesta privada `/api/users/me`.
- Separar tipo público de tipos privados/admin: el DTO público no tiene estado; `/api/users/me` y `/api/admin/*` conservan el estado requerido por sus clientes autorizados.
- Actualizar contratos y consumidores del frontend: `src/types/professional.type.ts`, `src/features/Professional/ProfessionalProfile.tsx`, `src/features/Professional/components/ProfessionalCard.tsx`, `src/features/Client/components/booking/ProfessionalList.tsx` y `BookingModal.tsx`. En perfiles públicos, quitar uso del campo; retirar badge o derivarlo de la inclusión por el endpoint público ya filtrado. Revisar `src/types/auth.types.ts` y conservar allí el estado privado usado por `ProfessionalVerificationGuard`.
- Actualizar `app-backend/docs/BASELINE.md` y `BASELINE_CONTRACTS.md`; registrar que la retirada del campo es un cambio de privacidad intencional, no regresión accidental.
- Reusar `profiles/affiliations` para bio/enlaces por tenant; conectar edición a `submit-affiliation-content` si Misión 0 lo aprueba.
- Añadir tests en `tests/profiles/` y actualizar `tests/professionals/public-directory.http.test.ts`.

## Límites

- Perfil base, nombre/avatar y `User` son globales; bio/enlaces publicados pertenecen a la afiliación.
- Mantener `X-Tenant-ID`, afiliación/membership activas y 404 uniforme en lecturas públicas.
- No exponer teléfono, email, `verificationStatus` ni revisión pendiente en DTO público.
- No modificar reglas de `ProfessionalSpecialty`, Catalog o Services.

## Aceptación

- Endpoints mantienen paths y resto del shape; el retiro público de `verificationStatus` es el único breaking change intencional, aprobado por D2 y reflejado en baseline y frontend.
- Tenant A no obtiene contenido de una afiliación de tenant B.
- Edición pendiente no reemplaza el contenido aprobado.
- No hay una segunda implementación de directory/affiliation.
- DTOs públicos se construyen por mapper y evitan retornar modelos Prisma.
- Pruebas prueban que perfil no aprobado o sin specialty aprobada no aparece y que el JSON público no contiene `verificationStatus`; `/api/users/me` conserva el estado.
