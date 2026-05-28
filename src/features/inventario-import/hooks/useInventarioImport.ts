import { useMutation, useQuery } from "@tanstack/react-query";
import {
  deleteSaldoMensualById,
  createCierreMes,
  getCierresMes,
  getSaldoMensual,
  getSaldoMensualById,
  inicializarPeriodoHistorico,
  importCatalogo,
  recalcularStock,
  reiniciarStock,
  importSaldoMensual,
  importStockInicial,
  sincronizarStock,
  updateSaldoMensualById,
  upsertSaldoMensualItem
} from "@/features/inventario-import/api/inventarioImportApi";
import type {
  RecalcularStockPayload,
  ReiniciarStockPayload,
  SaldoMensualItemPatchPayload,
  SaldoMensualItemUpsertPayload,
  SaldoMensualPayload,
  SaldoMensualQuery,
  SincronizarStockPayload,
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

export function useReiniciarStockMutation() {
  return useMutation({
    mutationFn: (payload: ReiniciarStockPayload) => reiniciarStock(payload)
  });
}

export function useSincronizarStockMutation() {
  return useMutation({
    mutationFn: (payload?: SincronizarStockPayload) => sincronizarStock(payload)
  });
}

export function useRecalcularStockMutation() {
  return useMutation({
    mutationFn: (payload: RecalcularStockPayload) => recalcularStock(payload)
  });
}

export function useUpsertSaldoMensualItemMutation() {
  return useMutation({
    mutationFn: (payload: SaldoMensualItemUpsertPayload) => upsertSaldoMensualItem(payload)
  });
}

export function useSaldoMensualByIdQuery(id: string | number | undefined, enabled: boolean) {
  return useQuery({
    queryKey: ["inventario-import", "saldo-mensual", "by-id", id],
    queryFn: () => getSaldoMensualById(id as string | number),
    enabled: Boolean(id) && enabled
  });
}

export function useUpdateSaldoMensualByIdMutation() {
  return useMutation({
    mutationFn: ({ id, payload }: { id: string | number; payload: SaldoMensualItemPatchPayload }) =>
      updateSaldoMensualById(id, payload)
  });
}

export function useDeleteSaldoMensualByIdMutation() {
  return useMutation({
    mutationFn: (id: string | number) => deleteSaldoMensualById(id)
  });
}

export function useCierresMesQuery(enabled = true) {
  return useQuery({
    queryKey: ["inventario-import", "cierre-mes"],
    queryFn: () => getCierresMes(),
    enabled
  });
}

export function useCreateCierreMesMutation() {
  return useMutation({
    mutationFn: createCierreMes
  });
}

export function useInicializarPeriodoHistoricoMutation() {
  return useMutation({
    mutationFn: inicializarPeriodoHistorico
  });
}
