import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  anularFormulario101,
  getFormularios101,
  marcarPeticionEnviadaFormulario101,
  reutilizarFormulario101,
  vincularFormulario101,
  type Formulario101QueryParams
} from "@/features/formulario101/api/formulario101Api";
import type {
  AnularFormulario101Payload,
  ReutilizarFormulario101Payload,
  VincularFormulario101Payload
} from "@/features/formulario101/model/formulario101.schema";
import { queryKeys } from "@/shared/lib/queryKeys";

export function useFormularios101Query(params: Formulario101QueryParams = {}) {
  return useQuery({
    queryKey: queryKeys.formulario101.list(params),
    queryFn: () => getFormularios101(params)
  });
}

function useInvalidarFormularios101() {
  const queryClient = useQueryClient();
  return async () => {
    await queryClient.invalidateQueries({ queryKey: queryKeys.formulario101.all });
    await queryClient.invalidateQueries({ queryKey: queryKeys.lotesDespacho.all });
  };
}

export function useVincularFormulario101Mutation() {
  const invalidate = useInvalidarFormularios101();
  return useMutation({
    mutationFn: ({ loteId, payload }: { loteId: string; payload: VincularFormulario101Payload }) =>
      vincularFormulario101(loteId, payload),
    onSuccess: () => invalidate()
  });
}

export function useReutilizarFormulario101Mutation() {
  const invalidate = useInvalidarFormularios101();
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: ReutilizarFormulario101Payload }) =>
      reutilizarFormulario101(id, payload),
    onSuccess: () => invalidate()
  });
}

export function useAnularFormulario101Mutation() {
  const invalidate = useInvalidarFormularios101();
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: AnularFormulario101Payload }) =>
      anularFormulario101(id, payload),
    onSuccess: () => invalidate()
  });
}

export function useMarcarPeticionEnviadaMutation() {
  const invalidate = useInvalidarFormularios101();
  return useMutation({
    mutationFn: (id: string) => marcarPeticionEnviadaFormulario101(id),
    onSuccess: () => invalidate()
  });
}
