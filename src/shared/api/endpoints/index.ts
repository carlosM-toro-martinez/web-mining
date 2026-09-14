import { systemStatusEndpoints } from "@/shared/api/endpoints/systemStatus.endpoints";
import { kardexValoradoEndpoints } from "@/shared/api/endpoints/kardexValorado.endpoints";
import { authEndpoints } from "@/shared/api/endpoints/auth.endpoints";
import { categoriasInventarioEndpoints } from "@/shared/api/endpoints/categoriasInventario.endpoints";
import { productosEndpoints } from "@/shared/api/endpoints/productos.endpoints";
import { contabilidadEndpoints } from "@/shared/api/endpoints/contabilidad.endpoints";
import { valesEndpoints } from "@/shared/api/endpoints/vales.endpoints";
import { movimientosEndpoints } from "@/shared/api/endpoints/movimientos.endpoints";
import { comprasEndpoints } from "@/shared/api/endpoints/compras.endpoints";
import { proveedoresEndpoints } from "@/shared/api/endpoints/proveedores.endpoints";
import { reportesEndpoints } from "@/shared/api/endpoints/reportes.endpoints";
import { pedidosEndpoints } from "@/shared/api/endpoints/pedidos.endpoints";
import { inventarioImportEndpoints } from "@/shared/api/endpoints/inventarioImport.endpoints";
import { eppEndpoints } from "@/shared/api/endpoints/epp.endpoints";
import { ambientalEndpoints } from "@/shared/api/endpoints/ambiental.endpoints";
import { parametrosLogisticaEndpoints } from "@/shared/api/endpoints/parametrosLogistica.endpoints";
import { remitentesEndpoints } from "@/shared/api/endpoints/remitentes.endpoints";
import { flotaEndpoints } from "@/shared/api/endpoints/flota.endpoints";
import { lotesDespachoEndpoints } from "@/shared/api/endpoints/lotesDespacho.endpoints";
import { liquidacionesEndpoints } from "@/shared/api/endpoints/liquidaciones.endpoints";
import { logisticaReportesEndpoints } from "@/shared/api/endpoints/logisticaReportes.endpoints";
import { cajaChicaEndpoints } from "@/shared/api/endpoints/cajaChica.endpoints";
import { gastoCajaEndpoints } from "@/shared/api/endpoints/gastoCaja.endpoints";
import { rendicionCajaEndpoints } from "@/shared/api/endpoints/rendicionCaja.endpoints";
import { reportesCajaChicaEndpoints } from "@/shared/api/endpoints/reportesCajaChica.endpoints";

export const apiEndpoints = {
  auth: authEndpoints,
  systemStatus: systemStatusEndpoints,
  kardexValorado: kardexValoradoEndpoints,
  categoriasInventario: categoriasInventarioEndpoints,
  productos: productosEndpoints,
  contabilidad: contabilidadEndpoints,
  vales: valesEndpoints,
  movimientos: movimientosEndpoints,
  compras: comprasEndpoints,
  proveedores: proveedoresEndpoints,
  reportes: reportesEndpoints,
  pedidos: pedidosEndpoints,
  inventarioImport: inventarioImportEndpoints,
  epp: eppEndpoints,
  ambiental: ambientalEndpoints,
  parametrosLogistica: parametrosLogisticaEndpoints,
  remitentes: remitentesEndpoints,
  flota: flotaEndpoints,
  lotesDespacho: lotesDespachoEndpoints,
  liquidaciones: liquidacionesEndpoints,
  logisticaReportes: logisticaReportesEndpoints,
  cajaChica: cajaChicaEndpoints,
  gastoCaja: gastoCajaEndpoints,
  rendicionCaja: rendicionCajaEndpoints,
  reportesCajaChica: reportesCajaChicaEndpoints
} as const;
