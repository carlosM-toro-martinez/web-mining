import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "@/features/auth/context/AuthContext";

export function InventarioReportesRoute() {
  const { user } = useAuth();

  const canAccess =
    user?.role === "ALMACENERO" ||
    user?.role === "ADMIN" ||
    user?.role === "RECEPCIONISTA" ||
    user?.role === "SUPERINTENDENTE" ||
    user?.role === "CONTADOR";

  if (!canAccess) {
    return <Navigate to="/perfil" replace />;
  }

  return <Outlet />;
}
