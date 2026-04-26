import { useQuery } from "@tanstack/react-query";
import { ReviewsApi } from "@/api/reviews.api";
import type { Review } from "@/types/review.types";

export function useReviewsByAppointments(appointmentIds: number[]) {
  return useQuery<Review[]>({
    queryKey: ["reviews", "batch", appointmentIds],
    queryFn: () => ReviewsApi.getByAppointments(appointmentIds),
    enabled: appointmentIds.length > 0,
  });
}