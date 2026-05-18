import { describe, expect, it } from "vitest";
import { createPedidoPayloadSchema, pedidosListResponseSchema } from "./pedidos.schema";

describe("pedidos.schema", () => {
  it("validates create payload with positive quantities", () => {
    const parsed = createPedidoPayloadSchema.parse({
      proveedorId: 3,
      observacion: "Urgente",
      items: [{ productoId: 7, cantidadPedida: 50 }]
    });

    expect(parsed.proveedorId).toBe(3);
    expect(parsed.items[0]?.cantidadPedida).toBe(50);
  });

  it("parses pedidos list response with meta", () => {
    const parsed = pedidosListResponseSchema.parse({
      success: true,
      data: [
        {
          id: "pedido-1",
          estado: "PENDIENTE",
          proveedor: { id: 3, nombre: "Proveedor Test" },
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

    expect(parsed.data[0]?.estado).toBe("PENDIENTE");
    expect(parsed.meta.totalPages).toBe(1);
  });
});
