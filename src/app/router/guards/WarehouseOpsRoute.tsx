import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "@/features/auth/context/AuthContext";

export function WarehouseOpsRoute() {
  const { user } = useAuth();

  const canAccess =
    user?.role === "ALMACENERO" || user?.role === "ADMIN" || user?.role === "RECEPCIONISTA";

  if (!canAccess) {
    return <Navigate to="/perfil" replace />;
  }

  return <Outlet />;
}
