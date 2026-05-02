export interface Review {
  id: number;
  appointmentId: number;
  rating: number;
  comment?: string;
  createdAt: string;

 appointment: {
  clientProfile: {
    name: string;
  };
};
}