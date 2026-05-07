import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "@/features/auth/context/AuthContext";

export function AlmaceneroRoute() {
  const { user } = useAuth();

  const canAccessInventory =
    user?.role === "ALMACENERO" || user?.role === "ADMIN" || user?.role === "RECEPCIONISTA";

  if (!canAccessInventory) {
    return <Navigate to="/perfil" replace />;
  }

  return <Outlet />;
}
