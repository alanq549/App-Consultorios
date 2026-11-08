# Misión 6 — Resolver superficies adyacentes de Profiles

## Objetivo

Aplicar las decisiones de Misión 0 a AdminProfile, certificados, enlaces sociales y relación con specialties; no expandir accidentalmente la fase.

## Por qué

El código mezcla esos recursos dentro de `ProfessionalProfileService`. Fase 3 ya asignó a afiliación el contenido público revisado; ownership de certificados y de `ProfessionalSpecialty` necesita definición explícita.

## Archivos a revisar/tocar

- `src/modules/users/adminprofile/adminprofile.service.ts`: migrar operaciones soportadas de AdminProfile a Profiles; no habilitar permisos tenant.
- `src/modules/users/professionalprofile/professionalprofile.service.ts` y `.routes.ts`: clasificar endpoints de certificados/social links.
- `src/modules/profiles/affiliations/`: reusar contenido revisado y contratos; no duplicar revisión.
- `src/modules/specialty/ProfessionalSpecialty/`: no transferir su ownership en esta misión; documentar contrato de coordinación y Fase 5 debe invocar Profiles al revocar la última specialty aprobada.
- `src/app.ts`: retirar `express.static("public/certificates")` o reemplazar por ruta de descarga autenticada con ownership verificado.
- `prisma/schema.prisma` y migraciones: solo si decisión aprobada exige cambio y existe plan de datos reversible.
- Añadir pruebas de privacidad/ownership para cada endpoint que permanezca dentro de alcance, incluyendo entrega de certificado.

## Decisiones de ejecución

- Certificados y metadata no se publican. Cerrar acceso anónimo al static path `/certificates`; conservar entrega solo mediante descarga autenticada que verifique al propietario, o eliminar por completo la lectura si no es requisito.
- Pruebas HTTP: URL directa anterior anónima devuelve 404/401/403; propietario autenticado puede leer el archivo por mecanismo autorizado; otro usuario recibe 404/403. No dejar bypass estático.
- No usar `SocialLink` global para sobrescribir links aprobados por afiliación.
- ADMIN_PROFILE sigue siendo perfil global; el rol ADMIN no autoriza acciones tenant.
- Toda superficie aplazada se lista con fase propietaria y estado, no se deja en código ambiguo.

## Aceptación

- Cada endpoint listado tiene owner de dominio y clasificación in/out.
- Ninguna operación cross-tenant usa sólo `profileId` o rol global como autorización.
- No existe acceso público/estático al directorio de certificados; tests cubren anónimo, propietario y usuario distinto.
- Specialty se difiere a Catalog cuando corresponda; no se cambia semántica durante esta misión.
- El contrato de Profiles para última specialty está documentado, y la aceptación final del escenario se enlaza con test de Catalog/Fase 5.
- Toda migración requerida tiene revisión de datos, rollback y pruebas antes de aplicarse.
