export const queryKeys = {
  systemStatus: {
    all: ["system-status"] as const,
    detail: () => [...queryKeys.systemStatus.all, "detail"] as const
  },
  kardexValorado: {
    all: ["kardex-valorado"] as const,
    detail: () => [...queryKeys.kardexValorado.all, "detail"] as const
  },
  categoriasInventario: {
    all: ["categorias-inventario"] as const,
    tree: () => [...queryKeys.categoriasInventario.all, "tree"] as const
  },
  productos: {
    all: ["productos"] as const,
    list: (params: {
      page: number;
      limit: number;
      search?: string;
      grupoId?: number;
      subgrupoId?: number;
    }) => [...queryKeys.productos.all, "list", params] as const
  },
  exploraciones: {
    all: ["exploraciones"] as const,
    offline: () => [...queryKeys.exploraciones.all, "offline"] as const,
    elementosOffline: () => [...queryKeys.exploraciones.all, "elementos-offline"] as const,
    remotas: () => [...queryKeys.exploraciones.all, "remotas"] as const,
    elementos: () => [...queryKeys.exploraciones.all, "elementos"] as const,
    laboratorios: () => [...queryKeys.exploraciones.all, "laboratorios"] as const
  },
  auth: {
    all: ["auth"] as const,
    users: () => [...queryKeys.auth.all, "users"] as const
  }
};
