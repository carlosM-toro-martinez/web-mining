import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  crearCuadreSaldo,
  getCuadresSaldo,
  previsualizarCuadre,
  type DestinoCuadre
} from "@/features/cuadreSaldo/api/cuadreSaldoApi";
import { queryKeys } from "@/shared/lib/queryKeys";

const CLAVE = ["cuadres-saldo"] as const;

export function useCuadresSaldoQuery() {
  return useQuery({ queryKey: CLAVE, queryFn: getCuadresSaldo });
}

export function usePrevisualizarCuadreQuery(params: (DestinoCuadre & { fechaCorte: string }) | null) {
  return useQuery({
    queryKey: [...CLAVE, "previsualizar", params],
    queryFn: () => previsualizarCuadre(params!),
    enabled: Boolean(params),
    retry: false
  });
}

// Un cuadre mueve el saldo de una caja o un banco: se refresca todo lo que lo muestra.
export function useCrearCuadreSaldoMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: crearCuadreSaldo,
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: CLAVE }),
        queryClient.invalidateQueries({ queryKey: queryKeys.reportesCajaChica.all }),
        queryClient.invalidateQueries({ queryKey: queryKeys.movimientoBancoCaja.all }),
        queryClient.invalidateQueries({ queryKey: queryKeys.gastoCaja.all }),
        queryClient.invalidateQueries({ queryKey: queryKeys.parametrosCajaChica.all }),
        queryClient.invalidateQueries({ queryKey: queryKeys.rendicionCaja.all })
      ]);
    }
  });
}
