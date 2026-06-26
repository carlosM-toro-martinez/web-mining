import { describe, expect, it } from "vitest";
import {
  comprasProveedorReportResponseSchema,
  comprasReportResponseSchema,
  entradasAlmacenReportResponseSchema,
  salidasAlmacenReportResponseSchema,
  stockReportResponseSchema,
  valesReportResponseSchema
} from "./reportes.schema";

describe("reportes.schema", () => {
  it("parses stock report with reserved and available quantities", () => {
    const parsed = stockReportResponseSchema.parse({
      success: true,
      data: [
        {
          productoId: 12,
          codigo: "EPP-001",
          nombre: "Guantes",
          unidad: "par",
          categoria: "EPP",
          cantidad: 50,
          cantidadReservada: 10,
          cantidadDisponible: 40,
          precioUnit: 25,
          precioProm: 24.5,
          valorTotal: 1250
        }
      ],
      meta: { page: 1, limit: 50, total: 1, totalPages: 1 }
    });

    expect(parsed.data[0]?.cantidadDisponible).toBe(40);
  });

  it("parses vales summary report", () => {
    const parsed = valesReportResponseSchema.parse({
      success: true,
      data: [
        {
          id: "vale-10",
          estado: "COMPLETADO",
          solicitante: { id: 5, nombre: "Juan" },
          items: []
        }
      ],
      meta: { page: 1, limit: 20, total: 1, totalPages: 1 }
    });

    expect(parsed.data[0]?.solicitante?.nombre).toBe("Juan");
  });

  it("parses compras summary report", () => {
    const parsed = comprasReportResponseSchema.parse({
      success: true,
      data: [
        {
          id: "compra-1",
          estado: "PARCIAL",
          numeroFactura: "FAC-001",
          descuento: 5,
          proveedor: { id: 3, nombre: "Proveedor A", nit: "123" },
          items: [
            {
              productoId: 10,
              codigo: "ELE-001",
              nombre: "Cable",
              unidad: "m",
              cantidadPedida: 10,
              cantidadRecibida: 8,
              precioUnit: 5,
              subtotalBs: 40
            }
          ],
          subtotalBs: 40,
          descuentoBs: 2,
          totalBs: 38
        }
      ],
      meta: { page: 1, limit: 20, total: 1, totalPages: 1 },
      totalGeneral: 38
    });

    expect(parsed.data[0]?.estado).toBe("PARCIAL");
    expect(parsed.data[0]?.totalBs).toBe(38);
  });

  it("parses compras proveedor report with totals without IVA", () => {
    const parsed = comprasProveedorReportResponseSchema.parse({
      success: true,
      data: [
        {
          id: "compra-1",
          estado: "COMPLETADO",
          numeroFactura: "FAC-001",
          fechaOperacion: "2025-10-15T00:00:00.000Z",
          proveedor: { id: 3, nombre: "Proveedor A", razonSocial: "Proveedor A SRL", nit: "123" },
          items: [
            {
              codigo: "02-01-0039",
              nombre: "Filtro de aceite SFO-5724 E WECHAY",
              unidad: "PIEZA",
              cantidadRecibida: 2,
              precioUnit: 70.08,
              totalBs: 140.16,
              totalSinIVA: 121.94
            }
          ],
          subtotalBs: 140.16,
          descuentoBs: 0,
          totalBs: 140.16,
          totalSinIVA: 121.94
        }
      ],
      meta: { page: 1, limit: 20, total: 1, totalPages: 1 },
      totalGeneral: 140.16,
      totalGeneralSinIVA: 121.94
    });

    expect(parsed.data[0]?.items[0]?.totalSinIVA).toBe(121.94);
    expect(parsed.totalGeneralSinIVA).toBe(121.94);
  });

  it("parses entradas de almacen grouped by month", () => {
    const parsed = entradasAlmacenReportResponseSchema.parse({
      success: true,
      data: {
        anioInicio: 2026,
        mesInicio: 1,
        anioFin: 2026,
        mesFin: 1,
        meses: [
          {
            anio: 2026,
            mes: 1,
            esCerrado: true,
            grupos: [
              {
                codigo: "MAT",
                nombre: "Materiales",
                totalBsEntrada: 1275,
                subGrupos: [
                  {
                    codigo: "MAT-ELE",
                    nombre: "Electricos",
                    productos: [
                      {
                        codigo: "ELE-001",
                        nombre: "Cable",
                        unidad: "m",
                        ingresoQty: 150,
                        precioUnit: 8.5,
                        totalBsEntrada: 1275
                      }
                    ]
                  }
                ]
              }
            ],
            totalGeneral: 1275
          }
        ]
      }
    });

    expect(parsed.data.meses[0]?.grupos[0]?.totalBsEntrada).toBe(1275);
  });

  it("parses entradas de almacen with unified totalBs fields", () => {
    const parsed = entradasAlmacenReportResponseSchema.parse({
      success: true,
      data: {
        anioInicio: 2025,
        mesInicio: 10,
        anioFin: 2025,
        mesFin: 10,
        meses: [
          {
            anio: 2025,
            mes: 10,
            esCerrado: false,
            totalGeneral: 85,
            grupos: [
              {
                codigo: "MAT",
                nombre: "Materiales",
                totalBs: 85,
                subGrupos: [
                  {
                    codigo: "MAT-ELE",
                    nombre: "Electricos",
                    productos: [
                      {
                        codigo: "ELE-001",
                        nombre: "Cable",
                        unidad: "m",
                        ingresoQty: 10,
                        precioUnit: 8.5,
                        totalBs: 85
                      }
                    ]
                  }
                ]
              }
            ]
          }
        ]
      }
    });

    expect(parsed.data.meses[0]?.grupos[0]?.totalBs).toBe(85);
    expect(parsed.data.meses[0]?.grupos[0]?.subGrupos[0]?.productos[0]?.totalBs).toBe(85);
  });

  it("normalizes alternate and incomplete entrada detail fields", () => {
    const parsed = entradasAlmacenReportResponseSchema.parse({
      success: true,
      data: {
        anioInicio: 2025,
        mesInicio: 10,
        anioFin: 2025,
        mesFin: 10,
        meses: [
          {
            anio: 2025,
            mes: 10,
            esCerrado: false,
            totalGeneral: 85,
            grupos: [
              {
                codigo: "MAT",
                subgrupos: [
                  {
                    codigo: "MAT-ELE",
                    items: [
                      {
                        codigo: "ELE-001",
                        cantidad: 10,
                        precioUnitario: 8.5,
                        totalBs: 85
                      }
                    ]
                  }
                ]
              }
            ]
          }
        ]
      }
    });

    const producto = parsed.data.meses[0]?.grupos[0]?.subGrupos[0]?.productos[0];
    expect(producto?.ingresoQty).toBe(10);
    expect(producto?.precioUnit).toBe(8.5);
  });

  it("parses salidas de almacen grouped by month", () => {
    const parsed = salidasAlmacenReportResponseSchema.parse({
      success: true,
      data: {
        anioInicio: 2026,
        mesInicio: 1,
        anioFin: 2026,
        mesFin: 1,
        meses: [
          {
            anio: 2026,
            mes: 1,
            esCerrado: false,
            grupos: [
              {
                codigo: "MAT",
                nombre: "Materiales",
                totalBsSalida: 680,
                subGrupos: [
                  {
                    codigo: "MAT-ELE",
                    nombre: "Electricos",
                    productos: [
                      {
                        codigo: "ELE-001",
                        nombre: "Cable",
                        unidad: "m",
                        salidaQty: 80,
                        precioUnit: 8.5,
                        totalBsSalida: 680
                      }
                    ]
                  }
                ]
              }
            ],
            totalGeneral: 680
          }
        ]
      }
    });

    expect(parsed.data.meses[0]?.grupos[0]?.totalBsSalida).toBe(680);
  });
});
