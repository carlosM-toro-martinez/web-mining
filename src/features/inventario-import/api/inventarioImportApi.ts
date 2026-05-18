import { getRequest, postRequest } from "@/shared/api/core/request";
import { httpClient } from "@/shared/api/core/httpClient";
import { apiEndpoints } from "@/shared/api/endpoints";
import {
  importResultSchema,
  saldoMensualListResponseSchema,
  saldoMensualPayloadSchema,
  saldoMensualQuerySchema,
  stockInicialPayloadSchema,
  type SaldoMensualPayload,
  type SaldoMensualQuery,
  type StockInicialPayload
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
