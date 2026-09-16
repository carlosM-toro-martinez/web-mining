export const lotesDespachoEndpoints = {
  base: "/api/lotes-despacho",
  byId: (id: string) => `/api/lotes-despacho/${id}`,
  estado: (id: string) => `/api/lotes-despacho/${id}/estado`,
  pesaje: (id: string) => `/api/lotes-despacho/${id}/pesaje`,
  anular: (id: string) => `/api/lotes-despacho/${id}/anular`,
  transbordo: (id: string) => `/api/lotes-despacho/${id}/transbordo`
} as const;
