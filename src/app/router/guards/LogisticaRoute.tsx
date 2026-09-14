import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "@/features/auth/context/AuthContext";

export function LogisticaRoute() {
  const { user } = useAuth();

  const canAccess =
    user?.role === "ADMIN" ||
    user?.role === "SUPERINTENDENTE" ||
    user?.role === "ASISTENTE_ADMINISTRATIVO";

  if (!canAccess) {
    return <Navigate to="/perfil" replace />;
  }

  return <Outlet />;
}
