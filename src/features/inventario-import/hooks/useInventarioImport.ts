import { useMutation, useQuery } from "@tanstack/react-query";
import {
  getSaldoMensual,
  importCatalogo,
  importSaldoMensual,
  importStockInicial
} from "@/features/inventario-import/api/inventarioImportApi";
import type {
  SaldoMensualPayload,
  SaldoMensualQuery,
  StockInicialPayload
} from "@/features/inventario-import/model/inventarioImport.schema";

export function useImportCatalogoMutation() {
  return useMutation({
    mutationFn: (payload: { file: File; anio?: number; mes?: number }) =>
      importCatalogo(payload.file, { anio: payload.anio, mes: payload.mes })
  });
}

export function useImportStockInicialMutation() {
  return useMutation({
    mutationFn: (payload: StockInicialPayload) => importStockInicial(payload)
  });
}

export function useImportSaldoMensualMutation() {
  return useMutation({
    mutationFn: (payload: SaldoMensualPayload) => importSaldoMensual(payload)
  });
}

export function useSaldoMensualQuery(params: SaldoMensualQuery, enabled: boolean) {
  return useQuery({
    queryKey: ["inventario-import", "saldo-mensual", params],
    queryFn: () => getSaldoMensual(params),
    enabled
  });
}
