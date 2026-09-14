export const reportesCajaChicaEndpoints = {
  retenciones: "/api/reportes-caja-chica/retenciones",
  noDeducibles: "/api/reportes-caja-chica/no-deducibles",
  desglose: "/api/reportes-caja-chica/desglose",
  estadoCuenta: "/api/reportes-caja-chica/estado-cuenta",
  reporteRendicion: (rendicionId: string) => `/api/reportes-caja-chica/rendicion/${rendicionId}`,
  comprobanteDiario: (rendicionId: string) => `/api/reportes-caja-chica/rendicion/${rendicionId}/comprobante-diario`
} as const;
