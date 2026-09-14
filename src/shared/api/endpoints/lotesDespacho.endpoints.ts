export const lotesDespachoEndpoints = {
  base: "/api/lotes-despacho",
  byId: (id: string) => `/api/lotes-despacho/${id}`,
  regularizarF101: (id: string) => `/api/lotes-despacho/${id}/regularizar-f101`,
  estado: (id: string) => `/api/lotes-despacho/${id}/estado`,
  pesaje: (id: string) => `/api/lotes-despacho/${id}/pesaje`,
  anular: (id: string) => `/api/lotes-despacho/${id}/anular`
} as const;
