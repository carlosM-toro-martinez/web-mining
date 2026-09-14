import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "@/features/auth/context/AuthContext";

export function CajaChicaRoute() {
  const { user } = useAuth();

  const canAccess =
    user?.role === "ADMIN" ||
    user?.role === "ADMINISTRADOR" ||
    user?.role === "CONTADOR" ||
    user?.role === "SUPERINTENDENTE";

  if (!canAccess) {
    return <Navigate to="/perfil" replace />;
  }

  return <Outlet />;
}
