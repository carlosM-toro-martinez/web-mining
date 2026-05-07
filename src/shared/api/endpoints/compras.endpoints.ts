export const comprasEndpoints = {
  base: "/api/compras",
  byId: (id: string) => `/api/compras/${id}`,
  recibir: (id: string) => `/api/compras/${id}/recibir`
} as const;
