// src/features/reviews/components/ReviewForm.tsx
// src/features/reviews/components/ReviewForm.tsx

import { useState } from "react";
import { useCreateReview } from "@/hooks/reviews/useCreateReview";

interface Props {
  appointmentId: number;
  onSuccess: () => void;
  onCancel: () => void;
}

export default function ReviewForm({
  appointmentId,
  onSuccess,
  onCancel,
}: Props) {
  const { mutate, isPending } = useCreateReview();

  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");

  const handleSubmit = () => {
    mutate(
      {
        appointmentId,
        rating,
        comment,
      },
      {
        onSuccess,
      },
    );
  };

  return (
    <div className="space-y-4">
      
      {/* rating */}
      <div>
        <label className="text-sm font-medium">Calificación</label>
        <select
          className="w-full border rounded-lg p-2"
          value={rating}
          onChange={(e) => setRating(Number(e.target.value))}
        >
          {[5, 4, 3, 2, 1].map((v) => (
            <option key={v} value={v}>
              {v} ⭐
            </option>
          ))}
        </select>
      </div>

      {/* comentario */}
      <div>
        <label className="text-sm font-medium">Comentario</label>
        <textarea
          className="w-full border rounded-lg p-2"
          rows={3}
          value={comment}
          onChange={(e) => setComment(e.target.value)}
        />
      </div>

      {/* botones */}
      <div className="flex justify-end gap-2">
        <button
          className="px-4 py-2 border rounded-lg"
          onClick={onCancel}
        >
          Cancelar
        </button>

        <button
          className="px-4 py-2 bg-primary text-white rounded-lg"
          disabled={isPending}
          onClick={handleSubmit}
        >
          Enviar
        </button>
      </div>

    </div>
  );
}