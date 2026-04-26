// src/features/reviews/components/ReviewStars.tsx

import { Star } from "lucide-react";

interface Props {
  value: number;
  onChange: (value: number) => void;
}

export default function ReviewStars({ value, onChange }: Props) {
  return (
    <div className="flex gap-1">
      {Array.from({ length: 5 }, (_, i) => {
        const starValue = i + 1;

        return (
          <button
            type="button"
            key={i}
            onClick={() => onChange(starValue)}
          >
            <Star
              size={22}
              className={
                starValue <= value
                  ? "text-amber-400 fill-amber-400"
                  : "text-gray-400"
              }
            />
          </button>
        );
      })}
    </div>
  );
}