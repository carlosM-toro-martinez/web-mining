export const contabilidadEndpoints = {
  centrosCosto: "/api/centros-costo",
  centroCostoById: (id: number | string) => `/api/centros-costo/${id}`,
  funcionesGasto: "/api/funciones-gasto",
  funcionGastoById: (id: number | string) => `/api/funciones-gasto/${id}`,
  cuentas: "/api/cuentas",
  cuentaById: (id: number | string) => `/api/cuentas/${id}`,
  cuentaMovimientos: (id: number | string) => `/api/cuentas/${id}/movimientos`,
  sectores: "/api/contabilidad/sectores",
  sectorById: (id: number | string) => `/api/contabilidad/sectores/${id}`,
  salidas: "/api/movimientos/salidas"
} as const;
