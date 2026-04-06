import { useState } from "react";
import { ProfessionalSelector } from "../components/booking/ProfessionalSelector";

const ClientBookingPage = () => {
  const [professionalId, setProfessionalId] = useState<number | undefined>();

  return (
    <div >
      <div className="max-w-4xl mx-auto">
        {/* PAGE HEADER */}
        <div className="mb-8">
          <h1 className="text-3xl font-semibold text-gray-900 dark:text-gray-100">
            Agendar una cita
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Elige un profesional y reserva tu espacio en minutos
          </p>
        </div>

        <ProfessionalSelector value={professionalId} onChange={setProfessionalId} />
      </div>
    </div>
  );
};

export default ClientBookingPage;