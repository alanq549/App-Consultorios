import api from "./axios";

export const getProfessionalProfile = async (id: number) => {
  const { data } = await api.get(`/professionals/${id}`);
  return data;
};

export const getProfessionalProfilesAll = async () => {
  const { data } = await api.get('/professionals/Allprofiles');
  return data;
}
