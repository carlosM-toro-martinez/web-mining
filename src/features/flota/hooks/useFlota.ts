import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  cambiarEstadoVehiculo,
  createChofer,
  createVehiculo,
  getChoferes,
  getVehiculoHistorial,
  getVehiculos,
  updateChofer,
  updateVehiculo
} from "@/features/flota/api/flotaApi";
import type {
  CambiarEstadoVehiculoPayload,
  CreateChoferPayload,
  CreateVehiculoPayload,
  UpdateChoferPayload,
  UpdateVehiculoPayload,
  Vehiculo,
  VehiculoListResponse
} from "@/features/flota/model/flota.schema";
import { queryKeys } from "@/shared/lib/queryKeys";

export function useVehiculosQuery() {
  return useQuery({
    queryKey: queryKeys.flota.vehiculos(),
    queryFn: getVehiculos
  });
}

export function useVehiculoHistorialQuery(id: number | undefined) {
  return useQuery({
    queryKey: queryKeys.flota.vehiculoHistorial(id ?? 0),
    queryFn: () => getVehiculoHistorial(id as number),
    enabled: id !== undefined
  });
}

export function useCreateVehiculoMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateVehiculoPayload) => createVehiculo(payload),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.flota.vehiculos() });
    }
  });
}

export function useUpdateVehiculoMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: UpdateVehiculoPayload }) =>
      updateVehiculo(id, payload),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.flota.vehiculos() });
    }
  });
}

// Actualización optimista: el tablero cambia la columna al soltar la
// tarjeta, sin esperar la respuesta del servidor. Si el PATCH falla,
// se restaura la lista anterior para que el tablero nunca quede
// mostrando un estado que en realidad no se guardó.
export function useCambiarEstadoVehiculoMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: CambiarEstadoVehiculoPayload }) =>
      cambiarEstadoVehiculo(id, payload),
    onMutate: async ({ id, payload }) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.flota.vehiculos() });
      const previous = queryClient.getQueryData<VehiculoListResponse>(queryKeys.flota.vehiculos());

      queryClient.setQueryData<VehiculoListResponse>(queryKeys.flota.vehiculos(), (current) => {
        if (!current) return current;
        return {
          ...current,
          data: current.data.map((vehiculo: Vehiculo) =>
            vehiculo.id === id ? { ...vehiculo, estadoActual: payload.estado } : vehiculo
          )
        };
      });

      return { previous };
    },
    onError: (_error, _variables, context) => {
      if (context?.previous) {
        queryClient.setQueryData(queryKeys.flota.vehiculos(), context.previous);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.flota.vehiculos() });
    }
  });
}

export function useChoferesQuery() {
  return useQuery({
    queryKey: queryKeys.flota.choferes(),
    queryFn: getChoferes
  });
}

export function useCreateChoferMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateChoferPayload) => createChofer(payload),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.flota.choferes() });
    }
  });
}

export function useUpdateChoferMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: UpdateChoferPayload }) =>
      updateChofer(id, payload),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.flota.choferes() });
    }
  });
}
