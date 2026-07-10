export const comprasEndpoints = {
  base: "/api/compras",
  byId: (id: string) => `/api/compras/${id}`,
  recibir: (id: string) => `/api/compras/${id}/recibir`,
  itemPrecio: (compraId: string, itemId: string) => `/api/compras/${compraId}/items/${itemId}/precio`,
  anular: (id: string) => `/api/compras/${id}/anular`,
  anulacionesHistorial: "/api/compras/anulaciones/historial"
} as const;
