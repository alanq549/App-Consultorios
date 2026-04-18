// src/api/professional.api.ts
import api from "./axios";
export const professionalApi = {
  getProfessionalProfile: async (id: number) => {
    const { data } = await api.get(`/professionals/${id}`);
    return data;
  },

  getProfessionalProfilesAll: async () => {
    const { data } = await api.get("/professionals/Allprofiles");
    return data;
  },

  // ---------- SPECIALTIES ----------

  requestSpecialty: async (specialtyId: number) => {
    const { data } = await api.post(
      `/professionals/specialties/${specialtyId}`,
    );
    return data;
  },

  // --- Social Links ---
  createSocialLink: async (data: { type: string; url: string }) => {
    const { data: response } = await api.post(
      "professionals/social-links",
      data,
    );
    return response;
  },

  updateSocialLink: async (
    id: number,
    data: { type?: string; url?: string },
  ) => {
    const { data: response } = await api.patch(
      `professionals/social-links/${id}`,
      data,
    );
    return response;
  },

  deleteSocialLink: async (id: number) => {
    const { data: response } = await api.delete(
      `professionals/social-links/${id}`,
    );
    return response;
  },

  // --- Certificates ---

  uploadCertificate: async (
    file: File,
    name: string,
    issuedBy: string,
    issuedDate: string,
  ) => {
    const formData = new FormData();

    formData.append("file", file);
    formData.append("name", name);
    formData.append("issuedBy", issuedBy);
    formData.append("issuedDate", issuedDate);

    const { data: response } = await api.post(
      "professionals/certificates",
      formData,
      {
        headers: { "Content-Type": "multipart/form-data" },
      },
    );

    return response;
  },

  deleteCertificate: async (id: number) => {
    const { data: response } = await api.delete(
      `professionals/certificates/${id}`,
    );
    return response;
  },
};
