export interface Review {
  id: number;
  appointmentId: number;
  rating: number;
  comment?: string;
  createdAt: string;

  client: {
    name: string;
    lastName?: string;
  };
}