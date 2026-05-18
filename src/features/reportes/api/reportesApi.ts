import { getRequest } from "@/shared/api/core/request";
import { apiEndpoints } from "@/shared/api/endpoints";
import {
  binCardResponseSchema,
  binCardValoradoResponseSchema,
  comprasReportQueryParamsSchema,
  comprasReportResponseSchema,
  stockReportQueryParamsSchema,
  stockReportResponseSchema,
  valesReportQueryParamsSchema,
  valesReportResponseSchema,
  type BinCardItem,
  type BinCardResponse,
  type BinCardValoradoItem,
  type BinCardValoradoResponse,
  reportesQueryParamsSchema,
  type ReportesQueryParams
  ,
  type ComprasReportQueryParams,
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

async function getBinCardPage(params: ReportesQueryParams): Promise<BinCardResponse> {
  return getRequest({
    url: apiEndpoints.reportes.binCard,
    config: { params: cleanParams(params) },
    schema: binCardResponseSchema
  });
}

async function getBinCardValoradoPage(
  params: ReportesQueryParams
): Promise<BinCardValoradoResponse> {
  return getRequest({
    url: apiEndpoints.reportes.binCardValorado,
    config: { params: cleanParams(params) },
    schema: binCardValoradoResponseSchema
  });
}

async function fetchAllPages<TItem>(
  initialParams: ReportesQueryParams,
  fetchPage: (params: ReportesQueryParams) => Promise<{ items: TItem[]; meta: BinCardResponse["meta"] }>
) {
  const first = await fetchPage({ ...initialParams, page: 1 });
  if (first.meta.totalPages <= 1) return first;

  const pending: Promise<{ items: TItem[]; meta: BinCardResponse["meta"] }>[] = [];
  for (let page = 2; page <= first.meta.totalPages; page += 1) {
    pending.push(fetchPage({ ...initialParams, page }));
  }
  const rest = await Promise.all(pending);
  const items = [first.items, ...rest.map((chunk) => chunk.items)].flat();
  return {
    items,
    meta: {
      page: 1,
      limit: items.length || first.meta.limit,
      total: items.length,
      totalPages: 1
    }
  };
}

export async function getBinCard(params: ReportesQueryParams, fetchAll: boolean) {
  if (!fetchAll) return getBinCardPage(params);
  return fetchAllPages<BinCardItem>(params, getBinCardPage);
}

export async function getBinCardValorado(params: ReportesQueryParams, fetchAll: boolean) {
  if (!fetchAll) return getBinCardValoradoPage(params);
  return fetchAllPages<BinCardValoradoItem>(params, getBinCardValoradoPage);
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
    url: apiEndpoints.reportes.compras,
    config: { params: cleanSimpleParams(params, comprasReportQueryParamsSchema.parse) },
    schema: comprasReportResponseSchema
  });
}
