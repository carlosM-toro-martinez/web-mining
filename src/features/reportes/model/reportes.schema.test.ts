import { describe, expect, it } from "vitest";
import {
  comprasReportResponseSchema,
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
          proveedor: { id: 3, nombre: "Proveedor A" },
          items: []
        }
      ],
      meta: { page: 1, limit: 20, total: 1, totalPages: 1 }
    });

    expect(parsed.data[0]?.estado).toBe("PARCIAL");
  });
});
