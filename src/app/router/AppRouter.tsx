import { Navigate, Route, Routes } from "react-router-dom";
import { AppShell } from "@/shared/layout/AppShell";
import { HomePage } from "@/pages/home/HomePage";
import { NotFoundPage } from "@/pages/not-found/NotFoundPage";
import { KardexValoradoPage } from "@/pages/kardex-valorado/KardexValoradoPage";
import { InventoryPage } from "@/pages/inventory/InventoryPage";
import { LoginPage } from "@/pages/auth/LoginPage";
import { RegisterUserPage } from "@/pages/auth/RegisterUserPage";
import { ForgotPasswordPage } from "@/pages/auth/ForgotPasswordPage";
import { ResetPasswordPage } from "@/pages/auth/ResetPasswordPage";
import { ProfilePage } from "@/pages/profile/ProfilePage";
import { ProtectedRoute } from "@/app/router/guards/ProtectedRoute";
import { PublicOnlyRoute } from "@/app/router/guards/PublicOnlyRoute";
import { AdminRoute } from "@/app/router/guards/AdminRoute";

export function AppRouter() {
  return (
    <Routes>
      <Route element={<PublicOnlyRoute />}>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        <Route path="/reset-password" element={<ResetPasswordPage />} />
      </Route>

      <Route element={<ProtectedRoute />}>
        <Route element={<AppShell />}>
          <Route path="/" element={<HomePage />} />
          <Route path="/kardex-valorado" element={<KardexValoradoPage />} />
          <Route path="/perfil" element={<ProfilePage />} />
          <Route path="/inventario" element={<InventoryPage />} />
          <Route path="/compras" element={<NotFoundPage />} />
          <Route path="/vales" element={<NotFoundPage />} />
          <Route path="/entregas" element={<NotFoundPage />} />
          <Route path="/epp" element={<NotFoundPage />} />
          <Route path="/ajustes" element={<NotFoundPage />} />

          <Route element={<AdminRoute />}>
            <Route path="/usuarios/nuevo" element={<RegisterUserPage />} />
          </Route>

          <Route path="/404" element={<NotFoundPage />} />
          <Route path="*" element={<Navigate to="/404" replace />} />
        </Route>
      </Route>

      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  );
}
