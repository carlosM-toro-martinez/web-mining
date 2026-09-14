export const remitentesEndpoints = {
  base: "/api/remitentes",
  byId: (id: number | string) => `/api/remitentes/${id}`
} as const;
