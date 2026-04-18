import api from "./axios";
export type ProfessionalStatus =
  | "PENDING"
  | "APPROVED"
  | "SUSPENDED"
  | "REJECTED";

export const AdminApi = {
  reviewProfessionalProfile: async (
    profileId: number,
    status: "APPROVED" | "REJECTED",
  ) => {
    const response = await api.patch(`/admin/profiles/${profileId}/review`, {
      status,
    });

    return response.data;
  },

  getAllProfiles: async () => {
    const response = await api.get("/admin/professionals");
    return response.data;
  },

  getPendingProfiles: async () => {
    const response = await api.get("/admin/profiles/pending");
    return response.data;
  },

  setProfileStatus: async (
    profileId: number,
    status: "APPROVED" | "SUSPENDED",
  ) => {
    const response = await api.patch(`/admin/profiles/${profileId}/status`, {
      status,
    });

    return response.data;
  },

  setSpecialtyStatus: async (
    professionalId: number,
    specialtyId: number,
    status: "APPROVED" | "REJECTED",
  ) => {
    const response = await api.patch(
      `/admin/${professionalId}/specialties/${specialtyId}/status`,
      { status },
    );

    return response.data;
  },
};
