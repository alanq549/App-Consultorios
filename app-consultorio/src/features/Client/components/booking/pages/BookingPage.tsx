// BookingPage.tsx
import { useState, memo } from "react";
import { ProfessionalList } from "../ProfessionalList";
import { BookingModal } from "../BookingModal";
import type { Professional } from "@/types/professional.type";

const BookingPage = memo(function BookingPage() {
  const [selectedProfessional, setSelectedProfessional] =
    useState<Professional | null>(null);

  return (
    <div>
      <ProfessionalList
        selectedId={selectedProfessional?.id ?? null}
        onSelect={setSelectedProfessional}
      />
      {selectedProfessional && (
        <BookingModal
          key={selectedProfessional.id}
          professional={selectedProfessional}
          onClose={() => setSelectedProfessional(null)}
        />
      )}
    </div>
  );
});

export default BookingPage;