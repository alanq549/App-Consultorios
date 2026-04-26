import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ReviewsApi } from "@/api/reviews.api";

export function useCreateReview() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ReviewsApi.create,

    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["reviews"] });
      queryClient.invalidateQueries({ queryKey: ["appointments"] });
    },
  });
}