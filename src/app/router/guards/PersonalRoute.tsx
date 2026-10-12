import { Navigate, Outlet } from "react-router-dom";
import { usePermisos } from "@/features/auth/hooks/usePermisos";

// Acceso al módulo Personal: cualquier permiso "personal.*" del rol.
// Cada página/botón verifica además su permiso específico.
export function PersonalRoute() {
  const { canAny, isLoading } = usePermisos();

  if (isLoading) return null;

  if (!canAny("personal")) {
    return <Navigate to="/perfil" replace />;
  }

  return <Outlet />;
}
