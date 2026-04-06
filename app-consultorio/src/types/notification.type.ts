export type NotificationType =
  | "WELCOME"
  | "APPOINTMENT_CREATED"
  | "APPOINTMENT_CONFIRMED"
  | "APPOINTMENT_CANCELLED"
  | "APPOINTMENT_COMPLETED"
  | "APPOINTMENT_STATUS_CHANGED"
  | "REVIEW_REQUEST";

export interface Notification {
  id: number;
  userId: number;
  appointmentId?: number;
  type: NotificationType;
  title: string;
  message: string;
  isRead: boolean;
  createdAt: string;
}