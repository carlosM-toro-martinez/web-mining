export const parametrosLogisticaEndpoints = {
  municipiosOrigen: "/api/municipios-origen",
  municipioOrigenById: (id: number | string) => `/api/municipios-origen/${id}`,
  tiposMineral: "/api/tipos-mineral",
  tipoMineralById: (id: number | string) => `/api/tipos-mineral/${id}`,
  ingenios: "/api/ingenios",
  ingenioById: (id: number | string) => `/api/ingenios/${id}`,
  conceptosLiquidacion: "/api/conceptos-liquidacion",
  conceptoLiquidacionById: (id: number | string) => `/api/conceptos-liquidacion/${id}`,
  alicuotasRegalia: "/api/alicuotas-regalia",
  tarifasLiquidacion: "/api/tarifas-liquidacion"
} as const;
