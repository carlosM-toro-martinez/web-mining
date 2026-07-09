export const eppEndpoints = {
  productos: "/api/epp/productos",
  productoHistorial: (productoId: number | string) => `/api/epp/productos/${productoId}/historial`,
  trabajadores: "/api/epp/trabajadores",
  trabajadorReporte: (usuarioId: number | string) => `/api/epp/trabajadores/${usuarioId}/reporte`,
  asignaciones: "/api/epp/asignaciones",
  asignacionById: (id: string) => `/api/epp/asignaciones/${id}`
} as const;
