import { Star } from "lucide-react";

type Props = {
  rating?: number;
  size?: number;
  showValue?: boolean;
  count?: number;
};

export function RatingStars({
  rating = 0,
  size = 14,
  showValue = false,
  count,
}: Props) {
  const stars = Math.round(rating);

  return (
 <div className="flex flex-col items-center gap-1">
  <div className="flex items-center gap-1">
    {Array.from({ length: 5 }, (_, i) => (
      <Star
        key={i}
        size={size}
        fill={i < stars ? "currentColor" : "none"}
        className={i < stars ? "text-amber-400" : "text-gray-600 dark:text-gray-300"}
      />
    ))}
  </div>

  {showValue && (
    <span className="text-xs font-semibold text-gray-800 dark:text-gray-300">
      {rating.toFixed(1)}
      {count !== undefined && ` (${count})`}
    </span>
  )}
</div>
  );
}