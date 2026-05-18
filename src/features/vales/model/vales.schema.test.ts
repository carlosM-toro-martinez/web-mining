import { describe, expect, it } from "vitest";
import {
  historialSolicitanteResponseSchema,
  valesListResponseSchema,
  valeResponseSchema
} from "./vales.schema";

describe("vales.schema", () => {
  it("parses vale response with reserved and available stock fields", () => {
    const parsed = valeResponseSchema.parse({
      success: true,
      data: {
        id: "vale-1",
        solicitanteId: 5,
        estado: "PENDIENTE",
        items: [
          {
            id: "item-1",
            productoId: 10,
            cantidadSolicitada: 8,
            cantidadEntregada: 0,
            producto: {
              id: 10,
              nombre: "Guantes",
              stock: {
                cantidad: "50",
                cantidadReservada: "10",
                cantidadDisponible: "40",
                precioUnit: "25"
              }
            }
          }
        ]
      }
    });

    expect(parsed.data.items[0]?.producto?.stock?.cantidadReservada).toBe("10");
    expect(parsed.data.items[0]?.producto?.stock?.cantidadDisponible).toBe("40");
  });

  it("normalizes vales list and keeps pagination meta", () => {
    const parsed = valesListResponseSchema.parse({
      success: true,
      data: {
        rows: [
          {
            id: "vale-2",
            estado: "APROBADO",
            items: []
          }
        ]
      },
      meta: {
        page: 1,
        limit: 10,
        total: 1,
        totalPages: 1
      }
    });

    expect(parsed.data).toHaveLength(1);
    expect(parsed.meta?.total).toBe(1);
  });

  it("supports historial response format", () => {
    const parsed = historialSolicitanteResponseSchema.parse({
      success: true,
      data: [
        {
          id: "vale-h-1",
          estado: "COMPLETADO",
          items: []
        }
      ],
      meta: {
        page: 1,
        limit: 10,
        total: 1,
        totalPages: 1
      }
    });

    expect(parsed.data[0]?.estado).toBe("COMPLETADO");
  });
});
