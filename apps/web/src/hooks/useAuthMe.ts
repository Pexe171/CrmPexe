import { useQuery } from "@tanstack/react-query";
import { authApi } from "@/lib/api/auth";

function getHasToken(): boolean {
  if (typeof window === "undefined") return false;
  return !!localStorage.getItem("crm_token");
}

export function useAuthMe(enabled = true) {
  const hasToken = getHasToken();
  const query = useQuery({
    queryKey: ["auth", "me"],
    queryFn: authApi.me,
    enabled: enabled && hasToken,
    retry: false,
    refetchOnWindowFocus: false,
    staleTime: 60 * 1000
  });
  return { ...query, hasToken };
}
