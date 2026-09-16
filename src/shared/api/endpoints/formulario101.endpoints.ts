export const formulario101Endpoints = {
  base: "/api/formularios-101",
  byId: (id: string) => `/api/formularios-101/${id}`,
  vincular: (loteId: string) => `/api/formularios-101/vincular/${loteId}`,
  reutilizar: (id: string) => `/api/formularios-101/${id}/reutilizar`,
  anular: (id: string) => `/api/formularios-101/${id}/anular`,
  peticionEnviada: (id: string) => `/api/formularios-101/${id}/peticion-enviada`
} as const;
