// src/features/reviews/components/ReviewModal.tsx

import { Modal } from "@/components/ui/Modal";
import ReviewForm from "./ReviewForm";

interface Props {
  appointmentId: number;
  professionalName: string;
  onClose: () => void;
}

export default function ReviewModal({
  appointmentId,
  professionalName,
  onClose,
}: Props) {
  return (
    <Modal
      title={`Dejar reseña para ${professionalName}`}
      onClose={onClose}
    >
      <ReviewForm
        appointmentId={appointmentId}
        onSuccess={onClose}
        onCancel={onClose}
      />
    </Modal>
  );
}