import type { Page, Route } from "@playwright/test";

type Role = "ADMIN" | "SUPERINTENDENTE" | "ALMACENERO" | "TRABAJADOR";

interface MockUser {
  id: number;
  nombre: string;
  email: string;
  role: Role;
}

interface ValeItem {
  id: string;
  productoId: number;
  cantidadSolicitada: number;
  cantidadEntregada: number;
  producto: {
    id: number;
    nombre: string;
    stock: {
      cantidad: number;
      cantidadReservada: number;
      cantidadDisponible: number;
      precioUnit: number;
    };
  };
}

interface Vale {
  id: string;
  solicitanteId: number;
  estado: "PENDIENTE" | "APROBADO" | "PARCIAL" | "COMPLETADO" | "RECHAZADO";
  createdAt: string;
  solicitante: { id: number; nombre: string; email: string };
  superintendente: { id: number; nombre: string } | null;
  almacenero: { id: number; nombre: string } | null;
  items: ValeItem[];
}

interface Compra {
  id: string;
  estado: "PENDIENTE" | "PARCIAL" | "COMPLETADO";
  createdAt: string;
  proveedor: { id: number; nombre: string; lugar?: string };
  observacion?: string;
  items: Array<{
    id: string;
    productoId: number;
    cantidadPedida: number;
    cantidadRecibida: number;
    precioUnit: number;
    producto: { id: number; nombre: string; unidad: string };
  }>;
}

interface Pedido {
  id: string;
  estado: "PENDIENTE" | "PARCIAL" | "COMPLETADO";
  createdAt: string;
  proveedor: { id: number; nombre: string };
  observacion?: string;
  items: Array<{
    id: string;
    productoId: number;
    cantidadPedida: number;
    cantidadRecibida: number;
    producto: { id: number; nombre: string; codigo: string; unidad: string };
  }>;
}

const users: MockUser[] = [
  { id: 1, nombre: "Admin Marte", email: "admin@marte.com", role: "ADMIN" },
  { id: 2, nombre: "Super Mina", email: "super@marte.com", role: "SUPERINTENDENTE" },
  { id: 3, nombre: "Almacen Uno", email: "almacen@marte.com", role: "ALMACENERO" },
  { id: 5, nombre: "Juan Perez", email: "juan@marte.com", role: "TRABAJADOR" }
];

function json(route: Route, body: unknown, status = 200) {
  return route.fulfill({
    status,
    contentType: "application/json",
    body: JSON.stringify(body)
  });
}

export async function attachInventoryMockServer(page: Page) {
  const vale: Vale = {
    id: "vale-001",
    solicitanteId: 5,
    estado: "PENDIENTE",
    createdAt: new Date().toISOString(),
    solicitante: { id: 5, nombre: "Juan Perez", email: "juan@marte.com" },
    superintendente: null,
    almacenero: null,
    items: [
      {
        id: "vale-item-1",
        productoId: 101,
        cantidadSolicitada: 10,
        cantidadEntregada: 0,
        producto: {
          id: 101,
          nombre: "Guantes de Seguridad",
          stock: {
            cantidad: 50,
            cantidadReservada: 0,
            cantidadDisponible: 50,
            precioUnit: 25
          }
        }
      }
    ]
  };

  const compra: Compra = {
    id: "compra-001",
    estado: "PENDIENTE",
    createdAt: new Date().toISOString(),
    proveedor: { id: 3, nombre: "Ferreteria Industrial", lugar: "Potosi" },
    observacion: "Compra inicial",
    items: [
      {
        id: "compra-item-1",
        productoId: 101,
        cantidadPedida: 20,
        cantidadRecibida: 0,
        precioUnit: 30,
        producto: { id: 101, nombre: "Guantes de Seguridad", unidad: "par" }
      }
    ]
  };

  const pedido: Pedido = {
    id: "pedido-001",
    estado: "PENDIENTE",
    createdAt: new Date().toISOString(),
    proveedor: { id: 3, nombre: "Ferreteria Industrial" },
    observacion: "Pedido urgente",
    items: [
      {
        id: "pedido-item-1",
        productoId: 101,
        cantidadPedida: 40,
        cantidadRecibida: 0,
        producto: { id: 101, nombre: "Guantes de Seguridad", codigo: "EPP-001", unidad: "par" }
      }
    ]
  };

  await page.route("**/api/**", async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    const path = url.pathname;
    const method = request.method();

    if (path === "/api/auth/login" && method === "POST") {
      const body = request.postDataJSON() as { email: string };
      const user = users.find((item) => item.email === body.email) ?? users[0];
      return json(route, {
        success: true,
        data: {
          accessToken: "header.payload.signature",
          refreshToken: "refresh-token",
          user
        }
      });
    }

    if (path === "/api/auth/refresh" && method === "POST") {
      return json(route, {
        success: true,
        data: { accessToken: "header.payload.signature", refreshToken: "refresh-token" }
      });
    }

    if (path === "/api/auth/users" && method === "GET") {
      return json(route, { success: true, data: users });
    }

    if (path === "/api/productos" && method === "GET") {
      return json(route, {
        success: true,
        data: [
          {
            id: 101,
            codigo: "EPP-001",
            nombre: "Guantes de Seguridad",
            unidad: "par",
            cuentaId: 501,
            stock: {
              cantidad: vale.items[0].producto.stock.cantidad,
              cantidadReservada: vale.items[0].producto.stock.cantidadReservada,
              cantidadDisponible: vale.items[0].producto.stock.cantidadDisponible
            }
          }
        ],
        meta: { page: 1, limit: 300, total: 1, totalPages: 1 }
      });
    }

    if (path === "/api/cuentas" && method === "GET") {
      return json(route, {
        success: true,
        data: [
          {
            id: 501,
            codigoCompleto: "26-01-01",
            centroCosto: { codigo: "CC01", nombre: "Mina" },
            funcionGasto: { codigo: "FG01", nombre: "Operacion" },
            sector: { codigo: "S01", nombre: "Interior Mina" }
          }
        ]
      });
    }

    if (path === "/api/proveedores" && method === "GET") {
      return json(route, {
        success: true,
        data: [{ id: 3, nombre: "Ferreteria Industrial", lugar: "Potosi", nit: "12345" }],
        meta: { page: 1, limit: 500, total: 1, totalPages: 1 }
      });
    }

    if (path === "/api/vales" && method === "GET") {
      return json(route, {
        success: true,
        data: [vale],
        meta: { page: 1, limit: 10, total: 1, totalPages: 1 }
      });
    }

    if (path.startsWith("/api/vales/solicitante/") && method === "GET") {
      return json(route, {
        success: true,
        data: [vale],
        meta: { page: 1, limit: 10, total: 1, totalPages: 1 }
      });
    }

    if (path === `/api/vales/${vale.id}` && method === "GET") {
      return json(route, { success: true, data: vale });
    }

    if (path === `/api/vales/${vale.id}/aprobar` && method === "PATCH") {
      vale.estado = "APROBADO";
      vale.superintendente = { id: 2, nombre: "Super Mina" };
      vale.items[0].producto.stock.cantidadReservada = vale.items[0].cantidadSolicitada;
      vale.items[0].producto.stock.cantidadDisponible =
        vale.items[0].producto.stock.cantidad - vale.items[0].producto.stock.cantidadReservada;
      return json(route, { success: true, data: vale });
    }

    if (path === `/api/vales/${vale.id}/rechazar` && method === "PATCH") {
      vale.estado = "RECHAZADO";
      vale.items[0].producto.stock.cantidadReservada = 0;
      vale.items[0].producto.stock.cantidadDisponible = vale.items[0].producto.stock.cantidad;
      return json(route, { success: true, data: vale });
    }

    if (path === `/api/vales/${vale.id}/entregar` && method === "PATCH") {
      const body = request.postDataJSON() as { cantidadesEntregadas: Record<string, number> };
      const delta = Number(body.cantidadesEntregadas["vale-item-1"] ?? 0);
      vale.items[0].cantidadEntregada += delta;
      vale.items[0].producto.stock.cantidad -= delta;
      vale.items[0].producto.stock.cantidadReservada = Math.max(
        0,
        vale.items[0].producto.stock.cantidadReservada - delta
      );
      vale.items[0].producto.stock.cantidadDisponible =
        vale.items[0].producto.stock.cantidad - vale.items[0].producto.stock.cantidadReservada;
      vale.estado = vale.items[0].cantidadEntregada >= vale.items[0].cantidadSolicitada ? "COMPLETADO" : "PARCIAL";
      return json(route, { success: true, data: { vale, movimientos: [{ id: "mov-1" }] } });
    }

    if (path === "/api/compras" && method === "GET") {
      return json(route, {
        success: true,
        data: [compra],
        meta: { page: 1, limit: 10, total: 1, totalPages: 1 }
      });
    }

    if (path === `/api/compras/${compra.id}` && method === "GET") {
      return json(route, { success: true, data: compra });
    }

    if (path === `/api/compras/${compra.id}/recibir` && method === "PATCH") {
      const body = request.postDataJSON() as { cantidadesRecibidas: Record<string, number> };
      const delta = Number(body.cantidadesRecibidas["compra-item-1"] ?? 0);
      compra.items[0].cantidadRecibida += delta;
      compra.estado = compra.items[0].cantidadRecibida >= compra.items[0].cantidadPedida ? "COMPLETADO" : "PARCIAL";
      vale.items[0].producto.stock.cantidad += delta;
      vale.items[0].producto.stock.cantidadDisponible =
        vale.items[0].producto.stock.cantidad - vale.items[0].producto.stock.cantidadReservada;
      return json(route, { success: true, data: { compra, movimientos: [{ id: "in-1" }] } });
    }

    if (path === "/api/pedidos" && method === "GET") {
      return json(route, {
        success: true,
        data: [pedido],
        meta: { page: 1, limit: 10, total: 1, totalPages: 1 }
      });
    }

    if (path === `/api/pedidos/${pedido.id}/cancelar` && method === "PATCH") {
      pedido.estado = "COMPLETADO";
      return json(route, { success: true, data: pedido });
    }

    if (path === "/api/reportes/stock" && method === "GET") {
      return json(route, {
        success: true,
        data: [
          {
            productoId: 101,
            codigo: "EPP-001",
            nombre: "Guantes de Seguridad",
            unidad: "par",
            categoria: "EPP",
            cantidad: vale.items[0].producto.stock.cantidad,
            cantidadReservada: vale.items[0].producto.stock.cantidadReservada,
            cantidadDisponible: vale.items[0].producto.stock.cantidadDisponible,
            precioUnit: 25,
            precioProm: 24.5,
            valorTotal: vale.items[0].producto.stock.cantidad * 25
          }
        ],
        meta: { page: 1, limit: 50, total: 1, totalPages: 1 }
      });
    }

    if (path === "/api/reportes/vales" && method === "GET") {
      return json(route, {
        success: true,
        data: [vale],
        meta: { page: 1, limit: 20, total: 1, totalPages: 1 }
      });
    }

    if (path === "/api/reportes/compras" && method === "GET") {
      return json(route, {
        success: true,
        data: [compra],
        meta: { page: 1, limit: 20, total: 1, totalPages: 1 }
      });
    }

    if (path === "/api/reportes/bin-card" && method === "GET") {
      return json(route, { items: [], meta: { page: 1, limit: 50, total: 0, totalPages: 1 } });
    }
    if (path === "/api/reportes/bin-card-valorado" && method === "GET") {
      return json(route, { items: [], meta: { page: 1, limit: 50, total: 0, totalPages: 1 } });
    }

    return json(route, { success: true, data: [] });
  });
}

export async function authenticateAs(page: Page, email: string) {
  const user = users.find((item) => item.email === email);
  if (!user) throw new Error(`User not found for email ${email}`);
  await page.addInitScript((session) => {
    window.localStorage.setItem("marte.auth.session", JSON.stringify(session));
    window.localStorage.setItem("marte.auth.token", session.accessToken);
  }, {
    accessToken: "header.payload.signature",
    refreshToken: "refresh-token",
    user
  });
}
