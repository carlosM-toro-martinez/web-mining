export const cajaChicaEndpoints = {
  cajas: "/api/cajas-chicas",
  cajaById: (id: number | string) => `/api/cajas-chicas/${id}`,
  centrosCosto: "/api/centros-costo-caja",
  centroCostoById: (id: number | string) => `/api/centros-costo-caja/${id}`,
  funcionesGasto: "/api/funciones-gasto-caja",
  funcionGastoById: (id: number | string) => `/api/funciones-gasto-caja/${id}`,
  cuentasContables: "/api/cuentas-contables-caja",
  cuentaContableById: (id: number | string) => `/api/cuentas-contables-caja/${id}`,
  conceptosRetencion: "/api/conceptos-retencion-caja",
  conceptoRetencionById: (id: number | string) => `/api/conceptos-retencion-caja/${id}`,
  cuentasBancarias: "/api/cuentas-bancarias-caja",
  cuentaBancariaById: (id: number | string) => `/api/cuentas-bancarias-caja/${id}`,
  partidasPresupuesto: "/api/partidas-presupuesto-caja",
  partidaPresupuestoById: (id: number | string) => `/api/partidas-presupuesto-caja/${id}`,
  movimientosBanco: "/api/movimientos-banco-caja"
} as const;
