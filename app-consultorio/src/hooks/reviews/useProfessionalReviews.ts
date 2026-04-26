import { useQuery } from "@tanstack/react-query";
import { ReviewsApi } from "@/api/reviews.api";
import type { Review } from "@/types/review.types";

export function useProfessionalReviews(professionalId: number) {
  return useQuery<Review[]>({
    queryKey: ["reviews", "professional", professionalId],
    queryFn: () => ReviewsApi.getProfessionalReviews(professionalId),
    enabled: !!professionalId,
  });
}