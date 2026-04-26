import { useQuery } from "@tanstack/react-query";
import { ReviewsApi } from "@/api/reviews.api";
import type { Review } from "@/types/review.types";

export function useReviewByAppointment(appointmentId: number) {
  return useQuery<Review[]>({
    queryKey: ["reviews", "appointment", appointmentId],
    queryFn: () => ReviewsApi.getByAppointment(appointmentId),
    enabled: !!appointmentId,
  });
}