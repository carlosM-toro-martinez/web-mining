export const solicitudesPagoEndpoints = {
  base: "/api/solicitudes-pago",
  byId: (id: string) => `/api/solicitudes-pago/${id}`,
  resumen: "/api/solicitudes-pago/resumen",
  defaults: "/api/solicitudes-pago/defaults",
  beneficiarios: "/api/solicitudes-pago/beneficiarios",
  factura: (id: string) => `/api/solicitudes-pago/${id}/factura`,
  entrega: (id: string) => `/api/solicitudes-pago/${id}/entrega`,
  pagar: (id: string) => `/api/solicitudes-pago/${id}/pagar`,
  pago: (id: string) => `/api/solicitudes-pago/${id}/pago`,
  anular: (id: string) => `/api/solicitudes-pago/${id}/anular`,
  firma: (id: string, tipo: string) => `/api/solicitudes-pago/${id}/firmas/${tipo}`
} as const;
