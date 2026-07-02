import { getRequest } from "@/shared/api/core/request";
import { apiEndpoints } from "@/shared/api/endpoints";
import {
  anulacionesEntradasReportResponseSchema,
  anulacionesSalidasReportResponseSchema,
  binCardResponseSchema,
  binCardValoradoResponseSchema,
  balanceMensualReportResponseSchema,
  comprasProveedorReportResponseSchema,
  comprasReportQueryParamsSchema,
  comprasReportResponseSchema,
  entradasAlmacenReportResponseSchema,
  inventarioAlmacenReportResponseSchema,
  monthlyRangeReportQueryParamsSchema,
  stockReportQueryParamsSchema,
  stockReportResponseSchema,
  valesReportQueryParamsSchema,
  valesReportResponseSchema,
  reportesQueryParamsSchema,
  salidasAlmacenReportResponseSchema,
  type ReportesQueryParams,
  type ComprasReportQueryParams,
  type MonthlyRangeReportQueryParams,
  type StockReportQueryParams,
  type ValesReportQueryParams
} from "@/features/reportes/model/reportes.schema";

function cleanParams(params: ReportesQueryParams) {
  const parsed = reportesQueryParamsSchema.parse(params);
  return Object.fromEntries(
    Object.entries(parsed).filter(([, value]) => value !== undefined && value !== "")
  );
}

function cleanSimpleParams<T extends object>(params: T, parse: (payload: T) => T) {
  const parsed = parse(params);
  return Object.fromEntries(
    Object.entries(parsed).filter(([, value]) => value !== undefined && value !== "")
  );
}

async function getBinCardPage(params: ReportesQueryParams) {
  return getRequest({
    url: apiEndpoints.reportes.binCard,
    config: { params: cleanParams(params) },
    schema: binCardResponseSchema
  });
}

async function getBinCardValoradoPage(
  params: ReportesQueryParams
) {
  return getRequest({
    url: apiEndpoints.reportes.binCardValorado,
    config: { params: cleanParams(params) },
    schema: binCardValoradoResponseSchema
  });
}

export async function getBinCard(params: ReportesQueryParams, fetchAll: boolean) {
  if (!fetchAll) return getBinCardPage(params);
  return getBinCardPage({ ...params, sinPaginar: true });
}

export async function getBinCardValorado(params: ReportesQueryParams, fetchAll: boolean) {
  if (!fetchAll) return getBinCardValoradoPage(params);
  return getBinCardValoradoPage({ ...params, sinPaginar: true });
}

export async function getStockReport(params: StockReportQueryParams) {
  return getRequest({
    url: apiEndpoints.reportes.stock,
    config: { params: cleanSimpleParams(params, stockReportQueryParamsSchema.parse) },
    schema: stockReportResponseSchema
  });
}

export async function getValesReport(params: ValesReportQueryParams) {
  return getRequest({
    url: apiEndpoints.reportes.vales,
    config: { params: cleanSimpleParams(params, valesReportQueryParamsSchema.parse) },
    schema: valesReportResponseSchema
  });
}

export async function getComprasReport(params: ComprasReportQueryParams) {
  return getRequest({
    url: apiEndpoints.reportes.comprasDetalle,
    config: { params: cleanSimpleParams(params, comprasReportQueryParamsSchema.parse) },
    schema: comprasReportResponseSchema
  });
}

export async function getComprasProveedorReport(params: ComprasReportQueryParams) {
  return getRequest({
    url: apiEndpoints.reportes.comprasProveedor,
    config: { params: cleanSimpleParams(params, comprasReportQueryParamsSchema.parse) },
    schema: comprasProveedorReportResponseSchema
  });
}

export async function getBalanceMensualReport(params: MonthlyRangeReportQueryParams) {
  return getRequest({
    url: apiEndpoints.reportes.balanceMensual,
    config: { params: cleanSimpleParams(params, monthlyRangeReportQueryParamsSchema.parse) },
    schema: balanceMensualReportResponseSchema
  });
}

export async function getInventarioAlmacenReport(params: MonthlyRangeReportQueryParams) {
  return getRequest({
    url: apiEndpoints.reportes.inventarioAlmacen,
    config: { params: cleanSimpleParams(params, monthlyRangeReportQueryParamsSchema.parse) },
    schema: inventarioAlmacenReportResponseSchema
  });
}

export async function getEntradasAlmacenReport(params: MonthlyRangeReportQueryParams) {
  return getRequest({
    url: apiEndpoints.reportes.entradasAlmacen,
    config: { params: cleanSimpleParams(params, monthlyRangeReportQueryParamsSchema.parse) },
    schema: entradasAlmacenReportResponseSchema
  });
}

export async function getSalidasAlmacenReport(params: MonthlyRangeReportQueryParams) {
  return getRequest({
    url: apiEndpoints.reportes.salidasAlmacen,
    config: { params: cleanSimpleParams(params, monthlyRangeReportQueryParamsSchema.parse) },
    schema: salidasAlmacenReportResponseSchema
  });
}

export async function getAnulacionesEntradasReport(params: MonthlyRangeReportQueryParams) {
  return getRequest({
    url: apiEndpoints.reportes.anulacionesEntradas,
    config: { params: cleanSimpleParams(params, monthlyRangeReportQueryParamsSchema.parse) },
    schema: anulacionesEntradasReportResponseSchema
  });
}

export async function getAnulacionesSalidasReport(params: MonthlyRangeReportQueryParams) {
  return getRequest({
    url: apiEndpoints.reportes.anulacionesSalidas,
    config: { params: cleanSimpleParams(params, monthlyRangeReportQueryParamsSchema.parse) },
    schema: anulacionesSalidasReportResponseSchema
  });
}
