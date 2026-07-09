import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "@/features/auth/context/AuthContext";

const allowedRoles = new Set(["ADMIN", "ADMINISTRADOR", "SUPERINTENDENTE", "TRABAJADOR"]);

export function EppRoute() {
  const { user } = useAuth();

  if (!user || !allowedRoles.has(user.role)) {
    return <Navigate to="/perfil" replace />;
  }

  return <Outlet />;
}
