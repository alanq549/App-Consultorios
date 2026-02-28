import { Dialog } from "@headlessui/react";
import { Fragment } from "react";
import ServiceForm from "../components/ServiceForm";
import type { ServiceFormDTO } from "../types";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: ServiceFormDTO) => void;
  initial?: ServiceFormDTO;
  editMode?: boolean;
}

export default function ModalServiceForm({
  isOpen,
  onClose,
  onSubmit,
  initial,
  editMode = false,
}: Props) {
  return (
    <Dialog open={isOpen} onClose={onClose} as={Fragment}>
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm ">
        <Dialog.Panel className="bg-white dark:bg-zinc-800 p-6 rounded-lg shadow-xl max-w-md w-full border border-neutral-200 dark:border-zinc-700">
          <Dialog.Title className="text-xl font-semibold text-neutral-800 dark:text-zinc-100 mb-6">
            {editMode ? "Editar Servicio" : "Crear Servicio"}
          </Dialog.Title>
          
          <ServiceForm
            editMode={editMode}
            initial={initial}
            onSubmit={(data) => {
              onSubmit(data);
              onClose();
            }}
          />
          
          <div className="mt-6 pt-4 border-t border-neutral-100 dark:border-zinc-700 flex justify-end ">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium rounded-md text-neutral-600 hover:text-neutral-900 dark:text-zinc-300 dark:hover:text-white hover:bg-neutral-100 dark:hover:bg-zinc-700 transition-colors"
            >
              Cancelar
            </button>
          </div>
        </Dialog.Panel>
      </div>
    </Dialog>
  );
}