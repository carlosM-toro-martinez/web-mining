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
//
// ADMIN tiene acceso total SIEMPRE, sin depender de esta consulta: aunque la
// API no responda o falle, un ADMIN nunca queda fuera de ningún módulo.
export function usePermisos() {
  const { user, isAuthenticated, isAdmin } = useAuth();

  const query = useQuery({
    queryKey: queryKeys.roles.misPermisos(user?.id ?? null),
    enabled: isAuthenticated && !isAdmin,
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
      if (isAdmin) return true;
      if (!data) return false;
      if (data.esSuperAdmin) return true;
      return permisos?.includes(`${recurso}:${accion}`) ?? false;
    },
    [isAdmin, data, permisos]
  );

  // ¿Tiene algún permiso dentro de un módulo? (ej. "personal")
  const canAny = useCallback(
    (prefijo: string) => {
      if (isAdmin) return true;
      if (!data) return false;
      if (data.esSuperAdmin) return true;
      return permisos?.some((p) => p.startsWith(`${prefijo}.`)) ?? false;
    },
    [isAdmin, data, permisos]
  );

  return {
    can,
    canAny,
    esSuperAdmin: isAdmin || (data?.esSuperAdmin ?? false),
    isLoading: isAdmin ? false : query.isLoading,
    isError: isAdmin ? false : query.isError
  };
}
