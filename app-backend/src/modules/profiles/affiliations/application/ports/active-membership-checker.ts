/// ARCHIVO: src/modules/profiles/affiliations/application/ports/active-membership-checker.ts
/// 
/// Propósito: Definir la interfaz (contrato) para consultar la membresía activa y el rol de un usuario en un tenant.
/// 
/// ¿Qué es y para qué sirve?
/// Es un puerto de integración especializado entre el módulo de Afiliaciones y el módulo de Membresías/Tenancy.
/// Permite conocer no solo si un usuario tiene acceso activo a una sede o consultorio, sino también
/// su rol específico (OWNER o MEMBER), dato indispensable para resolver el nivel de autoridad en las transiciones.

/**
 * Resultado estructurado con la información de la membresía activa del usuario en un tenant.
 * 
 * Nota de desacoplamiento:
 * Este tipo es nativo del contrato de la aplicación de Afiliaciones y no depende
 * directamente de los enums o esquemas generados por la base de datos/Prisma.
 */
export type ActiveMembershipContext = {
  /** ID del usuario consultado */
  userId: number;
  /** ID de la sede o consultorio (Tenant) */
  tenantId: number;
  /** Rol asignado dentro del tenant (OWNER = Propietario/Administrador, MEMBER = Miembro regular) */
  role: "OWNER" | "MEMBER";
};

export interface ActiveMembershipChecker {
  /**
   * Obtiene y valida la membresía activa de un usuario dentro de un tenant específico.
   * 
   * @param userId - ID del usuario a consultar.
   * @param tenantId - ID de la sede o consultorio.
   * @returns Promesa con los datos de la membresía y su rol (`ActiveMembershipContext`),
   *          o `null` en los siguientes casos:
   *          - El usuario no tiene ningún registro de membresía en ese tenant.
   *          - La membresía existe pero se encuentra suspendida, vencida o inactiva.
   */
  getActiveMembership(
    userId: number,
    tenantId: number,
  ): Promise<ActiveMembershipContext | null>;

  /**
   * Obtiene la membresía activa y bloquea la fila para evitar revocaciones concurrentes.
   * Este método debe ejecutarse dentro de una transacción y utiliza `SELECT FOR UPDATE`
   * para garantizar que la membresía no sea modificada mientras la decisión está en curso.
   */

  lockActiveMembership(userId: number, tenantId: number): Promise<ActiveMembershipContext | null>;


}