import { useQuery } from "@tanstack/react-query";
import { getBinCard, getBinCardValorado } from "@/features/reportes/api/reportesApi";
import type { ReportesQueryParams } from "@/features/reportes/model/reportes.schema";
import { queryKeys } from "@/shared/lib/queryKeys";

export function useBinCardQuery(
  params: ReportesQueryParams,
  fetchAll: boolean,
  enabled: boolean
) {
  return useQuery({
    queryKey: queryKeys.reportes.binCard(params, fetchAll),
    queryFn: () => getBinCard(params, fetchAll),
    enabled
  });
}

export function useBinCardValoradoQuery(
  params: ReportesQueryParams,
  fetchAll: boolean,
  enabled: boolean
) {
  return useQuery({
    queryKey: queryKeys.reportes.binCardValorado(params, fetchAll),
    queryFn: () => getBinCardValorado(params, fetchAll),
    enabled
  });
}
