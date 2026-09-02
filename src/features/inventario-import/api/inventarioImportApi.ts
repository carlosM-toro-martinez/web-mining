import { deleteRequest, getRequest, patchRequest, postRequest } from "@/shared/api/core/request";
import { httpClient } from "@/shared/api/core/httpClient";
import { ApiError } from "@/shared/api/core/apiError";
import { apiEndpoints } from "@/shared/api/endpoints";
import {
  importResultSchema,
  ajustarPreciosSinIvaPayloadSchema,
  ajustarPreciosSinIvaResponseSchema,
  cierreMesListResponseSchema,
  cierreMesCreateResponseSchema,
  cierreMesDeleteResponseSchema,
  ajusteProductosMesPayloadSchema,
  ajusteProductosMesResponseSchema,
  cierreMesPayloadSchema,
  inicializarPeriodoPayloadSchema,
  recalcularStockPayloadSchema,
  recalcularStockResponseSchema,
  diagnosticoPreciosResponseSchema,
  diagnosticoSaldosResponseSchema,
  backfillCppPayloadSchema,
  backfillCppResponseSchema,
  reiniciarStockPayloadSchema,
  saldoMensualAjusteTotalPayloadSchema,
  saldoMensualAjusteInicialExcelResponseSchema,
  saldoMensualAjusteTotalResponseSchema,
  saldoMensualDeleteResponseSchema,
  saldoMensualItemPatchPayloadSchema,
  saldoMensualItemUpsertPayloadSchema,
  saldoMensualListResponseSchema,
  saldoMensualPayloadSchema,
  saldoMensualPreviewResponseSchema,
  saldoMensualQuerySchema,
  saldoMensualSingleResponseSchema,
  sincronizarStockPayloadSchema,
  stockInicialPayloadSchema,
  limpiarMesPayloadSchema,
  limpiarMesPreviewResponseSchema,
  limpiarMesResultResponseSchema,
  type ReiniciarStockPayload,
  type RecalcularStockPayload,
  type AjustarPreciosSinIvaPayload,
  type BackfillCppPayload,
  type SaldoMensualItemPatchPayload,
  type SaldoMensualItemUpsertPayload,
  type SaldoMensualAjusteTotalPayload,
  type AjusteProductosMesPayload,
  type SaldoMensualPayload,
  type SaldoMensualQuery,
  type SincronizarStockPayload,
  type StockInicialPayload,
  type CierreMesPayload,
  type InicializarPeriodoPayload,
  type LimpiarMesPayload,
  type FixRedondeoPayload,
  diagnosticoRedondeoResponseSchema,
  fixRedondeoPayloadSchema,
  fixRedondeoResponseSchema
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

export async function getSaldoMensualPreview(params: SaldoMensualQuery) {
  const parsed = saldoMensualQuerySchema.parse(params);
  const result = await getRequest({
    url: apiEndpoints.inventarioImport.saldoMensualPreview,
    config: { params: parsed },
    schema: saldoMensualPreviewResponseSchema
  });
  return result.data;
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

export async function ajustarSaldoMensualTotal(payload: {
  productoId?: number;
  productoCodigo?: string;
  anio: number;
  mes: number;
  ajuste: SaldoMensualAjusteTotalPayload;
}) {
  const saldos = await getSaldoMensual({ anio: payload.anio, mes: payload.mes });
  const productoCodigo = payload.productoCodigo?.trim().toLowerCase();
  const saldo = saldos.data.find(
    (item) =>
      (payload.productoId && item.productoId === payload.productoId) ||
      (productoCodigo && item.productoCodigo.toLowerCase() === productoCodigo)
  );

  if (!saldo) {
    throw new Error("No se encontró saldo mensual para el producto y período seleccionados.");
  }

  return patchRequest({
    url: apiEndpoints.inventarioImport.saldoMensualAjusteTotal(saldo.id),
    body: saldoMensualAjusteTotalPayloadSchema.parse(payload.ajuste),
    schema: saldoMensualAjusteTotalResponseSchema
  });
}

export async function ajustarProductosMes(payload: AjusteProductosMesPayload) {
  return postRequest({
    url: apiEndpoints.inventarioImport.ajusteProductosMes,
    body: ajusteProductosMesPayloadSchema.parse(payload),
    schema: ajusteProductosMesResponseSchema
  });
}

export async function ajustarPreciosSinIva(payload: AjustarPreciosSinIvaPayload) {
  return postRequest({
    url: apiEndpoints.inventarioImport.ajustarPreciosSinIva,
    body: ajustarPreciosSinIvaPayloadSchema.parse(payload),
    schema: ajustarPreciosSinIvaResponseSchema
  });
}

export async function ejecutarBackfillCpp(payload: BackfillCppPayload) {
  return postRequest({
    url: apiEndpoints.inventarioImport.backfillCpp,
    body: backfillCppPayloadSchema.parse(payload),
    config: { timeout: 0 },
    schema: backfillCppResponseSchema
  });
}

export async function getDiagnosticoPrecios(params: SaldoMensualQuery) {
  const parsed = saldoMensualQuerySchema.parse(params);
  return getRequest({
    url: apiEndpoints.inventarioImport.diagnosticoPrecios,
    config: { params: parsed },
    schema: diagnosticoPreciosResponseSchema
  });
}

export async function getDiagnosticoSaldos(params: SaldoMensualQuery) {
  const parsed = saldoMensualQuerySchema.parse(params);
  return getRequest({
    url: apiEndpoints.inventarioImport.diagnosticoSaldos,
    config: { params: parsed },
    schema: diagnosticoSaldosResponseSchema
  });
}

export async function getDiagnosticoRedondeo(params: SaldoMensualQuery) {
  const parsed = saldoMensualQuerySchema.parse(params);
  return getRequest({
    url: apiEndpoints.inventarioImport.diagnosticoRedondeo,
    config: { params: parsed },
    schema: diagnosticoRedondeoResponseSchema
  });
}

export async function postFixRedondeo(payload: FixRedondeoPayload) {
  return postRequest({
    url: apiEndpoints.inventarioImport.fixRedondeo,
    body: fixRedondeoPayloadSchema.parse(payload),
    schema: fixRedondeoResponseSchema
  });
}

export async function importarAjusteInicialSaldoMensualExcel(payload: {
  file: File;
  anio: number;
  mes: number;
}) {
  const parsed = saldoMensualQuerySchema.parse({ anio: payload.anio, mes: payload.mes });
  const formData = new FormData();
  formData.append("file", payload.file);
  const response = await httpClient.post(
    apiEndpoints.inventarioImport.saldoMensualAjusteInicialExcel,
    formData,
    {
      headers: { "Content-Type": "multipart/form-data" },
      params: parsed
    }
  );
  return saldoMensualAjusteInicialExcelResponseSchema.parse(response.data);
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
  const response = await httpClient.post(
    apiEndpoints.inventarioImport.cierreMes,
    cierreMesPayloadSchema.parse(payload),
    { timeout: 0 }
  );
  const data = response.data as unknown;

  if (data && typeof data === "object" && "success" in data && data.success === false) {
    const payloadData = data as Record<string, unknown>;
    const message = [payloadData.error, payloadData.message, payloadData.msg].find(
      (value) => typeof value === "string" && value.trim()
    );
    throw new ApiError(
      typeof message === "string" ? message.trim() : "No se pudo cerrar el período mensual.",
      { details: payloadData }
    );
  }

  return cierreMesCreateResponseSchema.parse(data);
}

export async function deleteCierreMes(payload: CierreMesPayload) {
  return deleteRequest({
    url: apiEndpoints.inventarioImport.cierreMes,
    config: { data: cierreMesPayloadSchema.parse(payload) },
    schema: cierreMesDeleteResponseSchema
  });
}

export async function inicializarPeriodoHistorico(payload: InicializarPeriodoPayload) {
  return postRequest({
    url: apiEndpoints.inventarioImport.saldoMensualInicializar,
    body: inicializarPeriodoPayloadSchema.parse(payload),
    schema: importResultSchema
  });
}

export async function getLimpiarMesPreview(params: LimpiarMesPayload) {
  const parsed = limpiarMesPayloadSchema.parse(params);
  return getRequest({
    url: apiEndpoints.inventarioImport.limpiarMesPreview,
    config: { params: parsed },
    schema: limpiarMesPreviewResponseSchema
  });
}

export async function ejecutarLimpiarMes(payload: LimpiarMesPayload) {
  const parsed = limpiarMesPayloadSchema.parse(payload);
  const response = await httpClient.delete(apiEndpoints.inventarioImport.limpiarMes, {
    data: parsed
  });
  return limpiarMesResultResponseSchema.parse(response.data);
}
