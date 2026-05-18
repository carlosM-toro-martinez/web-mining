import { useQuery } from "@tanstack/react-query";
import {
  getBinCard,
  getBinCardValorado,
  getComprasReport,
  getStockReport,
  getValesReport
} from "@/features/reportes/api/reportesApi";
import type {
  ComprasReportQueryParams,
  ReportesQueryParams,
  StockReportQueryParams,
  ValesReportQueryParams
} from "@/features/reportes/model/reportes.schema";
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

export function useStockReportQuery(params: StockReportQueryParams, enabled: boolean) {
  return useQuery({
    queryKey: queryKeys.reportes.stock(params, false),
    queryFn: () => getStockReport(params),
    enabled
  });
}

export function useValesReportQuery(params: ValesReportQueryParams, enabled: boolean) {
  return useQuery({
    queryKey: queryKeys.reportes.vales(params, false),
    queryFn: () => getValesReport(params),
    enabled
  });
}

export function useComprasReportQuery(params: ComprasReportQueryParams, enabled: boolean) {
  return useQuery({
    queryKey: queryKeys.reportes.compras(params, false),
    queryFn: () => getComprasReport(params),
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
