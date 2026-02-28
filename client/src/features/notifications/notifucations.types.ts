export interface Notification {
  id: number;
  title: string;
  message?: string;
  isRead: boolean;
  createdAt: string;
  // otros campos si tienes
}