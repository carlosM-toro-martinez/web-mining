import { useMutation, useQuery } from "@tanstack/react-query";
import {
  ajustarProductosMes,
  ajustarPreciosSinIva,
  ajustarSaldoMensualTotal,
  deleteSaldoMensualById,
  createCierreMes,
  deleteCierreMes,
  ejecutarBackfillCpp,
  getCierresMes,
  getDiagnosticoPrecios,
  getDiagnosticoSaldos,
  getDiagnosticoRedondeo,
  postFixRedondeo,
  getSaldoMensual,
  getSaldoMensualById,
  getSaldoMensualPreview,
  inicializarPeriodoHistorico,
  importCatalogo,
  importarAjusteInicialSaldoMensualExcel,
  recalcularStock,
  reiniciarStock,
  importSaldoMensual,
  importStockInicial,
  sincronizarStock,
  updateSaldoMensualById,
  upsertSaldoMensualItem,
  getLimpiarMesPreview,
  ejecutarLimpiarMes
} from "@/features/inventario-import/api/inventarioImportApi";
import type {
  AjustarPreciosSinIvaPayload,
  BackfillCppPayload,
  RecalcularStockPayload,
  AjusteProductosMesPayload,
  ReiniciarStockPayload,
  SaldoMensualAjusteTotalPayload,
  SaldoMensualItemPatchPayload,
  SaldoMensualItemUpsertPayload,
  SaldoMensualPayload,
  SaldoMensualQuery,
  SincronizarStockPayload,
  CierreMesPayload,
  StockInicialPayload,
  LimpiarMesPayload,
  type FixRedondeoPayload
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

export function useSaldoMensualPreviewQuery(
  params: SaldoMensualQuery,
  enabled: boolean,
  options?: { refetchInterval?: number | false }
) {
  return useQuery({
    queryKey: ["inventario-import", "saldo-mensual-preview", params],
    queryFn: () => getSaldoMensualPreview(params),
    enabled,
    ...options
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

export function useAjustarSaldoMensualTotalMutation() {
  return useMutation({
    mutationFn: (payload: {
      productoId?: number;
      productoCodigo?: string;
      anio: number;
      mes: number;
      ajuste: SaldoMensualAjusteTotalPayload;
    }) => ajustarSaldoMensualTotal(payload)
  });
}

export function useAjustarProductosMesMutation() {
  return useMutation({
    mutationFn: (payload: AjusteProductosMesPayload) => ajustarProductosMes(payload)
  });
}

export function useAjustarPreciosSinIvaMutation() {
  return useMutation({
    mutationFn: (payload: AjustarPreciosSinIvaPayload) => ajustarPreciosSinIva(payload)
  });
}

export function useBackfillCppMutation() {
  return useMutation({
    mutationFn: (payload: BackfillCppPayload) => ejecutarBackfillCpp(payload)
  });
}

export function useDiagnosticoPreciosQuery(params: SaldoMensualQuery, enabled: boolean) {
  return useQuery({
    queryKey: ["inventario-import", "diagnostico-precios", params],
    queryFn: () => getDiagnosticoPrecios(params),
    enabled
  });
}

export function useDiagnosticoSaldosQuery(params: SaldoMensualQuery, enabled: boolean) {
  return useQuery({
    queryKey: ["inventario-import", "diagnostico-saldos", params],
    queryFn: () => getDiagnosticoSaldos(params),
    enabled
  });
}

export function useDiagnosticoRedondeoQuery(params: SaldoMensualQuery, enabled: boolean) {
  return useQuery({
    queryKey: ["inventario-import", "diagnostico-redondeo", params],
    queryFn: () => getDiagnosticoRedondeo(params),
    enabled
  });
}

export function useFixRedondeoMutation() {
  return useMutation({ mutationFn: postFixRedondeo });
}

export function useImportarAjusteInicialSaldoMensualExcelMutation() {
  return useMutation({
    mutationFn: importarAjusteInicialSaldoMensualExcel
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

export function useDeleteCierreMesMutation() {
  return useMutation({
    mutationFn: (payload: CierreMesPayload) => deleteCierreMes(payload)
  });
}

export function useInicializarPeriodoHistoricoMutation() {
  return useMutation({
    mutationFn: inicializarPeriodoHistorico
  });
}

export function useLimpiarMesPreviewQuery(params: LimpiarMesPayload, enabled: boolean) {
  return useQuery({
    queryKey: ["inventario-import", "limpiar-mes-preview", params],
    queryFn: () => getLimpiarMesPreview(params),
    enabled
  });
}

export function useEjecutarLimpiarMesMutation() {
  return useMutation({
    mutationFn: (payload: LimpiarMesPayload) => ejecutarLimpiarMes(payload)
  });
}
