/**
 * @files /modules/profiles/affiliations/application/ports/professional-profile-owner-checker.ts
 * @description Puerto para verificar y obtener la propiedad de un perfil profesional por usuario.
 */

export interface ProfessionalProfileOwnerChecker {
  /**
   * Obtiene el ID del perfil profesional perteneciente al usuario autenticado.
   * Retorna null si el usuario no tiene perfil profesional registrado.
   *
   * @param {number} userId - ID del usuario a consultar.
   * @returns {Promise<number | null>} ID del perfil profesional o null si no posee uno.
   */
  getProfileIdByUserId(userId: number): Promise<number | null>;
}