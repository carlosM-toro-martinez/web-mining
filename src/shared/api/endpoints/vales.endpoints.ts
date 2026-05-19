export const valesEndpoints = {
  base: "/api/vales",
  byId: (id: string) => `/api/vales/${id}`,
  aprobar: (id: string) => `/api/vales/${id}/aprobar`,
  rechazar: (id: string) => `/api/vales/${id}/rechazar`,
  entregar: (id: string) => `/api/vales/${id}/entregar`,
  historialSolicitante: (userId: number | string) => `/api/vales/solicitante/${userId}`,
  resumenSolicitantes: "/api/vales/resumen-solicitantes",
  productosPorUsuario: (userId: number | string) => `/api/vales/usuario/${userId}/productos`
} as const;
