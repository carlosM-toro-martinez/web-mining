export const valesEndpoints = {
  base: "/api/vales",
  byId: (id: string) => `/api/vales/${id}`,
  aprobar: (id: string) => `/api/vales/${id}/aprobar`,
  entregar: (id: string) => `/api/vales/${id}/entregar`
} as const;
