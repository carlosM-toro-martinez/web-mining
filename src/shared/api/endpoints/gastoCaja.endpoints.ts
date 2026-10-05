export const gastoCajaEndpoints = {
  gastos: "/api/gastos-caja",
  gastoById: (id: string) => `/api/gastos-caja/${id}`,
  gastoAnular: (id: string) => `/api/gastos-caja/${id}/anular`,
  importarExcel: "/api/gastos-caja/importar-excel",
  clasificar: "/api/gastos-caja/clasificar",
  movimientosFondo: "/api/movimientos-fondo-caja"
} as const;
