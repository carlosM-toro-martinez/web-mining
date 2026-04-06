export const exploracionesEndpoints = {
  muestras: "/api/exploraciones/muestras",
  muestrasTodas: "/api/exploraciones/muestras-todas",
  muestraById: (id: string) => `/api/exploraciones/muestras/${id}`,
  elementos: "/api/exploraciones/elementos",
  laboratorios: "/api/exploraciones/laboratorios"
} as const;
