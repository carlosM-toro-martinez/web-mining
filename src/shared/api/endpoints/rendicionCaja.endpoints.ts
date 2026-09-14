export const rendicionCajaEndpoints = {
  base: "/api/rendiciones-caja",
  byId: (id: string) => `/api/rendiciones-caja/${id}`,
  cerrar: (id: string) => `/api/rendiciones-caja/${id}/cerrar`,
  anular: (id: string) => `/api/rendiciones-caja/${id}/anular`
} as const;
