import { Navigate, Outlet } from "react-router-dom";
import { usePermisos } from "@/features/auth/hooks/usePermisos";

// Acceso al módulo Logística: cualquier permiso "logistica.*" del rol.
// Cada página/acción verifica además su permiso específico.
export function LogisticaRoute() {
  const { canAny, isLoading } = usePermisos();

  if (isLoading) return null;

  if (!canAny("logistica")) {
    return <Navigate to="/perfil" replace />;
  }

  return <Outlet />;
}
