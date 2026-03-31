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
      cuentaId?: number;
      sinCuenta?: boolean;
    }) => [...queryKeys.productos.all, "list", params] as const
  },
  contabilidad: {
    all: ["contabilidad"] as const,
    centrosCosto: () => [...queryKeys.contabilidad.all, "centros-costo"] as const,
    funcionesGasto: () => [...queryKeys.contabilidad.all, "funciones-gasto"] as const,
    cuentas: () => [...queryKeys.contabilidad.all, "cuentas"] as const
  }
};
