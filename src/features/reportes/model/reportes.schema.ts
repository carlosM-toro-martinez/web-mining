import { z } from "zod";

const numberLikeSchema = z.coerce.number();
const idLikeSchema = z.union([z.string(), numberLikeSchema]).transform((value) => String(value));

const reporteMetaSchema = z.object({
  page: numberLikeSchema.int().positive(),
  limit: numberLikeSchema.int().positive(),
  total: numberLikeSchema.int().nonnegative(),
  totalPages: numberLikeSchema.int().positive()
});

const reporteMetaSinPaginarSchema = z.object({
  total: numberLikeSchema.int().nonnegative()
});

const reporteMetaFlexibleSchema = z.union([reporteMetaSchema, reporteMetaSinPaginarSchema]);

const binCardItemBaseSchema = z.object({
  id: z.union([z.string(), numberLikeSchema]).transform((value) => String(value)),
  operationId: z.union([z.string(), numberLikeSchema]).transform((value) => String(value)),
  fecha: z.string().min(1),
  tipo: z.string().min(1),
  cantidad: numberLikeSchema,
  stockAntes: numberLikeSchema,
  stockDespues: numberLikeSchema,
  usuarioNombre: z.string().optional().nullable(),
  referencia: z.string().optional().nullable(),
  referenciaId: z.union([z.string(), numberLikeSchema]).optional().nullable(),
  productoNombre: z.string().optional().nullable(),
  esRetroactivo: z.boolean().optional().nullable(),
  periodoAnio: numberLikeSchema.int().optional().nullable(),
  periodoMes: numberLikeSchema.int().min(1).max(12).optional().nullable()
});

export const binCardItemSchema = binCardItemBaseSchema;

export const binCardValoradoItemSchema = binCardItemBaseSchema.extend({
  precioUnit: numberLikeSchema.optional().nullable(),
  entradaBs: numberLikeSchema.optional().nullable(),
  salidaBs: numberLikeSchema.optional().nullable(),
  saldoBs: numberLikeSchema.optional().nullable()
});

export const binCardResponseSchema = z.object({
  items: z.array(binCardItemSchema),
  meta: reporteMetaFlexibleSchema
});

export const binCardValoradoResponseSchema = z.object({
  items: z.array(binCardValoradoItemSchema),
  meta: reporteMetaFlexibleSchema
});

export const reportesQueryParamsSchema = z.object({
  page: numberLikeSchema.int().positive().default(1),
  limit: numberLikeSchema.int().positive().default(50),
  productoId: numberLikeSchema.int().positive().optional(),
  fechaInicio: z.string().trim().optional(),
  fechaFin: z.string().trim().optional(),
  fecha: z.string().trim().optional(),
  sinPaginar: z.boolean().optional()
});

const stockItemSchema = z.object({
  productoId: numberLikeSchema,
  codigo: z.string().optional().nullable(),
  nombre: z.string().optional().nullable(),
  unidad: z.string().optional().nullable(),
  categoria: z.string().optional().nullable(),
  cantidad: numberLikeSchema,
  cantidadReservada: numberLikeSchema,
  cantidadDisponible: numberLikeSchema,
  precioUnit: numberLikeSchema.optional().nullable(),
  precioProm: numberLikeSchema.optional().nullable(),
  valorTotal: numberLikeSchema
});

const reporteValeItemSchema = z.object({
  id: z.union([z.string(), numberLikeSchema]).transform((value) => String(value)),
  estado: z.string(),
  createdAt: z.string().optional().nullable(),
  aprobadoAt: z.string().optional().nullable(),
  entregadoAt: z.string().optional().nullable(),
  solicitante: z.object({ id: numberLikeSchema, nombre: z.string().optional().nullable() }).optional().nullable(),
  superintendente: z.object({ id: numberLikeSchema, nombre: z.string().optional().nullable() }).optional().nullable(),
  almacenero: z.object({ id: numberLikeSchema, nombre: z.string().optional().nullable() }).optional().nullable(),
  items: z.array(z.object({
    cantidadSolicitada: numberLikeSchema.optional().nullable(),
    cantidadEntregada: numberLikeSchema.optional().nullable(),
    producto: z.object({ id: numberLikeSchema.optional(), nombre: z.string().optional().nullable(), codigo: z.string().optional().nullable() }).optional().nullable()
  })).optional().default([])
});

const reporteCompraItemSchema = z.object({
  id: z.union([z.string(), numberLikeSchema]).transform((value) => String(value)),
  estado: z.string(),
  numeroFactura: z.string().optional().nullable(),
  observacion: z.string().optional().nullable(),
  descuento: numberLikeSchema,
  createdAt: z.string().optional().nullable(),
  recibidoAt: z.string().optional().nullable(),
  fechaOperacion: z.string().optional().nullable(),
  proveedor: z
    .object({
      id: numberLikeSchema.int().positive(),
      nombre: z.string().optional().nullable(),
      razonSocial: z.string().optional().nullable(),
      nit: z.string().optional().nullable(),
      contacto: z.string().optional().nullable(),
      lugar: z.string().optional().nullable()
    })
    .optional()
    .nullable(),
  usuarioRegistro: z
    .object({ id: numberLikeSchema.int().positive(), nombre: z.string().optional().nullable() })
    .optional()
    .nullable(),
  usuarioRecibe: z
    .object({ id: numberLikeSchema.int().positive(), nombre: z.string().optional().nullable() })
    .optional()
    .nullable(),
  anulacion: z
    .object({
      motivo: z.string(),
      creadoAt: z.string().optional().nullable(),
      usuario: z
        .object({ id: numberLikeSchema.int().positive(), nombre: z.string().optional().nullable() })
        .optional()
        .nullable()
    })
    .optional()
    .nullable(),
  items: z
    .array(
      z.object({
        productoId: numberLikeSchema.int().positive(),
        codigo: z.string().optional().nullable(),
        nombre: z.string().optional().nullable(),
        unidad: z.string().optional().nullable(),
        cantidadPedida: numberLikeSchema,
        cantidadRecibida: numberLikeSchema,
        precioUnit: numberLikeSchema,
        subtotalBs: numberLikeSchema
      })
    )
    .default([]),
  subtotalBs: numberLikeSchema,
  descuentoBs: numberLikeSchema,
  totalBs: numberLikeSchema
});

const reporteComprasProveedorItemSchema = z.object({
  codigo: z.string().optional().nullable(),
  nombre: z.string().optional().nullable(),
  unidad: z.string().optional().nullable(),
  cantidadRecibida: numberLikeSchema,
  precioUnit: numberLikeSchema,
  totalBs: numberLikeSchema,
  totalSinIVA: numberLikeSchema,
  grupo: z.string().optional().nullable(),
  categoria: z.string().optional().nullable()
});

const reporteComprasProveedorCompraSchema = z.object({
  id: z.union([z.string(), numberLikeSchema]).transform((value) => String(value)),
  estado: z.string(),
  numeroFactura: z.string().optional().nullable(),
  fechaOperacion: z.string().optional().nullable(),
  createdAt: z.string().optional().nullable(),
  proveedor: z
    .object({
      id: numberLikeSchema.int().positive(),
      nombre: z.string().optional().nullable(),
      razonSocial: z.string().optional().nullable(),
      nit: z.string().optional().nullable()
    })
    .optional()
    .nullable(),
  items: z.array(reporteComprasProveedorItemSchema).default([]),
  subtotalBs: numberLikeSchema,
  descuentoBs: numberLikeSchema,
  totalBs: numberLikeSchema,
  totalSinIVA: numberLikeSchema
});

export const stockReportResponseSchema = z.object({ success: z.boolean().optional(), data: z.array(stockItemSchema), meta: reporteMetaSchema });
export const valesReportResponseSchema = z.object({ success: z.boolean().optional(), data: z.array(reporteValeItemSchema), meta: reporteMetaFlexibleSchema });
export const comprasReportResponseSchema = z.object({
  success: z.boolean().optional(),
  data: z.array(reporteCompraItemSchema),
  meta: reporteMetaFlexibleSchema,
  totalGeneral: numberLikeSchema
});
export const comprasProveedorReportResponseSchema = z.object({
  success: z.boolean().optional(),
  data: z.array(reporteComprasProveedorCompraSchema),
  meta: reporteMetaFlexibleSchema,
  totalGeneral: numberLikeSchema,
  totalGeneralSinIVA: numberLikeSchema
});

export const stockReportQueryParamsSchema = z.object({
  page: numberLikeSchema.int().positive().default(1),
  limit: numberLikeSchema.int().positive().default(50),
  categoriaId: numberLikeSchema.int().positive().optional()
});
export const valesReportQueryParamsSchema = z.object({
  page: numberLikeSchema.int().positive().default(1),
  limit: numberLikeSchema.int().positive().default(20),
  estado: z.string().trim().optional(),
  solicitanteId: numberLikeSchema.int().positive().optional(),
  fechaInicio: z.string().trim().optional(),
  fechaFin: z.string().trim().optional(),
  sinPaginar: z.boolean().optional()
});
export const comprasReportQueryParamsSchema = z.object({
  page: numberLikeSchema.int().positive().default(1),
  limit: numberLikeSchema.int().positive().default(20),
  estado: z.string().trim().optional(),
  proveedorId: numberLikeSchema.int().positive().optional(),
  fechaInicio: z.string().trim().optional(),
  fechaFin: z.string().trim().optional(),
  sinPaginar: z.boolean().optional()
});

export const monthlyRangeReportQueryParamsSchema = z.object({
  anioInicio: numberLikeSchema.int().min(2000).max(2100),
  mesInicio: numberLikeSchema.int().min(1).max(12),
  anioFin: numberLikeSchema.int().min(2000).max(2100),
  mesFin: numberLikeSchema.int().min(1).max(12)
});

export const salidasDetalleReportQueryParamsSchema = monthlyRangeReportQueryParamsSchema.extend({
  cuentaId: numberLikeSchema.int().positive().optional(),
  funcionGastoCodigo: z.string().trim().optional(),
  sectorCodigo: z.string().trim().optional(),
  centroCostoCodigo: z.string().trim().optional(),
  sinCuenta: z.boolean().optional()
});

const balanceMensualGrupoSchema = z.object({
  grupoCodigo: z.string().optional().nullable(),
  grupoNombre: z.string().optional().nullable(),
  saldoInicial: numberLikeSchema,
  ingresoMateriales: numberLikeSchema,
  salidaMateriales: numberLikeSchema,
  saldoFinal: numberLikeSchema
});

const balanceMensualTotalesSchema = z.object({
  saldoInicial: numberLikeSchema,
  ingresoMateriales: numberLikeSchema,
  salidaMateriales: numberLikeSchema,
  saldoFinal: numberLikeSchema
});

const balanceMensualReportDataSchema = z.object({
  anioInicio: numberLikeSchema.int(),
  mesInicio: numberLikeSchema.int(),
  anioFin: numberLikeSchema.int(),
  mesFin: numberLikeSchema.int(),
  meses: z.array(
    z.object({
      anio: numberLikeSchema.int(),
      mes: numberLikeSchema.int().min(1).max(12),
      esCerrado: z.boolean(),
      grupos: z.array(balanceMensualGrupoSchema),
      totales: balanceMensualTotalesSchema
    })
  )
});

export const balanceMensualReportResponseSchema = z
  .object({
    success: z.boolean().optional(),
    data: balanceMensualReportDataSchema
  })
  .or(
    balanceMensualReportDataSchema.transform((data) => ({
      success: true,
      data
    }))
  );

const inventarioAlmacenProductoSchema = z.object({
  codigo: z.string().optional().nullable(),
  nombre: z.string().optional().nullable(),
  unidad: z.string().optional().nullable(),
  saldoInicial: numberLikeSchema,
  ingresoQty: numberLikeSchema,
  salidaQty: numberLikeSchema,
  saldoFinal: numberLikeSchema,
  precioUnit: numberLikeSchema,
  totalBs: numberLikeSchema
});

const inventarioAlmacenSubGrupoSchema = z.object({
  codigo: z.string().optional().nullable(),
  nombre: z.string().optional().nullable(),
  productos: z.array(inventarioAlmacenProductoSchema)
});

const inventarioAlmacenGrupoSchema = z.object({
  codigo: z.string().optional().nullable(),
  nombre: z.string().optional().nullable(),
  totalBs: numberLikeSchema,
  subGrupos: z.array(inventarioAlmacenSubGrupoSchema)
});

export const inventarioAlmacenReportResponseSchema = z.object({
  success: z.boolean().optional(),
  data: z.object({
    anioInicio: numberLikeSchema.int(),
    mesInicio: numberLikeSchema.int(),
    anioFin: numberLikeSchema.int(),
    mesFin: numberLikeSchema.int(),
    meses: z.array(
      z.object({
        anio: numberLikeSchema.int(),
        mes: numberLikeSchema.int().min(1).max(12),
        esCerrado: z.boolean(),
        totalGeneral: numberLikeSchema,
        grupos: z.array(inventarioAlmacenGrupoSchema)
      })
    )
  })
});

const movimientoAlmacenProductoBaseSchema = z.object({
  codigo: z.string().optional().nullable(),
  nombre: z.string().optional().nullable(),
  unidad: z.string().optional().nullable(),
  precioUnit: numberLikeSchema
});

const entradaAlmacenProductoSchema = z.preprocess(
  (value) => {
    if (!value || typeof value !== "object" || Array.isArray(value)) return value;
    const producto = value as Record<string, unknown>;
    return {
      ...producto,
      ingresoQty:
        producto.ingresoQty ?? producto.cantidad ?? producto.cantidadEntrada ?? producto.ingresos ?? 0,
      precioUnit: producto.precioUnit ?? producto.precioUnitario ?? 0
    };
  },
  movimientoAlmacenProductoBaseSchema.extend({
    ingresoQty: numberLikeSchema,
    totalBsEntrada: numberLikeSchema.optional(),
    totalBsEntradaMenos13: numberLikeSchema.optional(),
    totalBs: numberLikeSchema.optional()
  })
);

const salidaAlmacenProductoSchema = movimientoAlmacenProductoBaseSchema.extend({
  salidaQty: numberLikeSchema,
  totalBsSalida: numberLikeSchema,
  totalBsSalidaMenos13: numberLikeSchema.optional()
});

const entradaAlmacenSubGrupoSchema = z.preprocess(
  (value) => {
    if (!value || typeof value !== "object" || Array.isArray(value)) return value;
    const subGrupo = value as Record<string, unknown>;
    return {
      ...subGrupo,
      productos: subGrupo.productos ?? subGrupo.items ?? []
    };
  },
  z.object({
    codigo: z.string().optional().nullable(),
    nombre: z.string().optional().nullable(),
    productos: z.array(entradaAlmacenProductoSchema)
  })
);

const salidaAlmacenSubGrupoSchema = z.object({
  codigo: z.string().optional().nullable(),
  nombre: z.string().optional().nullable(),
  productos: z.array(salidaAlmacenProductoSchema)
});

export const entradasAlmacenReportResponseSchema = z.object({
  success: z.boolean().optional(),
  data: z.object({
    anioInicio: numberLikeSchema.int(),
    mesInicio: numberLikeSchema.int(),
    anioFin: numberLikeSchema.int(),
    mesFin: numberLikeSchema.int(),
    meses: z.array(
      z.object({
        anio: numberLikeSchema.int(),
        mes: numberLikeSchema.int().min(1).max(12),
        esCerrado: z.boolean(),
        grupos: z.array(
          z.preprocess(
            (value) => {
              if (!value || typeof value !== "object" || Array.isArray(value)) return value;
              const grupo = value as Record<string, unknown>;
              return {
                ...grupo,
                subGrupos: grupo.subGrupos ?? grupo.subgrupos ?? []
              };
            },
            z.object({
            codigo: z.string().optional().nullable(),
            nombre: z.string().optional().nullable(),
            totalBsEntrada: numberLikeSchema.optional(),
            totalBsEntradaMenos13: numberLikeSchema.optional(),
            totalBs: numberLikeSchema.optional(),
            subGrupos: z.array(entradaAlmacenSubGrupoSchema)
            })
          )
        ),
        totalGeneral: numberLikeSchema,
        totalGeneralMenos13: numberLikeSchema.optional()
      })
    )
  })
});

export const salidasAlmacenReportResponseSchema = z.object({
  success: z.boolean().optional(),
  data: z.object({
    anioInicio: numberLikeSchema.int(),
    mesInicio: numberLikeSchema.int(),
    anioFin: numberLikeSchema.int(),
    mesFin: numberLikeSchema.int(),
    meses: z.array(
      z.object({
        anio: numberLikeSchema.int(),
        mes: numberLikeSchema.int().min(1).max(12),
        esCerrado: z.boolean(),
        grupos: z.array(
          z.object({
            codigo: z.string().optional().nullable(),
            nombre: z.string().optional().nullable(),
            totalBsSalida: numberLikeSchema,
            totalBsSalidaMenos13: numberLikeSchema.optional(),
            subGrupos: z.array(salidaAlmacenSubGrupoSchema)
          })
        ),
        totalGeneral: numberLikeSchema,
        totalGeneralMenos13: numberLikeSchema.optional()
      })
    )
  })
});

const salidaDetalleCuentaSchema = z.object({
  id: idLikeSchema.optional().nullable(),
  codigoCompleto: z.string().optional().nullable(),
  centroCostoCodigo: z.string().optional().nullable(),
  centroCostoNombre: z.string().optional().nullable(),
  funcionGastoCodigo: z.string().optional().nullable(),
  funcionGastoNombre: z.string().optional().nullable(),
  sectorCodigo: z.string().optional().nullable(),
  sectorNombre: z.string().optional().nullable()
});

const salidaDetalleMovimientoSchema = z.object({
  id: idLikeSchema,
  fecha: z.string().optional().nullable(),
  periodoAnio: numberLikeSchema.int().optional().nullable(),
  periodoMes: numberLikeSchema.int().min(1).max(12).optional().nullable(),
  referencia: z.string().optional().nullable(),
  referenciaId: idLikeSchema.optional().nullable(),
  productoId: idLikeSchema.optional().nullable(),
  productoCodigo: z.string().optional().nullable(),
  productoNombre: z.string().optional().nullable(),
  productoUnidad: z.string().optional().nullable(),
  cantidad: numberLikeSchema,
  precioUnit: numberLikeSchema.optional().nullable(),
  salidaBs: numberLikeSchema,
  cuenta: salidaDetalleCuentaSchema.optional().nullable(),
  usuarioEntrega: z.string().optional().nullable()
});

export const salidasDetalleReportResponseSchema = z.object({
  success: z.boolean().optional(),
  data: z.object({
    anioInicio: numberLikeSchema.int(),
    mesInicio: numberLikeSchema.int(),
    anioFin: numberLikeSchema.int(),
    mesFin: numberLikeSchema.int(),
    filtros: z
      .object({
        cuentaId: idLikeSchema.optional().nullable(),
        funcionGastoCodigo: z.string().optional().nullable(),
        sectorCodigo: z.string().optional().nullable(),
        centroCostoCodigo: z.string().optional().nullable(),
        sinCuenta: z.boolean().optional().default(false)
      })
      .optional()
      .default({ sinCuenta: false }),
    totalMovimientos: numberLikeSchema.int().nonnegative(),
    movimientosSinCuenta: numberLikeSchema.int().nonnegative(),
    totalBs: numberLikeSchema,
    movimientos: z.array(salidaDetalleMovimientoSchema).default([])
  })
});

const detalleMaterialesLineaSchema = z.object({
  subCuenta: z.string().optional().nullable().default(""),
  subCentro: z.string().optional().nullable().default(""),
  subCentroNombre: z.string().optional().nullable(),
  importeBs: numberLikeSchema
});

const detalleMaterialesSubtotalSchema = z.object({
  subCentro: z.string().optional().nullable().default(""),
  nombre: z.string().optional().nullable(),
  importeBs: numberLikeSchema
});

const detalleMaterialesDetalleTransporteSchema = z.object({
  productoNombre: z.string().optional().nullable().default(""),
  unidad: z.string().optional().nullable().default(""),
  cantidad: numberLikeSchema,
  importeBs: numberLikeSchema,
  vehiculo: z.string().optional().nullable()
});

const detalleMaterialesPorCuentaSchema = z.object({
  codigoCompleto: z.string().optional().nullable().default(""),
  centroCostoCodigo: z.string().optional().nullable(),
  centroCostoNombre: z.string().optional().nullable(),
  funcionGastoCodigo: z.string().optional().nullable(),
  funcionGastoNombre: z.string().optional().nullable(),
  vehiculo: z.string().optional().nullable(),
  esTransporte: z.boolean().optional().default(false),
  totalBs: numberLikeSchema,
  totalCantidad: numberLikeSchema.optional(),
  lineas: z.array(detalleMaterialesLineaSchema).optional().default([]),
  detalles: z.array(detalleMaterialesDetalleTransporteSchema).optional().default([])
});

const detalleMaterialesReportDataSchema = z.object({
  anioInicio: numberLikeSchema.int(),
  mesInicio: numberLikeSchema.int(),
  anioFin: numberLikeSchema.int(),
  mesFin: numberLikeSchema.int(),
  meses: z.array(
    z.object({
      anio: numberLikeSchema.int(),
      mes: numberLikeSchema.int().min(1).max(12),
      esCerrado: z.boolean().default(false),
      lineas: z.array(detalleMaterialesLineaSchema).default([]),
      subtotalesPorSubCentro: z.array(detalleMaterialesSubtotalSchema).default([]),
      totalGeneral: numberLikeSchema,
      porCuenta: z.array(detalleMaterialesPorCuentaSchema).optional().default([])
    })
  )
});

export const detalleMaterialesReportResponseSchema = z
  .object({
    success: z.boolean().optional(),
    data: detalleMaterialesReportDataSchema
  })
  .or(
    detalleMaterialesReportDataSchema.transform((data) => ({
      success: true,
      data
    }))
  );

const diarioSubCentroSchema = z.object({
  cuentaId: idLikeSchema.optional().nullable(),
  codigoCompleto: z.string().optional().nullable(),
  funcionGastoCodigo: z.string().optional().nullable(),
  funcionGastoNombre: z.string().optional().nullable(),
  sectorCodigo: z.string().optional().nullable(),
  totalBs: numberLikeSchema
});

const diarioDetalleTransporteSchema = z.object({
  productoNombre: z.string().optional().nullable().default(""),
  unidad: z.string().optional().nullable().default(""),
  cantidad: numberLikeSchema,
  importeBs: numberLikeSchema,
  vehiculo: z.string().optional().nullable()
});

const diarioFuncionGastoSchema = z.object({
  codigo: z.string().optional().nullable().default(""),
  nombre: z.string().optional().nullable().default(""),
  totalBs: numberLikeSchema
});

const diarioLineaSchema = z.object({
  subCentro: z.string().optional().nullable().default(""),
  nombre: z.string().optional().nullable().default(""),
  funcionGastoCodigo: z.string().optional().nullable(),
  funcionGastoNombre: z.string().optional().nullable(),
  importeBs: numberLikeSchema,
  subCuentas: z.array(z.string()).optional().default([])
});

const diarioCuentaHaberSchema = z.object({
  codigoCompleto: z.string().optional().nullable(),
  centroCostoCodigo: z.string().optional().nullable(),
  centroCostoNombre: z.string().optional().nullable(),
  sectorCodigo: z.string().optional().nullable(),
  sectorNombre: z.string().optional().nullable(),
  esTransporte: z.boolean().optional().default(false),
  totalBs: numberLikeSchema,
  totalCantidad: numberLikeSchema.optional(),
  subCentros: z.array(diarioSubCentroSchema).optional().default([]),
  funcionGastos: z.array(diarioFuncionGastoSchema).optional().default([]),
  lineas: z.array(diarioLineaSchema).optional().default([]),
  detalles: z.array(diarioDetalleTransporteSchema).optional().default([])
});

const diarioAlmacenesReportDataSchema = z.object({
  anioInicio: numberLikeSchema.int(),
  mesInicio: numberLikeSchema.int(),
  anioFin: numberLikeSchema.int(),
  mesFin: numberLikeSchema.int(),
  meses: z.array(
    z.object({
      anio: numberLikeSchema.int(),
      mes: numberLikeSchema.int().min(1).max(12),
      esCerrado: z.boolean().default(false),
      saldoInventarioAnterior: numberLikeSchema,
      comprasImporteBs: numberLikeSchema,
      comprasSinIva: numberLikeSchema.optional(),
      totalInventarioDebe: numberLikeSchema,
      sectoresHaber: z.array(z.unknown()).optional().default([]),
      cuentasHaber: z.array(diarioCuentaHaberSchema).default([]),
      totalSalidasHaber: numberLikeSchema
    })
  )
});

export const diarioAlmacenesReportResponseSchema = z
  .object({
    success: z.boolean().optional(),
    data: diarioAlmacenesReportDataSchema
  })
  .or(
    diarioAlmacenesReportDataSchema.transform((data) => ({
      success: true,
      data
    }))
  );

const cuadroSuministrosItemSchema = z.object({
  productoId: idLikeSchema.optional().nullable(),
  nombre: z.string().optional().nullable(),
  unidad: z.string().optional().nullable(),
  cantidad: numberLikeSchema,
  precioUnit: numberLikeSchema.optional().nullable(),
  importeBs: numberLikeSchema,
  importeSinIVA: numberLikeSchema,
  grupo: z
    .object({
      codigo: z.string().optional().nullable(),
      nombre: z.string().optional().nullable()
    })
    .optional()
    .nullable()
});

const cuadroSuministrosCompraSchema = z.object({
  id: idLikeSchema,
  numeroFactura: z.string().optional().nullable(),
  fechaOperacion: z.string().optional().nullable(),
  items: z.array(cuadroSuministrosItemSchema).default([]),
  subtotalBs: numberLikeSchema
});

const cuadroSuministrosProveedorSchema = z.object({
  proveedor: z
    .object({
      id: idLikeSchema.optional().nullable(),
      nombre: z.string().optional().nullable(),
      nit: z.string().optional().nullable()
    })
    .optional()
    .nullable(),
  compras: z.array(cuadroSuministrosCompraSchema).default([]),
  totalBs: numberLikeSchema
});

export const cuadroSuministrosReportResponseSchema = z.object({
  success: z.boolean().optional(),
  data: z.object({
    anioInicio: numberLikeSchema.int(),
    mesInicio: numberLikeSchema.int(),
    anioFin: numberLikeSchema.int(),
    mesFin: numberLikeSchema.int(),
    meses: z.array(
      z.object({
        anio: numberLikeSchema.int(),
        mes: numberLikeSchema.int().min(1).max(12),
        esCerrado: z.boolean().default(false),
        proveedores: z.array(cuadroSuministrosProveedorSchema).default([]),
        totalGeneral: numberLikeSchema
      })
    )
  })
});

const saldosInicialesProductoSchema = z.object({
  codigo: z.string().optional().nullable(),
  nombre: z.string().optional().nullable(),
  unidad: z.string().optional().nullable(),
  saldoInicial: numberLikeSchema,
  precioUnit: numberLikeSchema,
  totalBsInicial: numberLikeSchema,
  fuente: z.enum(["corregido", "calculado"]).or(z.string().min(1))
});

const saldosInicialesGrupoSchema = z.object({
  grupoCodigo: z.string().optional().nullable(),
  grupoNombre: z.string().optional().nullable(),
  totalBsInicial: numberLikeSchema,
  productos: z.array(saldosInicialesProductoSchema).default([])
});

export const saldosInicialesReportResponseSchema = z.object({
  success: z.boolean().optional(),
  data: z.object({
    anioInicio: numberLikeSchema.int(),
    mesInicio: numberLikeSchema.int(),
    anioFin: numberLikeSchema.int(),
    mesFin: numberLikeSchema.int(),
    meses: z.array(
      z.object({
        anio: numberLikeSchema.int(),
        mes: numberLikeSchema.int().min(1).max(12),
        esCerrado: z.boolean().default(false),
        meta: z.object({
          totalProductos: numberLikeSchema.int().nonnegative(),
          corregidos: numberLikeSchema.int().nonnegative(),
          calculados: numberLikeSchema.int().nonnegative()
        }),
        grupos: z.array(saldosInicialesGrupoSchema).default([]),
        totalGeneral: numberLikeSchema
      })
    )
  })
});

const reporteUsuarioSchema = z
  .object({
    id: idLikeSchema,
    nombre: z.string().optional().nullable(),
    email: z.string().optional().nullable()
  })
  .optional()
  .nullable();

const reporteAnulacionSchema = z
  .object({
    id: idLikeSchema.optional().nullable(),
    motivo: z.string().optional().nullable(),
    creadoEn: z.string().optional().nullable(),
    creadoAt: z.string().optional().nullable(),
    usuario: reporteUsuarioSchema
  })
  .optional()
  .nullable();

const reporteProductoAnuladoSchema = z.object({
  id: idLikeSchema.optional().nullable(),
  codigo: z.string().optional().nullable(),
  nombre: z.string().optional().nullable(),
  unidad: z.string().optional().nullable()
});

const anulacionEntradaItemSchema = z.preprocess(
  (value) => {
    if (!value || typeof value !== "object" || Array.isArray(value)) return value;
    const item = value as Record<string, unknown>;
    return {
      ...item,
      id: item.id ?? item.productoId ?? `${item.codigo ?? ""}-${item.nombre ?? ""}`,
      producto: item.producto ?? {
        id: item.productoId,
        codigo: item.codigo,
        nombre: item.nombre,
        unidad: item.unidad
      },
      cantidadSolicitada: item.cantidadSolicitada ?? item.cantidadPedida
    };
  },
  z.object({
    id: idLikeSchema.optional().nullable(),
    producto: reporteProductoAnuladoSchema.optional().nullable(),
    cantidadSolicitada: numberLikeSchema.optional().nullable(),
    cantidadRecibida: numberLikeSchema.optional().nullable(),
    precioUnit: numberLikeSchema.optional().nullable(),
    totalBs: numberLikeSchema.optional().nullable()
  })
);

const anulacionSalidaItemSchema = z.preprocess(
  (value) => {
    if (!value || typeof value !== "object" || Array.isArray(value)) return value;
    const item = value as Record<string, unknown>;
    return {
      ...item,
      id: item.id ?? item.productoId ?? `${item.codigo ?? ""}-${item.nombre ?? ""}`,
      producto: item.producto ?? {
        id: item.productoId,
        codigo: item.codigo,
        nombre: item.nombre,
        unidad: item.unidad
      }
    };
  },
  z.object({
    id: idLikeSchema.optional().nullable(),
    producto: reporteProductoAnuladoSchema.optional().nullable(),
    cantidad: numberLikeSchema.optional().nullable()
  })
);

const compraAnuladaSchema = z.object({
  id: idLikeSchema,
  numeroFactura: z.string().optional().nullable(),
  observacion: z.string().optional().nullable(),
  createdAt: z.string().optional().nullable(),
  recibidoAt: z.string().optional().nullable(),
  fechaOperacion: z.string().optional().nullable(),
  estado: z.string().optional().nullable(),
  proveedor: z
    .object({
      id: idLikeSchema,
      nombre: z.string().optional().nullable(),
      razonSocial: z.string().optional().nullable(),
      nit: z.string().optional().nullable()
    })
    .optional()
    .nullable(),
  usuarioRegistro: reporteUsuarioSchema,
  usuarioRecibe: reporteUsuarioSchema,
  items: z.array(anulacionEntradaItemSchema).default([]),
  anulacion: reporteAnulacionSchema,
  totalBs: numberLikeSchema.optional().nullable()
});

const valeAnuladoSchema = z.object({
  id: idLikeSchema,
  codigo: z.string().optional().nullable(),
  fechaOperacion: z.string().optional().nullable(),
  estado: z.string().optional().nullable(),
  solicitante: z
    .object({
      id: idLikeSchema,
      nombre: z.string().optional().nullable()
    })
    .optional()
    .nullable(),
  usuarioRegistro: reporteUsuarioSchema,
  items: z.array(anulacionSalidaItemSchema).default([]),
  anulacion: reporteAnulacionSchema
});

export const anulacionesEntradasReportResponseSchema = z.object({
  success: z.boolean().optional(),
  data: z.object({
    anioInicio: numberLikeSchema.int(),
    mesInicio: numberLikeSchema.int(),
    anioFin: numberLikeSchema.int(),
    mesFin: numberLikeSchema.int(),
    meses: z.array(
      z.preprocess(
        (value) => {
          if (!value || typeof value !== "object" || Array.isArray(value)) return value;
          const periodo = value as Record<string, unknown>;
          return {
            ...periodo,
            esCerrado: periodo.esCerrado ?? false,
            comprasAnuladas: periodo.comprasAnuladas ?? periodo.compras ?? []
          };
        },
        z.object({
          anio: numberLikeSchema.int(),
          mes: numberLikeSchema.int().min(1).max(12),
          esCerrado: z.boolean().default(false),
          comprasAnuladas: z.array(compraAnuladaSchema).default([])
        })
      )
    )
  })
});

export const anulacionesSalidasReportResponseSchema = z.object({
  success: z.boolean().optional(),
  data: z.object({
    anioInicio: numberLikeSchema.int(),
    mesInicio: numberLikeSchema.int(),
    anioFin: numberLikeSchema.int(),
    mesFin: numberLikeSchema.int(),
    meses: z.array(
      z.preprocess(
        (value) => {
          if (!value || typeof value !== "object" || Array.isArray(value)) return value;
          const periodo = value as Record<string, unknown>;
          return {
            ...periodo,
            esCerrado: periodo.esCerrado ?? false,
            valesAnulados: periodo.valesAnulados ?? periodo.vales ?? periodo.salidas ?? []
          };
        },
        z.object({
          anio: numberLikeSchema.int(),
          mes: numberLikeSchema.int().min(1).max(12),
          esCerrado: z.boolean().default(false),
          valesAnulados: z.array(valeAnuladoSchema).default([])
        })
      )
    )
  })
});

export type BinCardItem = z.infer<typeof binCardItemSchema>;
export type BinCardValoradoItem = z.infer<typeof binCardValoradoItemSchema>;
export type BinCardResponse = z.infer<typeof binCardResponseSchema>;
export type BinCardValoradoResponse = z.infer<typeof binCardValoradoResponseSchema>;
export type ReportesQueryParams = z.infer<typeof reportesQueryParamsSchema>;
export type StockReportResponse = z.infer<typeof stockReportResponseSchema>;
export type ValesReportResponse = z.infer<typeof valesReportResponseSchema>;
export type ComprasReportResponse = z.infer<typeof comprasReportResponseSchema>;
export type StockReportQueryParams = z.infer<typeof stockReportQueryParamsSchema>;
export type ValesReportQueryParams = z.infer<typeof valesReportQueryParamsSchema>;
export type ComprasReportQueryParams = z.infer<typeof comprasReportQueryParamsSchema>;
export type ComprasProveedorReportResponse = z.infer<typeof comprasProveedorReportResponseSchema>;
export type MonthlyRangeReportQueryParams = z.infer<typeof monthlyRangeReportQueryParamsSchema>;
export type SalidasDetalleReportQueryParams = z.infer<typeof salidasDetalleReportQueryParamsSchema>;
export type BalanceMensualReportResponse = z.infer<typeof balanceMensualReportResponseSchema>;
export type InventarioAlmacenReportResponse = z.infer<typeof inventarioAlmacenReportResponseSchema>;
export type EntradasAlmacenReportResponse = z.infer<typeof entradasAlmacenReportResponseSchema>;
export type SalidasAlmacenReportResponse = z.infer<typeof salidasAlmacenReportResponseSchema>;
export type SalidasDetalleReportResponse = z.infer<typeof salidasDetalleReportResponseSchema>;
export type DetalleMaterialesReportResponse = z.infer<typeof detalleMaterialesReportResponseSchema>;
export type DiarioAlmacenesReportResponse = z.infer<typeof diarioAlmacenesReportResponseSchema>;
export type CuadroSuministrosReportResponse = z.infer<typeof cuadroSuministrosReportResponseSchema>;
export type SaldosInicialesReportResponse = z.infer<typeof saldosInicialesReportResponseSchema>;
export type AnulacionesEntradasReportResponse = z.infer<typeof anulacionesEntradasReportResponseSchema>;
export type AnulacionesSalidasReportResponse = z.infer<typeof anulacionesSalidasReportResponseSchema>;
