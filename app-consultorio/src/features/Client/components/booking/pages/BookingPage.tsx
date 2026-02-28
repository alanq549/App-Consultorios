import { useState } from "react";
import { ProfessionalList } from "../ProfessionalList";
import { BookingModal } from "../BookingModal";

export default function BookingPage() {
type Professional = {
  id: number
  name: string
  lastName: string
  avatar?: string
  isVerified: boolean
  specialty?: {
    id: number
    name: string
  }
}

const [selectedProfessional, setSelectedProfessional] =
  useState<Professional | null>(null)

  return (
    <div>

      <ProfessionalList
        onSelect={(id) => {
          setSelectedProfessional(id);
        }}
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
}
