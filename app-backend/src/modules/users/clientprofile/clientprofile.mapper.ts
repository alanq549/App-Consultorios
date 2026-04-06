import { ClientProfileResponseDTO } from "./clientprofile.dto"

export class ClientProfileMapper {

  static toResponse(profile: any): ClientProfileResponseDTO {

    return {
      id: profile.id,
      name: profile.name,
      lastName: profile.lastName,
      phone: profile.phone,
      avatar: profile.avatar,
      appointmentsCount: profile._count?.appointments ?? 0
    }

  }

}