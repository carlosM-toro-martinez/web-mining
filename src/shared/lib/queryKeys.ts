export const queryKeys = {
  systemStatus: {
    all: ["system-status"] as const,
    detail: () => [...queryKeys.systemStatus.all, "detail"] as const
  },
  kardexValorado: {
    all: ["kardex-valorado"] as const,
    detail: () => [...queryKeys.kardexValorado.all, "detail"] as const
  },
  categoriasInventario: {
    all: ["categorias-inventario"] as const,
    tree: () => [...queryKeys.categoriasInventario.all, "tree"] as const
  },
  productos: {
    all: ["productos"] as const,
    list: (params: {
      page: number;
      limit: number;
      search?: string;
      grupoId?: number;
      subgrupoId?: number;
      cuentaId?: number;
      sinCuenta?: boolean;
    }) => [...queryKeys.productos.all, "list", params] as const
  },
  auth: {
    all: ["auth"] as const,
    users: () => [...queryKeys.auth.all, "users"] as const
  },
  contabilidad: {
    all: ["contabilidad"] as const,
    centrosCosto: () => [...queryKeys.contabilidad.all, "centros-costo"] as const,
    funcionesGasto: () => [...queryKeys.contabilidad.all, "funciones-gasto"] as const,
    sectores: () => [...queryKeys.contabilidad.all, "sectores"] as const,
    cuentas: () => [...queryKeys.contabilidad.all, "cuentas"] as const
  },
  vales: {
    all: ["vales"] as const,
    list: (params?: {
      estado?: string;
      solicitanteId?: number;
      anio?: number;
      mes?: number;
      fechaInicio?: string;
      fechaFin?: string;
      sinPaginar?: boolean;
      page?: number;
      limit?: number;
    }) =>
      [...queryKeys.vales.all, "list", params ?? {}] as const,
    detail: (id: string) => [...queryKeys.vales.all, "detail", id] as const,
    historialSolicitante: (userId: number, page: number, limit: number) =>
      [...queryKeys.vales.all, "historial-solicitante", userId, page, limit] as const
  },
  compras: {
    all: ["compras"] as const,
    list: (params: {
      estado?: string;
      proveedorId?: number;
      anio?: number;
      mes?: number;
      fechaInicio?: string;
      fechaFin?: string;
      sinPaginar?: boolean;
      page: number;
      limit: number;
    }) =>
      [...queryKeys.compras.all, "list", params] as const,
    detail: (id: string) => [...queryKeys.compras.all, "detail", id] as const
  },
  proveedores: {
    all: ["proveedores"] as const,
    list: (params: { page: number; limit: number; search?: string }) =>
      [...queryKeys.proveedores.all, "list", params] as const,
    detail: (id: number) => [...queryKeys.proveedores.all, "detail", id] as const
  },
  reportes: {
    all: ["reportes"] as const,
    binCard: (
      params: {
        page: number;
        limit: number;
        productoId?: number;
        fechaInicio?: string;
        fechaFin?: string;
        fecha?: string;
      },
      fetchAll: boolean
    ) => [...queryKeys.reportes.all, "bin-card", params, fetchAll] as const,
    binCardValorado: (
      params: {
        page: number;
        limit: number;
        productoId?: number;
        fechaInicio?: string;
        fechaFin?: string;
        fecha?: string;
      },
      fetchAll: boolean
    ) => [...queryKeys.reportes.all, "bin-card-valorado", params, fetchAll] as const,
    stock: (params: { page: number; limit: number; categoriaId?: number }, fetchAll: boolean) =>
      [...queryKeys.reportes.all, "stock", params, fetchAll] as const,
    vales: (
      params: {
        page: number;
        limit: number;
        estado?: string;
        solicitanteId?: number;
        fechaInicio?: string;
        fechaFin?: string;
      },
      fetchAll: boolean
    ) => [...queryKeys.reportes.all, "vales", params, fetchAll] as const,
    compras: (
      params: {
        page: number;
        limit: number;
        estado?: string;
        proveedorId?: number;
        fechaInicio?: string;
        fechaFin?: string;
      },
      fetchAll: boolean
    ) => [...queryKeys.reportes.all, "compras", params, fetchAll] as const,
    comprasDetalle: (
      params: {
        page: number;
        limit: number;
        estado?: string;
        proveedorId?: number;
        fechaInicio?: string;
        fechaFin?: string;
        sinPaginar?: boolean;
      }
    ) => [...queryKeys.reportes.all, "compras-detalle", params] as const,
    comprasProveedor: (
      params: {
        page: number;
        limit: number;
        estado?: string;
        proveedorId?: number;
        fechaInicio?: string;
        fechaFin?: string;
        sinPaginar?: boolean;
      }
    ) => [...queryKeys.reportes.all, "compras-proveedor", params] as const
  },
  pedidos: {
    all: ["pedidos"] as const,
    list: (params: { estado?: string; proveedorId?: number; page: number; limit: number }) =>
      [...queryKeys.pedidos.all, "list", params] as const,
    detail: (id: string) => [...queryKeys.pedidos.all, "detail", id] as const
  },
  movimientos: {
    all: ["movimientos"] as const
  },
  employees: {
    all: ["employees"] as const,
    list: () => [...queryKeys.employees.all, "list"] as const,
    syncQueue: () => [...queryKeys.employees.all, "sync-queue"] as const,
    cuentas: () => [...queryKeys.contabilidad.all, "cuentas"] as const
  },
  parametrosLogistica: {
    all: ["parametros-logistica"] as const,
    municipiosOrigen: () => [...queryKeys.parametrosLogistica.all, "municipios-origen"] as const,
    tiposMineral: () => [...queryKeys.parametrosLogistica.all, "tipos-mineral"] as const,
    ingenios: () => [...queryKeys.parametrosLogistica.all, "ingenios"] as const,
    conceptosLiquidacion: () => [...queryKeys.parametrosLogistica.all, "conceptos-liquidacion"] as const,
    alicuotasRegalia: () => [...queryKeys.parametrosLogistica.all, "alicuotas-regalia"] as const,
    tarifasLiquidacion: () => [...queryKeys.parametrosLogistica.all, "tarifas-liquidacion"] as const
  },
  remitentes: {
    all: ["remitentes"] as const
  },
  flota: {
    all: ["flota"] as const,
    vehiculos: () => [...queryKeys.flota.all, "vehiculos"] as const,
    vehiculoHistorial: (id: number) => [...queryKeys.flota.all, "vehiculo-historial", id] as const,
    choferes: () => [...queryKeys.flota.all, "choferes"] as const
  },
  lotesDespacho: {
    all: ["lotes-despacho"] as const,
    list: (params: { estadoLote?: string; estadoFormulario101?: string; page?: number; limit?: number }) =>
      [...queryKeys.lotesDespacho.all, "list", params] as const,
    detail: (id: string) => [...queryKeys.lotesDespacho.all, "detail", id] as const
  },
  liquidaciones: {
    all: ["liquidaciones"] as const,
    list: (params: { remitenteId?: number; estado?: string }) =>
      [...queryKeys.liquidaciones.all, "list", params] as const,
    detail: (id: string) => [...queryKeys.liquidaciones.all, "detail", id] as const
  },
  logisticaReportes: {
    all: ["logistica-reportes"] as const,
    cuadroMensual: (params: { municipioId: number; anio: number; mes: number }) =>
      [...queryKeys.logisticaReportes.all, "cuadro-mensual", params] as const,
    cierres: (municipioId?: number) => [...queryKeys.logisticaReportes.all, "cierres", municipioId] as const
  },
  parametrosCajaChica: {
    all: ["parametros-caja-chica"] as const,
    cajas: () => [...queryKeys.parametrosCajaChica.all, "cajas"] as const,
    centrosCosto: () => [...queryKeys.parametrosCajaChica.all, "centros-costo"] as const,
    funcionesGasto: () => [...queryKeys.parametrosCajaChica.all, "funciones-gasto"] as const,
    cuentasContables: () => [...queryKeys.parametrosCajaChica.all, "cuentas-contables"] as const,
    conceptosRetencion: () => [...queryKeys.parametrosCajaChica.all, "conceptos-retencion"] as const
  },
  gastoCaja: {
    all: ["gasto-caja"] as const,
    list: (params: { cajaId?: number; estado?: string; page?: number; limit?: number }) =>
      [...queryKeys.gastoCaja.all, "list", params] as const,
    movimientosFondo: (cajaId?: number) => [...queryKeys.gastoCaja.all, "movimientos-fondo", cajaId] as const
  },
  rendicionCaja: {
    all: ["rendicion-caja"] as const,
    list: (params: { cajaId?: number; estado?: string }) => [...queryKeys.rendicionCaja.all, "list", params] as const,
    detail: (id: string) => [...queryKeys.rendicionCaja.all, "detail", id] as const
  },
  reportesCajaChica: {
    all: ["reportes-caja-chica"] as const,
    retenciones: (params: { cajaId?: number; fechaInicio?: string; fechaFin?: string }) =>
      [...queryKeys.reportesCajaChica.all, "retenciones", params] as const,
    noDeducibles: (params: { cajaId?: number; fechaInicio?: string; fechaFin?: string }) =>
      [...queryKeys.reportesCajaChica.all, "no-deducibles", params] as const,
    desglose: (params: { cajaId?: number; fechaInicio?: string; fechaFin?: string }) =>
      [...queryKeys.reportesCajaChica.all, "desglose", params] as const,
    estadoCuenta: (cajaId?: number) => [...queryKeys.reportesCajaChica.all, "estado-cuenta", cajaId] as const
  }
};
