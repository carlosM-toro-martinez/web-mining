import { useQuery } from "@tanstack/react-query";
import { getKardexValoradoReport } from "@/features/kardex-valorado/api/kardexValoradoApi";
import { queryKeys } from "@/shared/lib/queryKeys";

export function useKardexValoradoQuery() {
  return useQuery({
    queryKey: queryKeys.kardexValorado.detail(),
    queryFn: getKardexValoradoReport
  });
}
