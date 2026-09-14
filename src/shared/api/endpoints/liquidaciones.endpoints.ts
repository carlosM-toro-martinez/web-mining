export const liquidacionesEndpoints = {
  base: "/api/liquidaciones",
  byId: (id: string) => `/api/liquidaciones/${id}`,
  itemsConcepto: (id: string) => `/api/liquidaciones/${id}/items-concepto`,
  itemConceptoById: (id: string, itemId: string) => `/api/liquidaciones/${id}/items-concepto/${itemId}`,
  cerrar: (id: string) => `/api/liquidaciones/${id}/cerrar`,
  anular: (id: string) => `/api/liquidaciones/${id}/anular`
} as const;
