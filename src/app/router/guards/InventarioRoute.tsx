import { Navigate, Outlet } from "react-router-dom";
import { usePermisos } from "@/features/auth/hooks/usePermisos";

// Acceso al módulo Inventario: cualquier permiso "inventario.*" del rol.
// Cada pantalla verifica además su permiso específico con <PermisoRoute />.
export function InventarioRoute() {
  const { canAny, isLoading } = usePermisos();

  if (isLoading) return null;

  if (!canAny("inventario")) {
    return <Navigate to="/perfil" replace />;
  }

  return <Outlet />;
}
