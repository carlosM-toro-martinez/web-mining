import { useQuery } from "@tanstack/react-query";
import {
  getBalanceMensualReport,
  getBinCard,
  getBinCardValorado,
  getComprasProveedorReport,
  getComprasReport,
  getEntradasAlmacenReport,
  getInventarioAlmacenReport,
  getSalidasAlmacenReport,
  getStockReport,
  getValesReport
} from "@/features/reportes/api/reportesApi";
import type {
  ComprasReportQueryParams,
  MonthlyRangeReportQueryParams,
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
    queryKey: queryKeys.reportes.comprasDetalle(params),
    queryFn: () => getComprasReport(params),
    enabled,
    refetchOnMount: "always"
  });
}

export function useComprasProveedorReportQuery(
  params: ComprasReportQueryParams,
  enabled: boolean
) {
  return useQuery({
    queryKey: queryKeys.reportes.comprasProveedor(params),
    queryFn: () => getComprasProveedorReport(params),
    enabled,
    refetchOnMount: "always"
  });
}

export function useBalanceMensualReportQuery(
  params: MonthlyRangeReportQueryParams,
  enabled: boolean
) {
  return useQuery({
    queryKey: [...queryKeys.reportes.all, "balance-mensual", params] as const,
    queryFn: () => getBalanceMensualReport(params),
    enabled
  });
}

export function useInventarioAlmacenReportQuery(
  params: MonthlyRangeReportQueryParams,
  enabled: boolean
) {
  return useQuery({
    queryKey: [...queryKeys.reportes.all, "inventario-almacen", params] as const,
    queryFn: () => getInventarioAlmacenReport(params),
    enabled
  });
}

export function useEntradasAlmacenReportQuery(
  params: MonthlyRangeReportQueryParams,
  enabled: boolean
) {
  return useQuery({
    queryKey: [...queryKeys.reportes.all, "entradas-almacen", params] as const,
    queryFn: () => getEntradasAlmacenReport(params),
    enabled
  });
}

export function useSalidasAlmacenReportQuery(
  params: MonthlyRangeReportQueryParams,
  enabled: boolean
) {
  return useQuery({
    queryKey: [...queryKeys.reportes.all, "salidas-almacen", params] as const,
    queryFn: () => getSalidasAlmacenReport(params),
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
