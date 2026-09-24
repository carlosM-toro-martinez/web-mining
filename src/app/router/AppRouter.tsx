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
import { ValesHistoricosPage } from "@/pages/inventory/ValesHistoricosPage";
import { EntregasPage } from "@/pages/inventory/EntregasPage";
import { ComprasPage } from "@/pages/inventory/ComprasPage";
import { ProveedoresPage } from "@/pages/inventory/ProveedoresPage";
import { StockActualPage } from "@/pages/inventory/StockActualPage";
import { ReportesPage } from "@/pages/inventory/ReportesPage";
import { PedidosPage } from "@/pages/inventory/PedidosPage";
import { InventarioImportPage } from "@/pages/inventory/InventarioImportPage";
import { StockInicialEditorPage } from "@/pages/inventory/StockInicialEditorPage";
import { InventoryOfflineMonitorPage } from "@/pages/inventory/InventoryOfflineMonitorPage";
import { AjustesPage } from "@/pages/inventory/AjustesPage";
import { EppPage } from "@/pages/epp/EppPage";
import { LoginPage } from "@/pages/auth/LoginPage";
import { RegisterUserPage } from "@/pages/auth/RegisterUserPage";
import { ForgotPasswordPage } from "@/pages/auth/ForgotPasswordPage";
import { ResetPasswordPage } from "@/pages/auth/ResetPasswordPage";
import { ProfilePage } from "@/pages/profile/ProfilePage";
import { MapPage } from "@/pages/map/MapPage";
import { AmbientalPage } from "@/pages/ambiental/AmbientalPage";
import { LogisticaPage } from "@/pages/logistica/LogisticaPage";
import { ParametrosLogisticaPage } from "@/pages/logistica/ParametrosLogisticaPage";
import { FlotaPage } from "@/pages/logistica/FlotaPage";
import { RemitentesPage } from "@/pages/logistica/RemitentesPage";
import { LotesDespachoPage } from "@/pages/logistica/LotesDespachoPage";
import { LiquidacionesPage } from "@/pages/logistica/LiquidacionesPage";
import { LogisticaReportesPage } from "@/pages/logistica/LogisticaReportesPage";
import { CajaChicaPage } from "@/pages/cajaChica/CajaChicaPage";
import { ParametrosCajaChicaPage } from "@/pages/cajaChica/ParametrosCajaChicaPage";
import { GastosCajaPage } from "@/pages/cajaChica/GastosCajaPage";
import { SaldosCajaPage } from "@/pages/cajaChica/SaldosCajaPage";
import { PresupuestoCajaPage } from "@/pages/cajaChica/PresupuestoCajaPage";
import { RendicionesCajaPage } from "@/pages/cajaChica/RendicionesCajaPage";
import { ReportesCajaChicaPage } from "@/pages/cajaChica/ReportesCajaChicaPage";
import { EmployeePage } from "@/modules/employee/pages/EmployeePage";
import { PersonalHomePage } from "@/modules/employee/pages/PersonalHomePage";
import { PersonalReportsPage } from "@/modules/employee/pages/PersonalReportsPage";
import { PersonalSchedulesPage } from "@/modules/employee/pages/PersonalSchedulesPage";
import { PersonalAssignmentsPage } from "@/modules/employee/pages/PersonalAssignmentsPage";
import { PersonalAbsencesPage } from "@/modules/employee/pages/PersonalAbsencesPage";
import { PersonalReportPage } from "@/modules/employee/pages/PersonalReportPage";
import { ProtectedRoute } from "@/app/router/guards/ProtectedRoute";
import { PublicOnlyRoute } from "@/app/router/guards/PublicOnlyRoute";
import { AdminRoute } from "@/app/router/guards/AdminRoute";
import { AlmaceneroRoute } from "@/app/router/guards/AlmaceneroRoute";
import { WarehouseOpsRoute } from "@/app/router/guards/WarehouseOpsRoute";
import { LogisticaRoute } from "@/app/router/guards/LogisticaRoute";
import { CajaChicaRoute } from "@/app/router/guards/CajaChicaRoute";
import { PersonalRoute } from "@/app/router/guards/PersonalRoute";
import { EppRoute } from "@/app/router/guards/EppRoute";
import { AmbientalRoute } from "@/app/router/guards/AmbientalRoute";

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
          <Route path="/mapa" element={<MapPage />} />
          <Route element={<PersonalRoute />}>
            <Route path="/personal" element={<PersonalHomePage />} />
            <Route path="/personal/empleados" element={<EmployeePage />} />
            <Route path="/personal/reportes" element={<PersonalReportsPage />} />
            <Route path="/personal/horarios" element={<PersonalSchedulesPage />} />
            <Route path="/personal/asignaciones" element={<PersonalAssignmentsPage />} />
            <Route path="/personal/ausencias" element={<PersonalAbsencesPage />} />
            <Route path="/personal/reporte" element={<PersonalReportPage />} />
          </Route>
          <Route path="/kardex-valorado" element={<KardexValoradoPage />} />
          <Route path="/perfil" element={<ProfilePage />} />
          <Route path="/vales" element={<Navigate to="/inventario/vales" replace />} />
          <Route path="/compras" element={<Navigate to="/inventario/compras" replace />} />

          <Route element={<AlmaceneroRoute />}>
            <Route path="/inventario" element={<InventoryPage />} />
            <Route path="/inventario/vales" element={<ValesPage />} />
            <Route path="/inventario/vales-historicos" element={<ValesHistoricosPage />} />
            <Route path="/inventario/compras" element={<ComprasPage />} />
            <Route path="/inventario/pedidos" element={<PedidosPage />} />
            <Route path="/inventario/importacion" element={<InventarioImportPage />} />
            <Route path="/inventario/stock-inicial-editar" element={<StockInicialEditorPage />} />
            <Route path="/inventario/categorias" element={<CategoriesPage />} />
            <Route path="/inventario/productos" element={<ProductsPage />} />
            <Route path="/inventario/stock" element={<StockActualPage />} />
            <Route
              path="/inventario/reportes"
              element={<Navigate to="/inventario/reportes/bin-card" replace />}
            />
            <Route path="/inventario/reportes/:tipo" element={<ReportesPage />} />
            <Route path="/inventario/proveedores" element={<ProveedoresPage />} />
            <Route path="/inventario/ajustes" element={<AjustesPage />} />
            <Route element={<WarehouseOpsRoute />}>
              <Route path="/inventario/entregas" element={<EntregasPage />} />
              <Route
                path="/almacen/salidas"
                element={<Navigate to="/inventario/entregas" replace />}
              />
            </Route>
            <Route path="/inventario/contabilidad" element={<AccountingPage />} />
            <Route element={<AdminRoute />}>
              <Route path="/inventario/offline-monitor" element={<InventoryOfflineMonitorPage />} />
            </Route>
          </Route>

          <Route element={<LogisticaRoute />}>
            <Route path="/logistica" element={<LogisticaPage />} />
            <Route path="/logistica/parametros" element={<ParametrosLogisticaPage />} />
            <Route path="/logistica/flota" element={<FlotaPage />} />
            <Route path="/logistica/remitentes" element={<RemitentesPage />} />
            <Route path="/logistica/lotes" element={<LotesDespachoPage />} />
            <Route path="/logistica/liquidaciones" element={<LiquidacionesPage />} />
            <Route path="/logistica/reportes" element={<LogisticaReportesPage />} />
          </Route>

          <Route element={<CajaChicaRoute />}>
            <Route path="/caja-chica" element={<CajaChicaPage />} />
            <Route path="/caja-chica/parametros" element={<ParametrosCajaChicaPage />} />
            <Route path="/caja-chica/gastos" element={<GastosCajaPage />} />
            <Route path="/caja-chica/saldos" element={<SaldosCajaPage />} />
            <Route path="/caja-chica/presupuesto" element={<PresupuestoCajaPage />} />
            <Route path="/caja-chica/rendiciones" element={<RendicionesCajaPage />} />
            <Route path="/caja-chica/reportes" element={<ReportesCajaChicaPage />} />
          </Route>

          <Route path="/entregas" element={<Navigate to="/inventario/entregas" replace />} />
          <Route element={<EppRoute />}>
            <Route path="/epp" element={<EppPage />} />
          </Route>
          <Route element={<AmbientalRoute />}>
            <Route path="/ambiental" element={<AmbientalPage />} />
          </Route>
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
