import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  createCajaChica,
  createCentroCostoCaja,
  createConceptoRetencionCaja,
  createCuentaContableCaja,
  createFuncionGastoCaja,
  createCuentaBancariaCaja,
  createPartidaPresupuestoCaja,
  deleteCajaChica,
  deleteCentroCostoCaja,
  deleteCuentaContableCaja,
  deleteFuncionGastoCaja,
  deleteCuentaBancariaCaja,
  deletePartidaPresupuestoCaja,
  getCajasChicas,
  getCentrosCostoCaja,
  getConceptosRetencionCaja,
  getCuentasContablesCaja,
  getFuncionesGastoCaja,
  getCuentasBancariasCaja,
  getPartidasPresupuestoCaja,
  resetTransaccionalCajaChica,
  type PartidasPresupuestoQueryParams,
  updateCajaChica,
  updateCentroCostoCaja,
  updateConceptoRetencionCaja,
  updateCuentaContableCaja,
  updateFuncionGastoCaja,
  updateCuentaBancariaCaja,
  updatePartidaPresupuestoCaja
} from "@/features/parametrosCajaChica/api/parametrosCajaChicaApi";
import type {
  CreateCajaChicaPayload,
  CreateCentroCostoCajaPayload,
  CreateConceptoRetencionCajaPayload,
  CreateCuentaContableCajaPayload,
  CreateFuncionGastoCajaPayload,
  CreateCuentaBancariaCajaPayload,
  CreatePartidaPresupuestoCajaPayload,
  UpdateCajaChicaPayload,
  UpdateCentroCostoCajaPayload,
  UpdateConceptoRetencionCajaPayload,
  UpdateCuentaContableCajaPayload,
  UpdateFuncionGastoCajaPayload,
  UpdateCuentaBancariaCajaPayload,
  UpdatePartidaPresupuestoCajaPayload
} from "@/features/parametrosCajaChica/model/parametrosCajaChica.schema";
import { queryKeys } from "@/shared/lib/queryKeys";

// --- Cajas chicas ---
export function useCajasChicasQuery() {
  return useQuery({ queryKey: queryKeys.parametrosCajaChica.cajas(), queryFn: getCajasChicas });
}
export function useCreateCajaChicaMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateCajaChicaPayload) => createCajaChica(payload),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.parametrosCajaChica.cajas() });
    }
  });
}
export function useUpdateCajaChicaMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: UpdateCajaChicaPayload }) => updateCajaChica(id, payload),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.parametrosCajaChica.cajas() });
    }
  });
}
export function useDeleteCajaChicaMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => deleteCajaChica(id),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.parametrosCajaChica.cajas() });
    }
  });
}

// Borra TODO lo transaccional (gastos, rendiciones, movimientos, partidas)
// de todas las cajas — no toca cajas/cuentas bancarias/catálogos. Por eso
// invalida prácticamente todo lo que depende de esos datos.
export function useResetTransaccionalCajaChicaMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => resetTransaccionalCajaChica(),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.parametrosCajaChica.all }),
        queryClient.invalidateQueries({ queryKey: queryKeys.gastoCaja.all }),
        queryClient.invalidateQueries({ queryKey: queryKeys.rendicionCaja.all }),
        queryClient.invalidateQueries({ queryKey: queryKeys.movimientoBancoCaja.all }),
        queryClient.invalidateQueries({ queryKey: queryKeys.reportesCajaChica.all })
      ]);
    }
  });
}

// --- Centros de costo ---
export function useCentrosCostoCajaQuery() {
  return useQuery({ queryKey: queryKeys.parametrosCajaChica.centrosCosto(), queryFn: getCentrosCostoCaja });
}
export function useCreateCentroCostoCajaMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateCentroCostoCajaPayload) => createCentroCostoCaja(payload),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.parametrosCajaChica.centrosCosto() });
    }
  });
}
export function useUpdateCentroCostoCajaMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: UpdateCentroCostoCajaPayload }) =>
      updateCentroCostoCaja(id, payload),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.parametrosCajaChica.centrosCosto() });
    }
  });
}
export function useDeleteCentroCostoCajaMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => deleteCentroCostoCaja(id),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.parametrosCajaChica.centrosCosto() });
    }
  });
}

// --- Funciones de gasto ---
export function useFuncionesGastoCajaQuery() {
  return useQuery({ queryKey: queryKeys.parametrosCajaChica.funcionesGasto(), queryFn: getFuncionesGastoCaja });
}
export function useCreateFuncionGastoCajaMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateFuncionGastoCajaPayload) => createFuncionGastoCaja(payload),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.parametrosCajaChica.funcionesGasto() });
    }
  });
}
export function useUpdateFuncionGastoCajaMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: UpdateFuncionGastoCajaPayload }) =>
      updateFuncionGastoCaja(id, payload),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.parametrosCajaChica.funcionesGasto() });
    }
  });
}
export function useDeleteFuncionGastoCajaMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => deleteFuncionGastoCaja(id),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.parametrosCajaChica.funcionesGasto() });
    }
  });
}

// --- Cuentas contables ---
export function useCuentasContablesCajaQuery() {
  return useQuery({ queryKey: queryKeys.parametrosCajaChica.cuentasContables(), queryFn: getCuentasContablesCaja });
}
export function useCreateCuentaContableCajaMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateCuentaContableCajaPayload) => createCuentaContableCaja(payload),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.parametrosCajaChica.cuentasContables() });
    }
  });
}
export function useUpdateCuentaContableCajaMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: UpdateCuentaContableCajaPayload }) =>
      updateCuentaContableCaja(id, payload),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.parametrosCajaChica.cuentasContables() });
    }
  });
}
export function useDeleteCuentaContableCajaMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => deleteCuentaContableCaja(id),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.parametrosCajaChica.cuentasContables() });
    }
  });
}

// --- Conceptos de retención ---
export function useConceptosRetencionCajaQuery() {
  return useQuery({
    queryKey: queryKeys.parametrosCajaChica.conceptosRetencion(),
    queryFn: getConceptosRetencionCaja
  });
}
export function useCreateConceptoRetencionCajaMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateConceptoRetencionCajaPayload) => createConceptoRetencionCaja(payload),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.parametrosCajaChica.conceptosRetencion() });
    }
  });
}
export function useUpdateConceptoRetencionCajaMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: UpdateConceptoRetencionCajaPayload }) =>
      updateConceptoRetencionCaja(id, payload),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.parametrosCajaChica.conceptosRetencion() });
    }
  });
}

// --- Cuentas bancarias ---
export function useCuentasBancariasCajaQuery() {
  return useQuery({ queryKey: queryKeys.parametrosCajaChica.cuentasBancarias(), queryFn: getCuentasBancariasCaja });
}
export function useCreateCuentaBancariaCajaMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateCuentaBancariaCajaPayload) => createCuentaBancariaCaja(payload),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.parametrosCajaChica.cuentasBancarias() });
    }
  });
}
export function useUpdateCuentaBancariaCajaMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: UpdateCuentaBancariaCajaPayload }) =>
      updateCuentaBancariaCaja(id, payload),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.parametrosCajaChica.cuentasBancarias() });
    }
  });
}
export function useDeleteCuentaBancariaCajaMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => deleteCuentaBancariaCaja(id),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.parametrosCajaChica.cuentasBancarias() });
    }
  });
}

// --- Partidas de presupuesto ---
export function usePartidasPresupuestoCajaQuery(params: PartidasPresupuestoQueryParams = {}) {
  return useQuery({
    queryKey: queryKeys.parametrosCajaChica.partidasPresupuesto(params),
    queryFn: () => getPartidasPresupuestoCaja(params)
  });
}
export function useCreatePartidaPresupuestoCajaMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreatePartidaPresupuestoCajaPayload) => createPartidaPresupuestoCaja(payload),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.parametrosCajaChica.all });
    }
  });
}
export function useUpdatePartidaPresupuestoCajaMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: UpdatePartidaPresupuestoCajaPayload }) =>
      updatePartidaPresupuestoCaja(id, payload),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.parametrosCajaChica.all });
    }
  });
}
export function useDeletePartidaPresupuestoCajaMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => deletePartidaPresupuestoCaja(id),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.parametrosCajaChica.all });
    }
  });
}
