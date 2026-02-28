import type { Appointment } from "@/features/appointments/types";
import { Calendar, Clock, DollarSign, MessageSquare } from "lucide-react";
import './AppointmentCard.css';

export default function AppointmentCard({ appointment }: { appointment: Appointment }) {
  const date = new Date(appointment.dateTimeLocal);
  // Formato más legible: "lunes, 12 de oct"
  const dateString = date.toLocaleDateString('es-ES', { weekday: 'short', day: 'numeric', month: 'short' });
  const timeString = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  const staticUrl = import.meta.env.VITE_STATIC_URL;

  const statusStyles = {
    COMPLETED: 'status-completed',
    PENDING: 'status-pending',
    CANCELLED: 'status-cancelled',
  }[appointment.status] || 'status-default';

  const paymentStyles = appointment.paymentStatus === 'PAID' ? 'payment-paid' : 'payment-pending';

  return (
    <div className="appointment-card group">
      <div className="card-inner">
        
        {/* Sección Izquierda: Avatar con indicador de estado móvil */}
        <div className="relative">
          <img
            src={`${staticUrl}${appointment.professional.avatar}`}
            alt={appointment.professional.name}
            className="appointment-avatar"
          />
          <div className={`status-dot-mobile ${statusStyles}`} />
        </div>

        {/* Sección Central: Contenido Principal */}
        <div className="flex-1 space-y-3">
          <div className="flex justify-between items-start">
            <div>
              <h3 className="professional-name">
                {appointment.professional.name} {appointment.professional.lastName}
              </h3>
              <p className="service-name">{appointment.service.name}</p>
            </div>
            
            <div className="flex flex-col items-end gap-2">
              <span className={`status-badge ${statusStyles}`}>
                {appointment.status.toLowerCase()}
              </span>
              <span className={`payment-badge ${paymentStyles}`}> Pago
                {appointment.paymentStatus === 'PAID' ? 'Pagado' : 'Pendiente'}
              </span>
            </div>
          </div>

          {/* Grid de Detalles con Iconos */}
          <div className="details-grid">
            <div className="detail-item">
              <Calendar size={14} className="text-teal-500" />
              <span>{dateString}</span>
            </div>
            <div className="detail-item">
              <Clock size={14} className="text-teal-500" />
              <span>{timeString} • {appointment.service.durationMinutes} min</span>
            </div>
            <div className="detail-item">
              <DollarSign size={14} className="text-teal-500" />
              <span className="font-bold text-gray-900 dark:text-white">
                {appointment.service.price}
              </span>
            </div>
          </div>

          {/* Notas con estilo de burbuja */}
          {appointment.notes && (
            <div className="notes-container">
              <MessageSquare size={12} className="mt-1 flex-shrink-0" />
              <p className="italic">{appointment.notes}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}