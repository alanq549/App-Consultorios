import api from "./axios";

export const ReviewsApi = {
  create: async (data: {
    appointmentId: number;
    rating: number;
    comment?: string;
  }) => {
    const response = await api.post("/reviews", data);
    return response.data;
  },

  getProfessionalReviews: async (professionalId: number) => {
    const response = await api.get(`/reviews/professional/${professionalId}`);
    return response.data;
  },

  getByAppointment: async (appointmentId: number) => {
    const response = await api.get(`/reviews/appointment/${appointmentId}`);
    return response.data;
  },

  getByAppointments: async (appointmentIds: number[]) => {
  const res = await api.post("/reviews/batch/by-appointments", {
    appointmentIds,
  });
  return res.data;
}
};