import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  createCentroCosto,
  createCuenta,
  createFuncionGasto,
  createSector,
  createSalidaMovimiento,
  deleteCentroCosto,
  deleteCuenta,
  deleteFuncionGasto,
  deleteSector,
  getCentrosCosto,
  getCuentaMovimientos,
  getCuentas,
  getFuncionesGasto,
  getSectores,
  updateCentroCosto,
  updateCuenta,
  updateFuncionGasto,
  updateSector
} from "@/features/contabilidad/api/contabilidadApi";
import type {
  CreateCentroCostoPayload,
  CreateCuentaPayload,
  CreateFuncionGastoPayload,
  CreateSectorPayload,
  CreateSalidaPayload,
  UpdateCentroCostoPayload,
  UpdateCuentaPayload,
  UpdateFuncionGastoPayload,
  UpdateSectorPayload
} from "@/features/contabilidad/model/contabilidad.schema";
import { queryKeys } from "@/shared/lib/queryKeys";

export function useCentrosCostoQuery() {
  return useQuery({
    queryKey: queryKeys.contabilidad.centrosCosto(),
    queryFn: getCentrosCosto
  });
}

export function useFuncionesGastoQuery() {
  return useQuery({
    queryKey: queryKeys.contabilidad.funcionesGasto(),
    queryFn: getFuncionesGasto
  });
}

export function useSectoresQuery() {
  return useQuery({
    queryKey: queryKeys.contabilidad.sectores(),
    queryFn: getSectores
  });
}

export function useCuentasQuery() {
  return useQuery({
    queryKey: queryKeys.contabilidad.cuentas(),
    queryFn: getCuentas
  });
}

export function useCuentaMovimientosQuery(id: number | null) {
  return useQuery({
    queryKey: ["contabilidad", "cuenta-movimientos", id],
    queryFn: () => getCuentaMovimientos(id!),
    enabled: id !== null
  });
}

export function useCreateCentroCostoMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: CreateCentroCostoPayload) => createCentroCosto(payload),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.contabilidad.centrosCosto() });
      await queryClient.invalidateQueries({ queryKey: queryKeys.contabilidad.cuentas() });
    }
  });
}

export function useCreateFuncionGastoMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: CreateFuncionGastoPayload) => createFuncionGasto(payload),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.contabilidad.funcionesGasto() });
      await queryClient.invalidateQueries({ queryKey: queryKeys.contabilidad.cuentas() });
    }
  });
}

export function useCreateCuentaMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: CreateCuentaPayload) => createCuenta(payload),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.contabilidad.cuentas() });
    }
  });
}

export function useCreateSectorMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: CreateSectorPayload) => createSector(payload),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.contabilidad.sectores() });
      await queryClient.invalidateQueries({ queryKey: queryKeys.contabilidad.cuentas() });
    }
  });
}

export function useUpdateCentroCostoMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: UpdateCentroCostoPayload }) =>
      updateCentroCosto(id, payload),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.contabilidad.centrosCosto() });
      await queryClient.invalidateQueries({ queryKey: queryKeys.contabilidad.cuentas() });
    }
  });
}

export function useDeleteCentroCostoMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => deleteCentroCosto(id),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.contabilidad.centrosCosto() });
      await queryClient.invalidateQueries({ queryKey: queryKeys.contabilidad.cuentas() });
    }
  });
}

export function useUpdateFuncionGastoMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: UpdateFuncionGastoPayload }) =>
      updateFuncionGasto(id, payload),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.contabilidad.funcionesGasto() });
      await queryClient.invalidateQueries({ queryKey: queryKeys.contabilidad.cuentas() });
    }
  });
}

export function useDeleteFuncionGastoMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => deleteFuncionGasto(id),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.contabilidad.funcionesGasto() });
      await queryClient.invalidateQueries({ queryKey: queryKeys.contabilidad.cuentas() });
    }
  });
}

export function useUpdateSectorMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: UpdateSectorPayload }) =>
      updateSector(id, payload),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.contabilidad.sectores() });
      await queryClient.invalidateQueries({ queryKey: queryKeys.contabilidad.cuentas() });
    }
  });
}

export function useDeleteSectorMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => deleteSector(id),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.contabilidad.sectores() });
      await queryClient.invalidateQueries({ queryKey: queryKeys.contabilidad.cuentas() });
    }
  });
}

export function useUpdateCuentaMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: UpdateCuentaPayload }) =>
      updateCuenta(id, payload),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.contabilidad.cuentas() });
    }
  });
}

export function useDeleteCuentaMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => deleteCuenta(id),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.contabilidad.cuentas() });
    }
  });
}

export function useCreateSalidaMovimientoMutation() {
  return useMutation({
    mutationFn: (payload: CreateSalidaPayload) => createSalidaMovimiento(payload)
  });
}
