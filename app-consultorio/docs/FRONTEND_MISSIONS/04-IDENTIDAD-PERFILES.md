# Misión 3 — Identidad y perfiles

## Objetivo

Consolidar autenticación, sesión y edición de perfiles con los contratos vigentes de Identity y Profiles.

## Dependencias

Backend Fases 2 y 4 están cerradas. El registro continúa con comportamiento legacy y su extracción/onboarding es un hito futuro; no asumir un contrato nuevo sin coordinación.

## Trabajo

- unificar vistas de login, registro, verificación, recuperación y guards según los flujos reales;
- separar `me` privado de los tipos de perfil público y administrativo;
- alinear perfil cliente, profesional, avatar, enlaces y certificados con `/api/users/me` y los endpoints de Profiles;
- conservar `verificationStatus` sólo en la superficie privada/admin que lo autoriza; nunca tiparlo como campo de respuesta del directorio público;
- mostrar con claridad estados de revisión/afiliación sin inferir que uno sustituye al otro;
- retirar duplicación de UI/API gradualmente después de verificar todos los consumidores.

## Criterios de cierre

- No hay una única respuesta de backend forzada a satisfacer perfil público, privado y admin.
- Sesión, rutas protegidas y expiración coherentes con Identity actual.
- Cambios de perfil muestran éxito/error y no sobreescriben campos privados.
- Certificados usan descarga autenticada existente, no una URL estática asumida.
