import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  createAlicuotaRegalia,
  createConceptoLiquidacion,
  createIngenio,
  createMunicipioOrigen,
  createTarifaLiquidacion,
  createTipoMineral,
  deleteConceptoLiquidacion,
  deleteIngenio,
  deleteMunicipioOrigen,
  deleteTipoMineral,
  getAlicuotasRegalia,
  getConceptosLiquidacion,
  getIngenios,
  getMunicipiosOrigen,
  getTarifasLiquidacion,
  getTiposMineral,
  updateConceptoLiquidacion,
  updateIngenio,
  updateMunicipioOrigen,
  updateTipoMineral
} from "@/features/parametrosLogistica/api/parametrosLogisticaApi";
import type {
  CreateAlicuotaRegaliaPayload,
  CreateCatalogoSimplePayload,
  CreateConceptoLiquidacionPayload,
  CreateTarifaLiquidacionPayload,
  UpdateCatalogoSimplePayload,
  UpdateConceptoLiquidacionPayload
} from "@/features/parametrosLogistica/model/parametrosLogistica.schema";
import { queryKeys } from "@/shared/lib/queryKeys";

// --- Municipios de origen ---
export function useMunicipiosOrigenQuery() {
  return useQuery({
    queryKey: queryKeys.parametrosLogistica.municipiosOrigen(),
    queryFn: getMunicipiosOrigen
  });
}
export function useCreateMunicipioOrigenMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateCatalogoSimplePayload) => createMunicipioOrigen(payload),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.parametrosLogistica.municipiosOrigen() });
    }
  });
}
export function useUpdateMunicipioOrigenMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: UpdateCatalogoSimplePayload }) =>
      updateMunicipioOrigen(id, payload),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.parametrosLogistica.municipiosOrigen() });
    }
  });
}
export function useDeleteMunicipioOrigenMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => deleteMunicipioOrigen(id),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.parametrosLogistica.municipiosOrigen() });
    }
  });
}

// --- Tipos de mineral ---
export function useTiposMineralQuery() {
  return useQuery({
    queryKey: queryKeys.parametrosLogistica.tiposMineral(),
    queryFn: getTiposMineral
  });
}
export function useCreateTipoMineralMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateCatalogoSimplePayload) => createTipoMineral(payload),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.parametrosLogistica.tiposMineral() });
    }
  });
}
export function useUpdateTipoMineralMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: UpdateCatalogoSimplePayload }) =>
      updateTipoMineral(id, payload),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.parametrosLogistica.tiposMineral() });
    }
  });
}
export function useDeleteTipoMineralMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => deleteTipoMineral(id),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.parametrosLogistica.tiposMineral() });
    }
  });
}

// --- Ingenios ---
export function useIngeniosQuery() {
  return useQuery({
    queryKey: queryKeys.parametrosLogistica.ingenios(),
    queryFn: getIngenios
  });
}
export function useCreateIngenioMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateCatalogoSimplePayload) => createIngenio(payload),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.parametrosLogistica.ingenios() });
    }
  });
}
export function useUpdateIngenioMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: UpdateCatalogoSimplePayload }) =>
      updateIngenio(id, payload),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.parametrosLogistica.ingenios() });
    }
  });
}
export function useDeleteIngenioMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => deleteIngenio(id),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.parametrosLogistica.ingenios() });
    }
  });
}

// --- Conceptos de liquidación ---
export function useConceptosLiquidacionQuery() {
  return useQuery({
    queryKey: queryKeys.parametrosLogistica.conceptosLiquidacion(),
    queryFn: getConceptosLiquidacion
  });
}
export function useCreateConceptoLiquidacionMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateConceptoLiquidacionPayload) => createConceptoLiquidacion(payload),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.parametrosLogistica.conceptosLiquidacion() });
    }
  });
}
export function useUpdateConceptoLiquidacionMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: UpdateConceptoLiquidacionPayload }) =>
      updateConceptoLiquidacion(id, payload),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.parametrosLogistica.conceptosLiquidacion() });
    }
  });
}
export function useDeleteConceptoLiquidacionMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => deleteConceptoLiquidacion(id),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.parametrosLogistica.conceptosLiquidacion() });
    }
  });
}

// --- Alícuotas de regalía ---
export function useAlicuotasRegaliaQuery() {
  return useQuery({
    queryKey: queryKeys.parametrosLogistica.alicuotasRegalia(),
    queryFn: getAlicuotasRegalia
  });
}
export function useCreateAlicuotaRegaliaMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateAlicuotaRegaliaPayload) => createAlicuotaRegalia(payload),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.parametrosLogistica.alicuotasRegalia() });
    }
  });
}

// --- Tarifas de liquidación ---
export function useTarifasLiquidacionQuery() {
  return useQuery({
    queryKey: queryKeys.parametrosLogistica.tarifasLiquidacion(),
    queryFn: getTarifasLiquidacion
  });
}
export function useCreateTarifaLiquidacionMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateTarifaLiquidacionPayload) => createTarifaLiquidacion(payload),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.parametrosLogistica.tarifasLiquidacion() });
    }
  });
}
