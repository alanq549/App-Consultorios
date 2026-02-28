type Props = {
  clientName: string;
  specialtyName: string;
  professionalName: string;
  selectedSchedule: string;
  onConfirm: () => void;
};

export default function StepConfirmAppointment({
  clientName,
  specialtyName,
  professionalName,
  selectedSchedule,
  onConfirm,
}: Props) {
  return (
    <div className="max-w-md mx-auto mt-8 bg-white dark:bg-zinc-800 p-6 rounded-xl shadow-lg border border-gray-200 dark:border-zinc-700">
      <h2 className="text-2xl font-semibold mb-6 text-gray-900 dark:text-gray-100">
        Confirmar Cita
      </h2>

      <ul className="space-y-4 text-gray-700 dark:text-gray-300">
        <li>
          <span className="font-medium text-gray-900 dark:text-gray-100">Cliente: </span>
          {clientName}
        </li>
        <li>
          <span className="font-medium text-gray-900 dark:text-gray-100">Especialidad: </span>
          {specialtyName}
        </li>
        <li>
          <span className="font-medium text-gray-900 dark:text-gray-100">Profesional: </span>
          {professionalName}
        </li>
        <li>
          <span className="font-medium text-gray-900 dark:text-gray-100">Horario: </span>
          {selectedSchedule}
        </li>
      </ul>

      <button
        onClick={onConfirm}
        className="mt-8 w-full bg-teal-600 hover:bg-teal-700 text-white font-semibold py-3 rounded-lg shadow-md transition-colors focus:outline-none focus:ring-2 focus:ring-teal-400 focus:ring-offset-2"
        aria-label="Confirmar cita"
      >
        Confirmar Cita
      </button>
    </div>
  );
}
