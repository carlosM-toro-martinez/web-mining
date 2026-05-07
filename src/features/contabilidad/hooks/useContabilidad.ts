import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  createCentroCosto,
  createCuenta,
  createFuncionGasto,
  createSector,
  createSalidaMovimiento,
  getCentrosCosto,
  getCuentas,
  getFuncionesGasto,
  getSectores
} from "@/features/contabilidad/api/contabilidadApi";
import type {
  CreateCentroCostoPayload,
  CreateCuentaPayload,
  CreateFuncionGastoPayload,
  CreateSectorPayload,
  CreateSalidaPayload
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

export function useCreateSalidaMovimientoMutation() {
  return useMutation({
    mutationFn: (payload: CreateSalidaPayload) => createSalidaMovimiento(payload)
  });
}
