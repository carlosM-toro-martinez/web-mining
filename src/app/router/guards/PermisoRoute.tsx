import { Navigate, Outlet } from "react-router-dom";
import { usePermisos } from "@/features/auth/hooks/usePermisos";

interface PermisoRouteProps {
  recurso: string;
  accion?: string;
}

// Guard genérico por permiso dinámico: <Route element={<PermisoRoute recurso="sistema.roles" />}>
export function PermisoRoute({ recurso, accion = "ver" }: PermisoRouteProps) {
  const { can, isLoading } = usePermisos();

  if (isLoading) return null;

  if (!can(recurso, accion)) {
    return <Navigate to="/perfil" replace />;
  }

  return <Outlet />;
}
