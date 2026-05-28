import { deleteRequest, getRequest, patchRequest, postRequest } from "@/shared/api/core/request";
import { httpClient } from "@/shared/api/core/httpClient";
import { apiEndpoints } from "@/shared/api/endpoints";
import {
  importResultSchema,
  cierreMesListResponseSchema,
  cierreMesCreateResponseSchema,
  cierreMesPayloadSchema,
  inicializarPeriodoPayloadSchema,
  recalcularStockPayloadSchema,
  recalcularStockResponseSchema,
  reiniciarStockPayloadSchema,
  saldoMensualDeleteResponseSchema,
  saldoMensualItemPatchPayloadSchema,
  saldoMensualItemUpsertPayloadSchema,
  saldoMensualListResponseSchema,
  saldoMensualPayloadSchema,
  saldoMensualQuerySchema,
  saldoMensualSingleResponseSchema,
  sincronizarStockPayloadSchema,
  stockInicialPayloadSchema,
  type ReiniciarStockPayload,
  type RecalcularStockPayload,
  type SaldoMensualItemPatchPayload,
  type SaldoMensualItemUpsertPayload,
  type SaldoMensualPayload,
  type SaldoMensualQuery,
  type SincronizarStockPayload,
  type StockInicialPayload,
  type CierreMesPayload,
  type InicializarPeriodoPayload
} from "@/features/inventario-import/model/inventarioImport.schema";

export async function importCatalogo(
  file: File,
  options?: {
    anio?: number;
    mes?: number;
  }
) {
  const formData = new FormData();
  formData.append("file", file);
  const params =
    options?.anio && options?.mes
      ? {
          anio: options.anio,
          mes: options.mes
        }
      : undefined;
  const response = await httpClient.post(apiEndpoints.inventarioImport.catalogo, formData, {
    headers: { "Content-Type": "multipart/form-data" },
    params
  });
  return importResultSchema.parse(response.data);
}

export async function importStockInicial(payload: StockInicialPayload) {
  return postRequest({
    url: apiEndpoints.inventarioImport.stockInicial,
    body: stockInicialPayloadSchema.parse(payload),
    schema: importResultSchema
  });
}

export async function importSaldoMensual(payload: SaldoMensualPayload) {
  return postRequest({
    url: apiEndpoints.inventarioImport.saldoMensual,
    body: saldoMensualPayloadSchema.parse(payload),
    schema: importResultSchema
  });
}

export async function getSaldoMensual(params: SaldoMensualQuery) {
  const parsed = saldoMensualQuerySchema.parse(params);
  return getRequest({
    url: apiEndpoints.inventarioImport.saldoMensual,
    config: { params: parsed },
    schema: saldoMensualListResponseSchema
  });
}

export async function reiniciarStock(payload: ReiniciarStockPayload) {
  return postRequest({
    url: apiEndpoints.inventarioImport.reiniciarStock,
    body: reiniciarStockPayloadSchema.parse(payload),
    schema: importResultSchema
  });
}

export async function sincronizarStock(payload?: SincronizarStockPayload) {
  return postRequest({
    url: apiEndpoints.inventarioImport.sincronizarStock,
    body: sincronizarStockPayloadSchema.parse(payload),
    schema: importResultSchema
  });
}

export async function recalcularStock(payload: RecalcularStockPayload) {
  return postRequest({
    url: apiEndpoints.inventarioImport.recalcularStock,
    body: recalcularStockPayloadSchema.parse(payload),
    schema: recalcularStockResponseSchema
  });
}

export async function upsertSaldoMensualItem(payload: SaldoMensualItemUpsertPayload) {
  return postRequest({
    url: apiEndpoints.inventarioImport.saldoMensualItem,
    body: saldoMensualItemUpsertPayloadSchema.parse(payload),
    schema: saldoMensualSingleResponseSchema
  });
}

export async function getSaldoMensualById(id: string | number) {
  return getRequest({
    url: apiEndpoints.inventarioImport.saldoMensualById(id),
    schema: saldoMensualSingleResponseSchema
  });
}

export async function updateSaldoMensualById(id: string | number, payload: SaldoMensualItemPatchPayload) {
  return patchRequest({
    url: apiEndpoints.inventarioImport.saldoMensualById(id),
    body: saldoMensualItemPatchPayloadSchema.parse(payload),
    schema: saldoMensualSingleResponseSchema
  });
}

export async function deleteSaldoMensualById(id: string | number) {
  return deleteRequest({
    url: apiEndpoints.inventarioImport.saldoMensualById(id),
    schema: saldoMensualDeleteResponseSchema
  });
}

export async function getCierresMes() {
  return getRequest({
    url: apiEndpoints.inventarioImport.cierreMes,
    schema: cierreMesListResponseSchema
  });
}

export async function createCierreMes(payload: CierreMesPayload) {
  return postRequest({
    url: apiEndpoints.inventarioImport.cierreMes,
    body: cierreMesPayloadSchema.parse(payload),
    schema: cierreMesCreateResponseSchema
  });
}

export async function inicializarPeriodoHistorico(payload: InicializarPeriodoPayload) {
  return postRequest({
    url: apiEndpoints.inventarioImport.saldoMensualInicializar,
    body: inicializarPeriodoPayloadSchema.parse(payload),
    schema: importResultSchema
  });
}
