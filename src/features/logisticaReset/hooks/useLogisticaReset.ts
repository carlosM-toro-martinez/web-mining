import { useMutation, useQueryClient } from "@tanstack/react-query";
import { resetLogistica } from "@/features/logisticaReset/api/logisticaResetApi";
import { queryKeys } from "@/shared/lib/queryKeys";

export function useResetLogisticaMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: resetLogistica,
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.parametrosLogistica.all }),
        queryClient.invalidateQueries({ queryKey: queryKeys.transportistas.all }),
        queryClient.invalidateQueries({ queryKey: queryKeys.flota.all }),
        queryClient.invalidateQueries({ queryKey: queryKeys.lotesDespacho.all }),
        queryClient.invalidateQueries({ queryKey: queryKeys.formulario101.all }),
        queryClient.invalidateQueries({ queryKey: queryKeys.liquidaciones.all }),
        queryClient.invalidateQueries({ queryKey: queryKeys.logisticaReportes.all })
      ]);
    }
  });
}
