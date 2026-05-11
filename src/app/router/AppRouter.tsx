import { Navigate, Route, Routes } from "react-router-dom";
import { AppShell } from "@/shared/layout/AppShell";
import { HomePage } from "@/pages/home/HomePage";
import { NotFoundPage } from "@/pages/not-found/NotFoundPage";
import { KardexValoradoPage } from "@/pages/kardex-valorado/KardexValoradoPage";
import { InventoryPage } from "@/pages/inventory/InventoryPage";
import { CategoriesPage } from "@/pages/inventory/CategoriesPage";
import { ProductsPage } from "@/pages/inventory/ProductsPage";
import { AccountingPage } from "@/pages/inventory/AccountingPage";
import { ValesPage } from "@/pages/inventory/ValesPage";
import { EntregasPage } from "@/pages/inventory/EntregasPage";
import { ComprasPage } from "@/pages/inventory/ComprasPage";
import { ProveedoresPage } from "@/pages/inventory/ProveedoresPage";
import { StockActualPage } from "@/pages/inventory/StockActualPage";
import { ReportesPage } from "@/pages/inventory/ReportesPage";
import { LoginPage } from "@/pages/auth/LoginPage";
import { RegisterUserPage } from "@/pages/auth/RegisterUserPage";
import { ForgotPasswordPage } from "@/pages/auth/ForgotPasswordPage";
import { ResetPasswordPage } from "@/pages/auth/ResetPasswordPage";
import { ProfilePage } from "@/pages/profile/ProfilePage";
import { MapPage } from "@/pages/map/MapPage";
import { ExploracionesPage } from "@/pages/exploraciones/ExploracionesPage";
import { ExploracionesReportesPage } from "@/pages/exploraciones/ExploracionesReportesPage";
import { ExploracionesElementosPage } from "@/pages/exploraciones/ExploracionesElementosPage";
import { ExploracionesDataRoomPage } from "@/pages/exploraciones/ExploracionesDataRoomPage";
import { ExploracionesSurfaceDataRoomPage } from "@/pages/exploraciones/ExploracionesSurfaceDataRoomPage";
import { ExploracionesFormsPage } from "@/pages/exploraciones/ExploracionesFormsPage";
import { EmployeePage } from "@/modules/employee/pages/EmployeePage";
import { ProtectedRoute } from "@/app/router/guards/ProtectedRoute";
import { PublicOnlyRoute } from "@/app/router/guards/PublicOnlyRoute";
import { AdminRoute } from "@/app/router/guards/AdminRoute";
import { AlmaceneroRoute } from "@/app/router/guards/AlmaceneroRoute";
import { WarehouseOpsRoute } from "@/app/router/guards/WarehouseOpsRoute";
import { useAuth } from "@/features/auth/context/AuthContext";

const IS_EXPLORACIONES_DOMAIN =
  typeof window !== "undefined" &&
  (window.location.hostname === "minmartesrl.com" ||
    window.location.hostname === "www.minmartesrl.com");

export function AppRouter() {
  const { user, isAuthenticated } = useAuth();
  const isVisitante = user?.role === "VISITANTE";

  if (IS_EXPLORACIONES_DOMAIN) {
    return (
      <Routes>
        <Route element={<PublicOnlyRoute />}>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/forgot-password" element={<ForgotPasswordPage />} />
          <Route path="/reset-password" element={<ResetPasswordPage />} />
        </Route>

        <Route element={<ProtectedRoute />}>
          <Route path="/" element={<Navigate to="/exploraciones-data-room" replace />} />
          <Route path="/exploraciones-data-room" element={<ExploracionesDataRoomPage />} />
          <Route path="/exploraciones-data-room/projects" element={<ExploracionesDataRoomPage />} />
          <Route path="/exploraciones-data-room/projects/:projectId" element={<ExploracionesDataRoomPage />} />
          <Route path="/exploraciones-data-room/projects/:projectId/zones/:zoneId" element={<ExploracionesDataRoomPage />} />
          <Route path="/exploraciones-data-room/projects/:projectId/zones/:zoneId/drillholes/:drillHoleId" element={<ExploracionesDataRoomPage />} />
          <Route path="/exploraciones-data-room/projects/:projectId/zones/:zoneId/drillholes/:drillHoleId/intervals/:intervalId" element={<ExploracionesDataRoomPage />} />
          <Route path="/exploraciones-data-room/projects/:projectId/zones/:zoneId/drillholes/:drillHoleId/intervals/:intervalId/assays/:assayId" element={<ExploracionesDataRoomPage />} />
          <Route path="/exploraciones-data-room/surface" element={<ExploracionesSurfaceDataRoomPage />} />
          <Route path="/exploraciones-data-room/surface/areas/:areaId" element={<ExploracionesSurfaceDataRoomPage />} />
          <Route path="/exploraciones-data-room/surface/areas/:areaId/levels/:levelId" element={<ExploracionesSurfaceDataRoomPage />} />
          <Route path="/exploraciones-data-room/surface/areas/:areaId/levels/:levelId/labors/:laborId" element={<ExploracionesSurfaceDataRoomPage />} />
          <Route path="/exploraciones-data-room/surface/areas/:areaId/levels/:levelId/labors/:laborId/samples/:sampleId" element={<ExploracionesSurfaceDataRoomPage />} />

          <Route element={<AdminRoute />}>
            <Route path="/exploraciones-data-room/forms" element={<ExploracionesFormsPage />} />
          </Route>

          <Route path="*" element={<Navigate to="/exploraciones-data-room" replace />} />
        </Route>
      </Routes>
    );
  }

  if (isAuthenticated && isVisitante) {
    return (
      <Routes>
        <Route element={<PublicOnlyRoute />}>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/forgot-password" element={<ForgotPasswordPage />} />
          <Route path="/reset-password" element={<ResetPasswordPage />} />
        </Route>

        <Route element={<ProtectedRoute />}>
          <Route path="/" element={<Navigate to="/exploraciones-data-room" replace />} />
          <Route path="/exploraciones-data-room" element={<ExploracionesDataRoomPage />} />
          <Route path="/exploraciones-data-room/projects" element={<ExploracionesDataRoomPage />} />
          <Route path="/exploraciones-data-room/projects/:projectId" element={<ExploracionesDataRoomPage />} />
          <Route path="/exploraciones-data-room/projects/:projectId/zones/:zoneId" element={<ExploracionesDataRoomPage />} />
          <Route path="/exploraciones-data-room/projects/:projectId/zones/:zoneId/drillholes/:drillHoleId" element={<ExploracionesDataRoomPage />} />
          <Route path="/exploraciones-data-room/projects/:projectId/zones/:zoneId/drillholes/:drillHoleId/intervals/:intervalId" element={<ExploracionesDataRoomPage />} />
          <Route path="/exploraciones-data-room/projects/:projectId/zones/:zoneId/drillholes/:drillHoleId/intervals/:intervalId/assays/:assayId" element={<ExploracionesDataRoomPage />} />
          <Route path="/exploraciones-data-room/surface" element={<ExploracionesSurfaceDataRoomPage />} />
          <Route path="/exploraciones-data-room/surface/areas/:areaId" element={<ExploracionesSurfaceDataRoomPage />} />
          <Route path="/exploraciones-data-room/surface/areas/:areaId/levels/:levelId" element={<ExploracionesSurfaceDataRoomPage />} />
          <Route path="/exploraciones-data-room/surface/areas/:areaId/levels/:levelId/labors/:laborId" element={<ExploracionesSurfaceDataRoomPage />} />
          <Route path="/exploraciones-data-room/surface/areas/:areaId/levels/:levelId/labors/:laborId/samples/:sampleId" element={<ExploracionesSurfaceDataRoomPage />} />
          <Route path="*" element={<Navigate to="/exploraciones-data-room" replace />} />
        </Route>
      </Routes>
    );
  }

  return (
    <Routes>
      <Route element={<PublicOnlyRoute />}>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        <Route path={'/forgot-password"'} element={<ForgotPasswordPage />} />
        <Route path="/reset-password" element={<ResetPasswordPage />} />
        <Route path={'/reset-password"'} element={<ResetPasswordPage />} />
      </Route>

      <Route element={<ProtectedRoute />}>
        <Route path="/exploraciones-data-room" element={<ExploracionesDataRoomPage />} />
        <Route path="/exploraciones-data-room/projects" element={<ExploracionesDataRoomPage />} />
        <Route path="/exploraciones-data-room/projects/:projectId" element={<ExploracionesDataRoomPage />} />
        <Route path="/exploraciones-data-room/projects/:projectId/zones/:zoneId" element={<ExploracionesDataRoomPage />} />
        <Route path="/exploraciones-data-room/projects/:projectId/zones/:zoneId/drillholes/:drillHoleId" element={<ExploracionesDataRoomPage />} />
        <Route path="/exploraciones-data-room/projects/:projectId/zones/:zoneId/drillholes/:drillHoleId/intervals/:intervalId" element={<ExploracionesDataRoomPage />} />
        <Route path="/exploraciones-data-room/projects/:projectId/zones/:zoneId/drillholes/:drillHoleId/intervals/:intervalId/assays/:assayId" element={<ExploracionesDataRoomPage />} />
        <Route path="/exploraciones-data-room/surface" element={<ExploracionesSurfaceDataRoomPage />} />
        <Route path="/exploraciones-data-room/surface/areas/:areaId" element={<ExploracionesSurfaceDataRoomPage />} />
        <Route path="/exploraciones-data-room/surface/areas/:areaId/levels/:levelId" element={<ExploracionesSurfaceDataRoomPage />} />
        <Route path="/exploraciones-data-room/surface/areas/:areaId/levels/:levelId/labors/:laborId" element={<ExploracionesSurfaceDataRoomPage />} />
        <Route path="/exploraciones-data-room/surface/areas/:areaId/levels/:levelId/labors/:laborId/samples/:sampleId" element={<ExploracionesSurfaceDataRoomPage />} />
        <Route element={<AdminRoute />}>
          <Route path="/exploraciones-data-room/forms" element={<ExploracionesFormsPage />} />
        </Route>

        <Route element={<AppShell />}>
          <Route path="/" element={<HomePage />} />
          <Route path="/mapa" element={<MapPage />} />
          <Route path="/exploraciones" element={<ExploracionesPage />} />
          <Route path="/personal" element={<EmployeePage />} />
          <Route path="/exploraciones/elementos" element={<ExploracionesElementosPage />} />
          <Route path="/exploraciones/reportes" element={<ExploracionesReportesPage />} />
          <Route path="/kardex-valorado" element={<KardexValoradoPage />} />
          <Route path="/perfil" element={<ProfilePage />} />
          <Route path="/vales" element={<Navigate to="/inventario/vales" replace />} />
          <Route path="/compras" element={<Navigate to="/inventario/compras" replace />} />
          <Route element={<AlmaceneroRoute />}>
            <Route path="/inventario" element={<InventoryPage />} />
            <Route path="/inventario/vales" element={<ValesPage />} />
            <Route path="/inventario/compras" element={<ComprasPage />} />
            <Route path="/inventario/categorias" element={<CategoriesPage />} />
            <Route path="/inventario/productos" element={<ProductsPage />} />
            <Route path="/inventario/stock" element={<StockActualPage />} />
            <Route
              path="/inventario/reportes"
              element={<Navigate to="/inventario/reportes/bin-card" replace />}
            />
            <Route path="/inventario/reportes/:tipo" element={<ReportesPage />} />
            <Route path="/inventario/proveedores" element={<ProveedoresPage />} />
            <Route element={<WarehouseOpsRoute />}>
              <Route path="/inventario/entregas" element={<EntregasPage />} />
              <Route
                path="/almacen/salidas"
                element={<Navigate to="/inventario/entregas" replace />}
              />
            </Route>
            <Route path="/inventario/contabilidad" element={<AccountingPage />} />
          </Route>
          <Route path="/entregas" element={<Navigate to="/inventario/entregas" replace />} />
          <Route path="/epp" element={<NotFoundPage />} />
          <Route path="/ajustes" element={<NotFoundPage />} />

          <Route element={<AdminRoute />}>
            <Route path="/trabajadores" element={<RegisterUserPage />} />
            <Route path="/usuarios/nuevo" element={<Navigate to="/trabajadores" replace />} />
          </Route>

          <Route path="/404" element={<NotFoundPage />} />
          <Route path="*" element={<Navigate to="/404" replace />} />
        </Route>
      </Route>

      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  );
}
