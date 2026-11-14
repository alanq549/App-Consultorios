# Misión 8 — Administración y notificaciones

## Objetivo

Revisar panel administrativo y centro de notificaciones para alinearlos con el alcance real de operaciones globales y preferencias.

## Dependencias backend

Notifications Fase 8 está pendiente. El alcance de `admin` y de aislamiento tenant en superficies adyacentes no debe inferirse de los guards actuales.

## Trabajo

- inventariar acciones administrativas respaldadas por endpoints y permisos reales;
- distinguir Platform Operator global de OWNER/administrador de un tenant, cuando esa experiencia exista;
- alinear lista de notificaciones, marcado de lectura y estados de entrega con API;
- definir vacíos, errores y preferencias de canal sólo según capacidades backend;
- no mostrar datos de perfil privado en directorio ni cruzar datos de tenants.

## Criterios de cierre

- Cada pantalla admin mapea endpoint, rol y alcance de datos documentados.
- UI no trata un guard de ruta como autorización de backend.
- Notificaciones no prometen entrega/reintento que el backend no garantice.
