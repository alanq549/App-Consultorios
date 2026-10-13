/// ARCHIVO: src/modules/tenancy/http/tenancy.dto.ts
/// Constantes y funciones de validación HTTP relativas a la identificación del tenant.
///
/// Propósito: Definir la clave del encabezado HTTP para la selección de tenant
/// y proveer funciones utilitarias para parsing y validación estricta del ID.

/// Nombre del encabezado HTTP utilizado para enviar el ID del tenant en cada petición.
export const TENANT_SELECTOR_HEADER = "X-Tenant-ID";

/// Mensaje de error descriptivo retornado cuando el encabezado falta o no es válido.
export const INVALID_TENANT_SELECTOR_MESSAGE =
    "Tenant selector header 'X-Tenant-ID' is required and must be a valid positive integer.";


// Validación adicional para asegurar que el número no exceda el máximo entero de PostgreSQL (2,147,483,647).
const POSTGRES_INT_MAX = 2_147_483_647;
/**
 * Convierte y valida el valor de la cabecera HTTP a un entero positivo seguro.
 * 
 * @param value Valor recibido en el encabezado HTTP (string o undefined).
 * @returns El ID numérico del tenant o `null` si el valor es inválido o no seguro.
 */
export function parseTenantId(value: string | undefined): number | null {
    // Retorna null si el valor no existe o no coincide con la expresión regular para enteros positivos (> 0).
    if (!value || !/^[1-9]\d*$/.test(value)) {
        return null;
    }

    const tenantId = Number(value);

    // Validación de seguridad: el ID debe ser un entero seguro y positivo dentro del rango permitido.
    if (
        !Number.isSafeInteger(tenantId) || // Verifica que sea un entero seguro
        tenantId <= 0 ||  // Verifica que sea positivo
        tenantId > POSTGRES_INT_MAX // Verifica que no exceda el máximo entero de PostgreSQL
    ) {
        return null;
    }

    return tenantId;
}