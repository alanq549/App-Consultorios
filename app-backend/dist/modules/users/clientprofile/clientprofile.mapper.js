"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ClientProfileMapper = void 0;
class ClientProfileMapper {
    static toResponse(profile) {
        return {
            id: profile.id,
            name: profile.name,
            lastName: profile.lastName,
            phone: profile.phone,
            avatar: profile.avatar,
            appointmentsCount: profile._count?.appointments ?? 0
        };
    }
}
exports.ClientProfileMapper = ClientProfileMapper;
