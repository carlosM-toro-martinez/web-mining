import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "@/features/auth/context/AuthContext";

// Restringido solo a ADMIN por ahora — a pedido explícito, hasta que se cree
// un rol específico (ej. Medioambiente) que deba verlo también.
const allowedRoles = new Set(["ADMIN"]);

export function AmbientalRoute() {
  const { user } = useAuth();

  if (!user || !allowedRoles.has(user.role)) {
    return <Navigate to="/perfil" replace />;
  }

  return <Outlet />;
}
