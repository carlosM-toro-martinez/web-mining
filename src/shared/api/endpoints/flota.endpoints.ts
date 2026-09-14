export const flotaEndpoints = {
  vehiculos: "/api/vehiculos",
  vehiculoById: (id: number | string) => `/api/vehiculos/${id}`,
  vehiculoEstado: (id: number | string) => `/api/vehiculos/${id}/estado`,
  vehiculoHistorial: (id: number | string) => `/api/vehiculos/${id}/historial-estados`,
  choferes: "/api/choferes",
  choferById: (id: number | string) => `/api/choferes/${id}`
} as const;
