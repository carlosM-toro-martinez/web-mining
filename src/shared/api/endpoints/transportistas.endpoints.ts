export const transportistasEndpoints = {
  base: "/api/transportistas",
  byId: (id: number | string) => `/api/transportistas/${id}`
} as const;
