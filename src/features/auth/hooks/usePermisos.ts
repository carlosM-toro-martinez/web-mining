import { useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/features/auth/context/AuthContext";
import { httpClient } from "@/shared/api/core/httpClient";
import { queryKeys } from "@/shared/lib/queryKeys";

interface MisPermisosResponse {
  rol: { codigo: string; nombre: string; activo: boolean } | null;
  esSuperAdmin: boolean;
  // "recurso:accion", ej. "personal.empleados:eliminar"
  permisos: string[];
}

// Permisos dinámicos del usuario logueado (GET /api/roles/mis-permisos).
// Se consultan a la API (no se guardan en el token) para que un cambio de
// rol o de permisos se refleje sin cerrar sesión.
export function usePermisos() {
  const { user, isAuthenticated } = useAuth();

  const query = useQuery({
    queryKey: queryKeys.roles.misPermisos(user?.id ?? null),
    enabled: isAuthenticated,
    staleTime: 60_000,
    refetchOnWindowFocus: true,
    queryFn: async () => {
      const response = await httpClient.get("/api/roles/mis-permisos");
      return (response.data as { data: MisPermisosResponse }).data;
    }
  });

  const data = query.data;
  const permisos = data?.permisos;

  const can = useCallback(
    (recurso: string, accion: string) => {
      if (!data) return false;
      if (data.esSuperAdmin) return true;
      return permisos?.includes(`${recurso}:${accion}`) ?? false;
    },
    [data, permisos]
  );

  // ¿Tiene algún permiso dentro de un módulo? (ej. "personal")
  const canAny = useCallback(
    (prefijo: string) => {
      if (!data) return false;
      if (data.esSuperAdmin) return true;
      return permisos?.some((p) => p.startsWith(`${prefijo}.`)) ?? false;
    },
    [data, permisos]
  );

  return {
    can,
    canAny,
    esSuperAdmin: data?.esSuperAdmin ?? false,
    isLoading: query.isLoading,
    isError: query.isError
  };
}
