import { useQuery } from "@tanstack/react-query";
import { authApi } from "@/lib/api/auth";

export function useAuthMe(enabled = true) {
  return useQuery({
    queryKey: ["auth", "me"],
    queryFn: authApi.me,
    enabled,
    retry: false
  });
}
