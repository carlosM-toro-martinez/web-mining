export const gastoCajaEndpoints = {
  gastos: "/api/gastos-caja",
  gastoById: (id: string) => `/api/gastos-caja/${id}`,
  gastoAnular: (id: string) => `/api/gastos-caja/${id}/anular`,
  movimientosFondo: "/api/movimientos-fondo-caja"
} as const;
