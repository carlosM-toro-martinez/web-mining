import { useCallback, useEffect, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { createGastoCaja } from "@/features/gastoCaja/api/gastoCajaApi";
import {
  addGastoPendiente,
  getGastosPendientes,
  marcarIntentoFallido,
  removeGastoPendiente,
  type GastoCajaPendiente
} from "@/features/gastoCaja/lib/offlineGastoQueue";
import type { CreateGastoCajaPayload } from "@/features/gastoCaja/model/gastoCaja.schema";
import { ApiError } from "@/shared/api/core/apiError";
import { queryKeys } from "@/shared/lib/queryKeys";

// Encola gastos creados sin conexión (localStorage) y los reintenta al
// reconectar. Solo se encola cuando el error es de red real (ApiError sin
// statusCode, ver normalizeApiError): un 400/409 del servidor es un rechazo
// real de datos y no debe reintentarse en silencio.
export function useGastoCajaOfflineQueue() {
  const queryClient = useQueryClient();
  const [pendientes, setPendientes] = useState<GastoCajaPendiente[]>(() => getGastosPendientes());
  const [sincronizando, setSincronizando] = useState(false);
  const sincronizandoRef = useRef(false);

  const refresh = useCallback(() => setPendientes(getGastosPendientes()), []);

  const encolar = useCallback(
    (payload: CreateGastoCajaPayload) => {
      addGastoPendiente(payload);
      refresh();
    },
    [refresh]
  );

  const sincronizar = useCallback(async () => {
    if (sincronizandoRef.current) return;
    const actuales = getGastosPendientes();
    if (actuales.length === 0) return;

    sincronizandoRef.current = true;
    setSincronizando(true);
    try {
      for (const item of actuales) {
        try {
          await createGastoCaja(item.payload);
          removeGastoPendiente(item.localId);
        } catch (error) {
          const esErrorDeRed = error instanceof ApiError && error.statusCode === undefined;
          const mensaje = error instanceof Error ? error.message : "Error desconocido";
          marcarIntentoFallido(item.localId, mensaje);
          if (esErrorDeRed) break; // seguimos sin conexión, no tiene sentido seguir intentando ahora
        }
      }
    } finally {
      refresh();
      sincronizandoRef.current = false;
      setSincronizando(false);
      await queryClient.invalidateQueries({ queryKey: queryKeys.gastoCaja.all });
    }
  }, [queryClient, refresh]);

  useEffect(() => {
    void sincronizar();
    window.addEventListener("online", sincronizar);
    return () => window.removeEventListener("online", sincronizar);
  }, [sincronizar]);

  return { pendientes, encolar, sincronizar, sincronizando };
}
