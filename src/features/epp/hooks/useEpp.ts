import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  createEppAsignacion,
  deleteEppAsignacion,
  getEppAsignaciones,
  getEppProductoHistorial,
  getEppProductos,
  getEppTrabajadorReporte,
  getEppTrabajadores,
  updateEppAsignacion
} from "@/features/epp/api/eppApi";
import type {
  EppAsignacionesQuery,
  EppCreateAsignacionPayload,
  EppProductosQuery,
  EppTrabajadoresQuery,
  EppUpdateAsignacionPayload
} from "@/features/epp/model/epp.schema";

const eppKeys = {
  all: ["epp"] as const,
  productos: (params: EppProductosQuery) => [...eppKeys.all, "productos", params] as const,
  productoHistorial: (productoId: number | string | null) =>
    [...eppKeys.all, "producto-historial", productoId] as const,
  trabajadores: (params: EppTrabajadoresQuery) => [...eppKeys.all, "trabajadores", params] as const,
  trabajadorReporte: (usuarioId: number | string | null) =>
    [...eppKeys.all, "trabajador-reporte", usuarioId] as const,
  asignaciones: (params: EppAsignacionesQuery) => [...eppKeys.all, "asignaciones", params] as const
};

export function useEppProductosQuery(params: EppProductosQuery) {
  return useQuery({
    queryKey: eppKeys.productos(params),
    queryFn: () => getEppProductos(params)
  });
}

export function useEppProductoHistorialQuery(productoId: number | string | null) {
  return useQuery({
    queryKey: eppKeys.productoHistorial(productoId),
    queryFn: () => getEppProductoHistorial(productoId ?? ""),
    enabled: Boolean(productoId)
  });
}

export function useEppTrabajadoresQuery(params: EppTrabajadoresQuery, enabled: boolean) {
  return useQuery({
    queryKey: eppKeys.trabajadores(params),
    queryFn: () => getEppTrabajadores(params),
    enabled
  });
}

export function useEppTrabajadorReporteQuery(usuarioId: number | string | null, enabled: boolean) {
  return useQuery({
    queryKey: eppKeys.trabajadorReporte(usuarioId),
    queryFn: () => getEppTrabajadorReporte(usuarioId ?? ""),
    enabled: enabled && Boolean(usuarioId)
  });
}

export function useEppAsignacionesQuery(params: EppAsignacionesQuery, enabled: boolean) {
  return useQuery({
    queryKey: eppKeys.asignaciones(params),
    queryFn: () => getEppAsignaciones(params),
    enabled
  });
}

export function useCreateEppAsignacionMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: EppCreateAsignacionPayload) => createEppAsignacion(payload),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: eppKeys.all });
    }
  });
}

export function useUpdateEppAsignacionMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: EppUpdateAsignacionPayload }) =>
      updateEppAsignacion(id, payload),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: eppKeys.all });
    }
  });
}

export function useDeleteEppAsignacionMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteEppAsignacion(id),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: eppKeys.all });
    }
  });
}
