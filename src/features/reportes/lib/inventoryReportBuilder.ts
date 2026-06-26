import type { Producto } from "@/features/productos/model/producto.schema";
import type {
  BalanceMensualReportResponse,
  BinCardValoradoItem,
  EntradasAlmacenReportResponse,
  InventarioAlmacenReportResponse,
  SalidasAlmacenReportResponse
} from "@/features/reportes/model/reportes.schema";

export type InventoryReportType =
  | "balance-mensual"
  | "inventario-general"
  | "entradas-almacen"
  | "salidas-almacen"
  | "costo-produccion"
  | "movimiento-almacen";

export type InventoryReportColumn = {
  key: string;
  label: string;
  align?: "left" | "right" | "center";
};

export type InventoryReportRowType = "normal" | "group" | "subtotal" | "total";

export type InventoryReportRow = {
  id: string;
  type?: InventoryReportRowType;
  values: Record<string, string | number>;
};

export type InventoryReportDefinition = {
  type: InventoryReportType;
  title: string;
  subtitle: string;
  columns: InventoryReportColumn[];
  rows: InventoryReportRow[];
  summary: Array<{ label: string; value: string | number }>;
};

type BuildContext = {
  type: InventoryReportType;
  items: BinCardValoradoItem[];
  productos: Producto[];
  dateLabel: string;
};

type EnrichedItem = BinCardValoradoItem & {
  productCode: string;
  unit: string;
  groupCode: string;
  groupName: string;
  subgroupCode: string;
  subgroupName: string;
  cuentaCodigo: string;
  centroCostoCodigo: string;
  centroCostoNombre: string;
  funcionGastoCodigo: string;
  funcionGastoNombre: string;
};

function normalize(value: string) {
  return value.trim().toLowerCase();
}

function asCode(value: number | undefined) {
  if (!value) return "00";
  return String(value).padStart(2, "0");
}

function getNumber(value: number | null | undefined) {
  return typeof value === "number" && !Number.isNaN(value) ? value : 0;
}

function formatMonth(anio: number, mes: number) {
  return `${String(mes).padStart(2, "0")}/${anio}`;
}

function formatRangeLabel(data: {
  anioInicio: number;
  mesInicio: number;
  anioFin: number;
  mesFin: number;
}) {
  return `${formatMonth(data.anioInicio, data.mesInicio)} a ${formatMonth(data.anioFin, data.mesFin)}`;
}

function enrichItems(items: BinCardValoradoItem[], productos: Producto[]) {
  const productsByName = new Map<string, Producto>();
  for (const producto of productos) {
    productsByName.set(normalize(producto.nombre), producto);
  }

  return items.map<EnrichedItem>((item) => {
    const producto = item.productoNombre
      ? productsByName.get(normalize(item.productoNombre))
      : undefined;

    const categoria = producto?.categoria ?? null;
    const group = categoria?.parent ?? categoria ?? null;
    const subgroup = categoria;

    return {
      ...item,
      productCode: producto?.codigo ?? "-",
      unit: producto?.unidad ?? "-",
      groupCode: asCode(group?.id),
      groupName: group?.nombre ?? "Sin grupo",
      subgroupCode: asCode(subgroup?.id),
      subgroupName: subgroup?.nombre ?? "Sin subgrupo",
      cuentaCodigo: producto?.cuenta?.codigoCompleto ?? "-",
      centroCostoCodigo: producto?.cuenta?.centroCosto?.codigo ?? "-",
      centroCostoNombre: producto?.cuenta?.centroCosto?.nombre ?? "Sin centro",
      funcionGastoCodigo: producto?.cuenta?.funcionGasto?.codigo ?? "-",
      funcionGastoNombre: producto?.cuenta?.funcionGasto?.nombre ?? "Sin funcion"
    };
  });
}

function sortByDateAsc<T extends { fecha: string }>(items: T[]) {
  return [...items].sort((a, b) => new Date(a.fecha).getTime() - new Date(b.fecha).getTime());
}

function sortByDateDesc<T extends { fecha: string }>(items: T[]) {
  return [...items].sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime());
}

function groupByProduct(items: EnrichedItem[]) {
  const map = new Map<string, EnrichedItem[]>();
  for (const item of items) {
    const key = `${item.productCode}::${item.productoNombre ?? "-"}`;
    const chunk = map.get(key);
    if (chunk) chunk.push(item);
    else map.set(key, [item]);
  }
  return map;
}

function buildBalanceMensual(items: EnrichedItem[], dateLabel: string): InventoryReportDefinition {
  const perProduct = groupByProduct(items);
  const perGroup = new Map<
    string,
    {
      groupCode: string;
      groupName: string;
      saldoAnterior: number;
      entrada: number;
      salida: number;
      saldoFinal: number;
    }
  >();

  for (const entries of perProduct.values()) {
    const sorted = sortByDateAsc(entries);
    const first = sorted[0];
    const last = sorted[sorted.length - 1];
    if (!first || !last) continue;

    const saldoAnterior = getNumber(first.saldoBs) - getNumber(first.entradaBs) + getNumber(first.salidaBs);
    const entrada = sorted.reduce((sum, item) => sum + getNumber(item.entradaBs), 0);
    const salida = sorted.reduce((sum, item) => sum + getNumber(item.salidaBs), 0);
    const saldoFinal = getNumber(last.saldoBs);
    const key = `${last.groupCode}::${last.groupName}`;

    const current = perGroup.get(key);
    if (!current) {
      perGroup.set(key, {
        groupCode: last.groupCode,
        groupName: last.groupName,
        saldoAnterior,
        entrada,
        salida,
        saldoFinal
      });
      continue;
    }

    current.saldoAnterior += saldoAnterior;
    current.entrada += entrada;
    current.salida += salida;
    current.saldoFinal += saldoFinal;
  }

  const groups = [...perGroup.values()].sort((a, b) => a.groupCode.localeCompare(b.groupCode));
  const rows: InventoryReportRow[] = groups.map((group) => ({
    id: `group-${group.groupCode}`,
    values: {
      grupo: `${group.groupCode} - ${group.groupName}`,
      saldoAnterior: Number(group.saldoAnterior.toFixed(2)),
      entrada: Number(group.entrada.toFixed(2)),
      salida: Number(group.salida.toFixed(2)),
      saldoFinal: Number(group.saldoFinal.toFixed(2))
    }
  }));

  const totals = groups.reduce(
    (acc, group) => ({
      saldoAnterior: acc.saldoAnterior + group.saldoAnterior,
      entrada: acc.entrada + group.entrada,
      salida: acc.salida + group.salida,
      saldoFinal: acc.saldoFinal + group.saldoFinal
    }),
    { saldoAnterior: 0, entrada: 0, salida: 0, saldoFinal: 0 }
  );

  rows.push({
    id: "total",
    type: "total",
    values: {
      grupo: "TOTALES",
      saldoAnterior: Number(totals.saldoAnterior.toFixed(2)),
      entrada: Number(totals.entrada.toFixed(2)),
      salida: Number(totals.salida.toFixed(2)),
      saldoFinal: Number(totals.saldoFinal.toFixed(2))
    }
  });

  return {
    type: "balance-mensual",
    title: "Balance Mensual De Almacenes Lipeña",
    subtitle: `Correspondiente al mes ${dateLabel}`,
    columns: [
      { key: "grupo", label: "Grupo" },
      { key: "saldoAnterior", label: "Saldo Anterior Bs.", align: "right" },
      { key: "entrada", label: "Entrada Materiales Bs.", align: "right" },
      { key: "salida", label: "Salida Materiales Bs.", align: "right" },
      { key: "saldoFinal", label: "Saldo Final Bs.", align: "right" }
    ],
    rows,
    summary: [
      { label: "Total grupos", value: groups.length },
      { label: "Total registros", value: items.length }
    ]
  };
}

function buildInventarioGeneral(items: EnrichedItem[], dateLabel: string): InventoryReportDefinition {
  const latestByProduct = new Map<string, EnrichedItem>();

  for (const entry of sortByDateDesc(items)) {
    const key = `${entry.productCode}::${entry.productoNombre ?? "-"}`;
    if (!latestByProduct.has(key)) latestByProduct.set(key, entry);
  }

  const entries = [...latestByProduct.values()].sort((a, b) => {
    const groupSort = a.groupCode.localeCompare(b.groupCode);
    if (groupSort !== 0) return groupSort;
    const subgroupSort = a.subgroupCode.localeCompare(b.subgroupCode);
    if (subgroupSort !== 0) return subgroupSort;
    return a.productCode.localeCompare(b.productCode);
  });

  const rows: InventoryReportRow[] = [];
  let currentGroup = "";
  let currentSubgroup = "";
  let groupTotal = 0;

  for (const entry of entries) {
    if (entry.groupCode !== currentGroup) {
      if (currentGroup) {
        rows.push({
          id: `group-total-${currentGroup}`,
          type: "subtotal",
          values: {
            codigo: "",
            descripcion: `TOTAL GRUPO ${currentGroup}`,
            unidad: "",
            cantidad: "",
            precioUnitario: "",
            total: Number(groupTotal.toFixed(2))
          }
        });
      }
      currentGroup = entry.groupCode;
      currentSubgroup = "";
      groupTotal = 0;
      rows.push({
        id: `group-header-${entry.groupCode}`,
        type: "group",
        values: {
          codigo: `G-${entry.groupCode}`,
          descripcion: `GRUPO: ${entry.groupCode} ${entry.groupName}`,
          unidad: "",
          cantidad: "",
          precioUnitario: "",
          total: ""
        }
      });
    }

    if (entry.subgroupCode !== currentSubgroup) {
      currentSubgroup = entry.subgroupCode;
      rows.push({
        id: `subgroup-${entry.groupCode}-${entry.subgroupCode}`,
        type: "group",
        values: {
          codigo: "",
          descripcion: `Sub-Grupo: ${entry.subgroupCode} ${entry.subgroupName}`,
          unidad: "",
          cantidad: "",
          precioUnitario: "",
          total: ""
        }
      });
    }

    const cantidad = Number(entry.stockDespues.toFixed(2));
    const precioUnitario =
      getNumber(entry.precioUnit) ||
      (cantidad !== 0 ? Number((getNumber(entry.saldoBs) / cantidad).toFixed(2)) : 0);
    const total = Number(getNumber(entry.saldoBs).toFixed(2));
    groupTotal += total;

    rows.push({
      id: `item-${entry.id}`,
      values: {
        codigo: entry.productCode,
        descripcion: entry.productoNombre ?? "-",
        unidad: entry.unit,
        cantidad,
        precioUnitario: Number(precioUnitario.toFixed(2)),
        total
      }
    });
  }

  if (currentGroup) {
    rows.push({
      id: `group-total-${currentGroup}`,
      type: "subtotal",
      values: {
        codigo: "",
        descripcion: `TOTAL GRUPO ${currentGroup}`,
        unidad: "",
        cantidad: "",
        precioUnitario: "",
        total: Number(groupTotal.toFixed(2))
      }
    });
  }

  const grandTotal = entries.reduce((sum, entry) => sum + getNumber(entry.saldoBs), 0);
  rows.push({
    id: "grand-total",
    type: "total",
    values: {
      codigo: "",
      descripcion: "TOTAL GENERAL",
      unidad: "",
      cantidad: "",
      precioUnitario: "",
      total: Number(grandTotal.toFixed(2))
    }
  });

  return {
    type: "inventario-general",
    title: "Inventario De Almacen General Mina Lipeña",
    subtitle: `Correspondiente al mes ${dateLabel}`,
    columns: [
      { key: "codigo", label: "Codigo" },
      { key: "descripcion", label: "Descripcion" },
      { key: "unidad", label: "Unidad", align: "center" },
      { key: "cantidad", label: "Cantidad", align: "right" },
      { key: "precioUnitario", label: "P. Unit.", align: "right" },
      { key: "total", label: "Total Bs.", align: "right" }
    ],
    rows,
    summary: [
      { label: "Productos", value: entries.length },
      { label: "Movimientos usados", value: items.length }
    ]
  };
}

function buildCostoProduccion(items: EnrichedItem[], dateLabel: string): InventoryReportDefinition {
  const byCentro = new Map<
    string,
    {
      subCuenta: string;
      subCentro: string;
      importe: number;
      funcionCodigo: string;
      funcionNombre: string;
    }
  >();

  for (const item of items) {
    const importe = getNumber(item.salidaBs);
    if (importe <= 0) continue;
    const subCuenta = item.cuentaCodigo.split("-")[0] || item.cuentaCodigo;
    const key = `${subCuenta}::${item.centroCostoCodigo}::${item.funcionGastoCodigo}`;
    const current = byCentro.get(key);
    if (!current) {
      byCentro.set(key, {
        subCuenta,
        subCentro: item.centroCostoCodigo,
        importe,
        funcionCodigo: item.funcionGastoCodigo,
        funcionNombre: item.funcionGastoNombre
      });
      continue;
    }
    current.importe += importe;
  }

  const rowsData = [...byCentro.values()].sort((a, b) => {
    const funcSort = a.funcionCodigo.localeCompare(b.funcionCodigo);
    if (funcSort !== 0) return funcSort;
    const subCuentaSort = a.subCuenta.localeCompare(b.subCuenta);
    if (subCuentaSort !== 0) return subCuentaSort;
    return a.subCentro.localeCompare(b.subCentro);
  });

  const rows: InventoryReportRow[] = [];
  let currentFuncion = "";
  let subtotalFuncion = 0;
  const subtotales = new Map<string, number>();

  for (const row of rowsData) {
    if (row.funcionCodigo !== currentFuncion) {
      if (currentFuncion) {
        rows.push({
          id: `subtotal-${currentFuncion}`,
          type: "subtotal",
          values: {
            subCuenta: "",
            subCentro: "",
            importe: "",
            funcion: `SUBTOTAL FUNCION ${currentFuncion}`,
            subtotalFuncion: Number(subtotalFuncion.toFixed(2))
          }
        });
      }
      currentFuncion = row.funcionCodigo;
      subtotalFuncion = 0;
    }

    subtotalFuncion += row.importe;
    subtotales.set(row.funcionCodigo, subtotalFuncion);

    rows.push({
      id: `line-${row.funcionCodigo}-${row.subCuenta}-${row.subCentro}`,
      values: {
        subCuenta: row.subCuenta,
        subCentro: row.subCentro,
        importe: Number(row.importe.toFixed(2)),
        funcion: `${row.funcionCodigo} - ${row.funcionNombre}`,
        subtotalFuncion: ""
      }
    });
  }

  if (currentFuncion) {
    rows.push({
      id: `subtotal-${currentFuncion}`,
      type: "subtotal",
      values: {
        subCuenta: "",
        subCentro: "",
        importe: "",
        funcion: `SUBTOTAL FUNCION ${currentFuncion}`,
        subtotalFuncion: Number(subtotalFuncion.toFixed(2))
      }
    });
  }

  const total = rowsData.reduce((sum, row) => sum + row.importe, 0);
  rows.push({
    id: "total-general",
    type: "total",
    values: {
      subCuenta: "",
      subCentro: "",
      importe: "",
      funcion: "TOTAL GENERAL",
      subtotalFuncion: Number(total.toFixed(2))
    }
  });

  return {
    type: "costo-produccion",
    title: "Detalle De Materiales Costo De Produccion Lipeña",
    subtitle: `Correspondiente al mes ${dateLabel}`,
    columns: [
      { key: "subCuenta", label: "Sub Cuenta" },
      { key: "subCentro", label: "Sub Centro" },
      { key: "importe", label: "Importe Bs.", align: "right" },
      { key: "funcion", label: "Funcion Del Gasto" },
      { key: "subtotalFuncion", label: "Sub Totales Bs.", align: "right" }
    ],
    rows,
    summary: [
      { label: "Funciones con movimiento", value: new Set(rowsData.map((row) => row.funcionCodigo)).size },
      { label: "Registros consolidados", value: rowsData.length }
    ]
  };
}

function buildMovimientoAlmacen(items: EnrichedItem[], dateLabel: string): InventoryReportDefinition {
  const opening = items.reduce((sum, item) => {
    const base = getNumber(item.saldoBs) - getNumber(item.entradaBs) + getNumber(item.salidaBs);
    return sum + base;
  }, 0);
  const debe = items.reduce((sum, item) => sum + getNumber(item.entradaBs), 0);
  const haber = items.reduce((sum, item) => sum + getNumber(item.salidaBs), 0);
  const saldoFinal = items.reduce((sum, item) => sum + getNumber(item.saldoBs), 0);

  const rows: InventoryReportRow[] = [
    {
      id: "opening",
      values: {
        cargo: "26 002 000",
        descripcion: "Inventario material y suministro (saldo inicial)",
        debeBs: Number(opening.toFixed(2)),
        haberBs: 0
      }
    },
    {
      id: "entries",
      values: {
        cargo: "87 002 000",
        descripcion: "Movimientos de entrada del periodo",
        debeBs: Number(debe.toFixed(2)),
        haberBs: 0
      }
    },
    {
      id: "production",
      values: {
        cargo: "100 001 000",
        descripcion: "Costo de produccion del periodo",
        debeBs: 0,
        haberBs: Number(haber.toFixed(2))
      }
    },
    {
      id: "close",
      type: "total",
      values: {
        cargo: "",
        descripcion: "Saldo al cierre del periodo",
        debeBs: Number((opening + debe).toFixed(2)),
        haberBs: Number((haber + saldoFinal).toFixed(2))
      }
    }
  ];

  return {
    type: "movimiento-almacen",
    title: "Movimiento Almacenes Almacen General Lipeña",
    subtitle: `Correspondiente al mes ${dateLabel}`,
    columns: [
      { key: "cargo", label: "Cargos" },
      { key: "descripcion", label: "Descripcion" },
      { key: "debeBs", label: "Debe Bs.", align: "right" },
      { key: "haberBs", label: "Haber Bs.", align: "right" }
    ],
    rows,
    summary: [
      { label: "Saldo final", value: Number(saldoFinal.toFixed(2)) },
      { label: "Movimientos", value: items.length }
    ]
  };
}

export const INVENTORY_REPORTS: Array<{
  type: InventoryReportType;
  title: string;
  description: string;
}> = [
  {
    type: "balance-mensual",
    title: "Balance Mensual",
    description: "Resumen por grupo con saldo anterior, entradas, salidas y saldo final."
  },
  {
    type: "inventario-general",
    title: "Inventario General",
    description: "Detalle por grupo y subgrupo con cantidad, precio unitario y total."
  },
  {
    type: "entradas-almacen",
    title: "Entradas De Almacen",
    description: "Ingresos por grupo, subgrupo y producto con cantidades y valorizacion."
  },
  {
    type: "salidas-almacen",
    title: "Salidas De Almacen",
    description: "Egresos por grupo, subgrupo y producto con cantidades y valorizacion."
  },
  {
    type: "costo-produccion",
    title: "Costo De Produccion",
    description: "Detalle por subcuenta, subcentro y funcion de gasto con subtotales."
  },
  {
    type: "movimiento-almacen",
    title: "Movimiento Almacen",
    description: "Asiento consolidado de cargos, debe y haber del periodo."
  }
];

export function isInventoryReportType(value: string | undefined): value is InventoryReportType {
  if (!value) return false;
  return INVENTORY_REPORTS.some((report) => report.type === value);
}

export function buildInventoryReportDefinition(context: BuildContext): InventoryReportDefinition {
  const enriched = enrichItems(context.items, context.productos);

  switch (context.type) {
    case "balance-mensual":
      return buildBalanceMensual(enriched, context.dateLabel);
    case "inventario-general":
      return buildInventarioGeneral(enriched, context.dateLabel);
    case "costo-produccion":
      return buildCostoProduccion(enriched, context.dateLabel);
    case "movimiento-almacen":
      return buildMovimientoAlmacen(enriched, context.dateLabel);
    default:
      return buildBalanceMensual(enriched, context.dateLabel);
  }
}

export function buildBalanceMensualApiReportDefinition(
  response: BalanceMensualReportResponse
): InventoryReportDefinition {
  const { data } = response;
  const rows: InventoryReportRow[] = [];

  for (const periodo of data.meses) {
    rows.push({
      id: `periodo-${periodo.anio}-${periodo.mes}`,
      type: "group",
      values: {
        periodo: `${formatMonth(periodo.anio, periodo.mes)} ${periodo.esCerrado ? "(cerrado)" : "(abierto)"}`,
        grupo: "",
        saldoInicial: "",
        ingresoMateriales: "",
        salidaMateriales: "",
        saldoFinal: ""
      }
    });

    for (const grupo of periodo.grupos) {
      rows.push({
        id: `grupo-${periodo.anio}-${periodo.mes}-${grupo.grupoCodigo ?? grupo.grupoNombre ?? rows.length}`,
        values: {
          periodo: formatMonth(periodo.anio, periodo.mes),
          grupo: `${grupo.grupoCodigo ?? "-"} - ${grupo.grupoNombre ?? "Sin grupo"}`,
          saldoInicial: Number(grupo.saldoInicial.toFixed(2)),
          ingresoMateriales: Number(grupo.ingresoMateriales.toFixed(2)),
          salidaMateriales: Number(grupo.salidaMateriales.toFixed(2)),
          saldoFinal: Number(grupo.saldoFinal.toFixed(2))
        }
      });
    }

    rows.push({
      id: `total-${periodo.anio}-${periodo.mes}`,
      type: "subtotal",
      values: {
        periodo: formatMonth(periodo.anio, periodo.mes),
        grupo: "TOTAL PERIODO",
        saldoInicial: Number(periodo.totales.saldoInicial.toFixed(2)),
        ingresoMateriales: Number(periodo.totales.ingresoMateriales.toFixed(2)),
        salidaMateriales: Number(periodo.totales.salidaMateriales.toFixed(2)),
        saldoFinal: Number(periodo.totales.saldoFinal.toFixed(2))
      }
    });
  }

  const totals = data.meses.reduce(
    (acc, periodo) => ({
      saldoInicial: acc.saldoInicial + periodo.totales.saldoInicial,
      ingresoMateriales: acc.ingresoMateriales + periodo.totales.ingresoMateriales,
      salidaMateriales: acc.salidaMateriales + periodo.totales.salidaMateriales,
      saldoFinal: acc.saldoFinal + periodo.totales.saldoFinal
    }),
    { saldoInicial: 0, ingresoMateriales: 0, salidaMateriales: 0, saldoFinal: 0 }
  );

  rows.push({
    id: "total-general",
    type: "total",
    values: {
      periodo: "RANGO",
      grupo: "TOTAL GENERAL",
      saldoInicial: Number(totals.saldoInicial.toFixed(2)),
      ingresoMateriales: Number(totals.ingresoMateriales.toFixed(2)),
      salidaMateriales: Number(totals.salidaMateriales.toFixed(2)),
      saldoFinal: Number(totals.saldoFinal.toFixed(2))
    }
  });

  return {
    type: "balance-mensual",
    title: "Balance Mensual De Almacenes Lipeña",
    subtitle: `Correspondiente a: ${formatRangeLabel(data)}`,
    columns: [
      { key: "periodo", label: "Periodo" },
      { key: "grupo", label: "Grupo" },
      { key: "saldoInicial", label: "Saldo Inicial Bs.", align: "right" },
      { key: "ingresoMateriales", label: "Ingreso Materiales Bs.", align: "right" },
      { key: "salidaMateriales", label: "Salida Materiales Bs.", align: "right" },
      { key: "saldoFinal", label: "Saldo Final Bs.", align: "right" }
    ],
    rows,
    summary: [
      { label: "Meses", value: data.meses.length },
      { label: "Meses cerrados", value: data.meses.filter((periodo) => periodo.esCerrado).length }
    ]
  };
}

export function buildInventarioAlmacenApiReportDefinition(
  response: InventarioAlmacenReportResponse
): InventoryReportDefinition {
  const { data } = response;
  const rows: InventoryReportRow[] = [];
  let productCount = 0;

  for (const periodo of data.meses) {
    rows.push({
      id: `periodo-${periodo.anio}-${periodo.mes}`,
      type: "group",
      values: {
        periodo: `${formatMonth(periodo.anio, periodo.mes)} ${periodo.esCerrado ? "(cerrado)" : "(abierto)"}`,
        codigo: "",
        descripcion: "",
        unidad: "",
        saldoInicial: "",
        ingresoQty: "",
        salidaQty: "",
        saldoFinal: "",
        precioUnit: "",
        totalBs: ""
      }
    });

    for (const grupo of periodo.grupos) {
      rows.push({
        id: `grupo-${periodo.anio}-${periodo.mes}-${grupo.codigo ?? rows.length}`,
        type: "group",
        values: {
          periodo: formatMonth(periodo.anio, periodo.mes),
          codigo: grupo.codigo ?? "-",
          descripcion: `GRUPO: ${grupo.nombre ?? "Sin grupo"}`,
          unidad: "",
          saldoInicial: "",
          ingresoQty: "",
          salidaQty: "",
          saldoFinal: "",
          precioUnit: "",
          totalBs: Number(grupo.totalBs.toFixed(2))
        }
      });

      for (const subGrupo of grupo.subGrupos) {
        const subGrupoTotales = subGrupo.productos.reduce(
          (totales, producto) => ({
            saldoInicial: totales.saldoInicial + producto.saldoInicial,
            ingresoQty: totales.ingresoQty + producto.ingresoQty,
            salidaQty: totales.salidaQty + producto.salidaQty,
            saldoFinal: totales.saldoFinal + producto.saldoFinal,
            totalBs: totales.totalBs + producto.totalBs
          }),
          { saldoInicial: 0, ingresoQty: 0, salidaQty: 0, saldoFinal: 0, totalBs: 0 }
        );

        rows.push({
          id: `subgrupo-${periodo.anio}-${periodo.mes}-${grupo.codigo ?? "grupo"}-${subGrupo.codigo ?? rows.length}`,
          type: "group",
          values: {
            periodo: formatMonth(periodo.anio, periodo.mes),
            codigo: subGrupo.codigo ?? "-",
            descripcion: `Sub-Grupo: ${subGrupo.nombre ?? "Sin subgrupo"}`,
            unidad: "",
            saldoInicial: "",
            ingresoQty: "",
            salidaQty: "",
            saldoFinal: "",
            precioUnit: "",
            totalBs: ""
          }
        });

        for (const producto of subGrupo.productos) {
          productCount += 1;
          rows.push({
            id: `producto-${periodo.anio}-${periodo.mes}-${producto.codigo ?? productCount}`,
            values: {
              periodo: formatMonth(periodo.anio, periodo.mes),
              codigo: producto.codigo ?? "-",
              descripcion: producto.nombre ?? "Sin nombre",
              unidad: producto.unidad ?? "-",
              saldoInicial: Number(producto.saldoInicial.toFixed(2)),
              ingresoQty: Number(producto.ingresoQty.toFixed(2)),
              salidaQty: Number(producto.salidaQty.toFixed(2)),
              saldoFinal: Number(producto.saldoFinal.toFixed(2)),
              precioUnit: Number(producto.precioUnit.toFixed(2)),
              totalBs: Number(producto.totalBs.toFixed(2))
            }
          });
        }

        rows.push({
          id: `subgrupo-total-${periodo.anio}-${periodo.mes}-${grupo.codigo ?? "grupo"}-${subGrupo.codigo ?? rows.length}`,
          type: "subtotal",
          values: {
            periodo: formatMonth(periodo.anio, periodo.mes),
            codigo: "",
            descripcion: `TOTAL SUB-GRUPO ${subGrupo.codigo ?? "-"} ${subGrupo.nombre ?? "Sin subgrupo"}`,
            unidad: "",
            saldoInicial: Number(subGrupoTotales.saldoInicial.toFixed(2)),
            ingresoQty: Number(subGrupoTotales.ingresoQty.toFixed(2)),
            salidaQty: Number(subGrupoTotales.salidaQty.toFixed(2)),
            saldoFinal: Number(subGrupoTotales.saldoFinal.toFixed(2)),
            precioUnit: "",
            totalBs: Number(subGrupoTotales.totalBs.toFixed(2))
          }
        });
      }
    }

    rows.push({
      id: `total-${periodo.anio}-${periodo.mes}`,
      type: "total",
      values: {
        periodo: formatMonth(periodo.anio, periodo.mes),
        codigo: "",
        descripcion: "TOTAL GENERAL DEL PERIODO",
        unidad: "",
        saldoInicial: "",
        ingresoQty: "",
        salidaQty: "",
        saldoFinal: "",
        precioUnit: "",
        totalBs: Number(periodo.totalGeneral.toFixed(2))
      }
    });
  }

  const totalGeneral = data.meses.reduce((sum, periodo) => sum + periodo.totalGeneral, 0);

  return {
    type: "inventario-general",
    title: "Inventario De Almacen General Mina Lipeña",
    subtitle: `Correspondiente a: ${formatRangeLabel(data)}`,
    columns: [
      { key: "periodo", label: "Periodo" },
      { key: "codigo", label: "Codigo" },
      { key: "descripcion", label: "Descripcion" },
      { key: "unidad", label: "Unidad", align: "center" },
      { key: "saldoInicial", label: "Saldo Inicial", align: "right" },
      { key: "ingresoQty", label: "Ingreso", align: "right" },
      { key: "salidaQty", label: "Salida", align: "right" },
      { key: "saldoFinal", label: "Saldo Final", align: "right" },
      { key: "precioUnit", label: "P. Unit.", align: "right" },
      { key: "totalBs", label: "Total Bs.", align: "right" }
    ],
    rows,
    summary: [
      { label: "Meses", value: data.meses.length },
      { label: "Productos", value: productCount },
      { label: "Total general", value: Number(totalGeneral.toFixed(2)) }
    ]
  };
}

type MovimientoAlmacenNormalizado = {
  anioInicio: number;
  mesInicio: number;
  anioFin: number;
  mesFin: number;
  meses: Array<{
    anio: number;
    mes: number;
    esCerrado: boolean;
    totalGeneral: number;
    grupos: Array<{
      codigo?: string | null;
      nombre?: string | null;
      totalBs: number;
      subGrupos: Array<{
        codigo?: string | null;
        nombre?: string | null;
        productos: Array<{
          codigo?: string | null;
          nombre?: string | null;
          unidad?: string | null;
          cantidad: number;
          precioUnit: number;
          totalBs: number;
        }>;
      }>;
    }>;
  }>;
};

function buildMovimientoAlmacenApiReportDefinition(params: {
  type: "entradas-almacen" | "salidas-almacen";
  title: string;
  quantityLabel: string;
  data: MovimientoAlmacenNormalizado;
}): InventoryReportDefinition {
  const rows: InventoryReportRow[] = [];
  let productCount = 0;

  for (const periodo of params.data.meses) {
    rows.push({
      id: `periodo-${params.type}-${periodo.anio}-${periodo.mes}`,
      type: "group",
      values: {
        periodo: `${formatMonth(periodo.anio, periodo.mes)} ${periodo.esCerrado ? "(cerrado)" : "(abierto)"}`,
        codigo: "",
        descripcion: "",
        unidad: "",
        cantidad: "",
        precioUnit: "",
        totalBs: ""
      }
    });

    for (const grupo of periodo.grupos) {
      rows.push({
        id: `grupo-${params.type}-${periodo.anio}-${periodo.mes}-${grupo.codigo ?? rows.length}`,
        type: "group",
        values: {
          periodo: formatMonth(periodo.anio, periodo.mes),
          codigo: grupo.codigo ?? "-",
          descripcion: `GRUPO: ${grupo.nombre ?? "Sin grupo"}`,
          unidad: "",
          cantidad: "",
          precioUnit: "",
          totalBs: Number(grupo.totalBs.toFixed(2))
        }
      });

      for (const subGrupo of grupo.subGrupos) {
        const subGrupoTotales = subGrupo.productos.reduce(
          (totales, producto) => ({
            cantidad: totales.cantidad + producto.cantidad,
            totalBs: totales.totalBs + producto.totalBs
          }),
          { cantidad: 0, totalBs: 0 }
        );

        rows.push({
          id: `subgrupo-${params.type}-${periodo.anio}-${periodo.mes}-${grupo.codigo ?? "grupo"}-${subGrupo.codigo ?? rows.length}`,
          type: "group",
          values: {
            periodo: formatMonth(periodo.anio, periodo.mes),
            codigo: subGrupo.codigo ?? "-",
            descripcion: `Sub-Grupo: ${subGrupo.nombre ?? "Sin subgrupo"}`,
            unidad: "",
            cantidad: "",
            precioUnit: "",
            totalBs: ""
          }
        });

        for (const producto of subGrupo.productos) {
          productCount += 1;
          rows.push({
            id: `producto-${params.type}-${periodo.anio}-${periodo.mes}-${producto.codigo ?? productCount}`,
            values: {
              periodo: formatMonth(periodo.anio, periodo.mes),
              codigo: producto.codigo ?? "-",
              descripcion: producto.nombre ?? "Sin nombre",
              unidad: producto.unidad ?? "-",
              cantidad: Number(producto.cantidad.toFixed(2)),
              precioUnit: Number(producto.precioUnit.toFixed(2)),
              totalBs: Number(producto.totalBs.toFixed(2))
            }
          });
        }

        rows.push({
          id: `subgrupo-total-${params.type}-${periodo.anio}-${periodo.mes}-${grupo.codigo ?? "grupo"}-${subGrupo.codigo ?? rows.length}`,
          type: "subtotal",
          values: {
            periodo: formatMonth(periodo.anio, periodo.mes),
            codigo: "",
            descripcion: `TOTAL SUB-GRUPO ${subGrupo.codigo ?? "-"} ${subGrupo.nombre ?? "Sin subgrupo"}`,
            unidad: "",
            cantidad: Number(subGrupoTotales.cantidad.toFixed(2)),
            precioUnit: "",
            totalBs: Number(subGrupoTotales.totalBs.toFixed(2))
          }
        });
      }
    }

    rows.push({
      id: `total-${params.type}-${periodo.anio}-${periodo.mes}`,
      type: "total",
      values: {
        periodo: formatMonth(periodo.anio, periodo.mes),
        codigo: "",
        descripcion: "TOTAL GENERAL DEL PERIODO",
        unidad: "",
        cantidad: "",
        precioUnit: "",
        totalBs: Number(periodo.totalGeneral.toFixed(2))
      }
    });
  }

  const totalGeneral = params.data.meses.reduce(
    (total, periodo) => total + periodo.totalGeneral,
    0
  );

  return {
    type: params.type,
    title: params.title,
    subtitle: `Correspondiente a: ${formatRangeLabel(params.data)}`,
    columns: [
      { key: "periodo", label: "Periodo" },
      { key: "codigo", label: "Codigo" },
      { key: "descripcion", label: "Descripcion" },
      { key: "unidad", label: "Unidad", align: "center" },
      { key: "cantidad", label: params.quantityLabel, align: "right" },
      { key: "precioUnit", label: "P. Unit.", align: "right" },
      { key: "totalBs", label: "Total Bs.", align: "right" }
    ],
    rows,
    summary: [
      { label: "Meses", value: params.data.meses.length },
      { label: "Productos con movimiento", value: productCount },
      { label: "Total general", value: Number(totalGeneral.toFixed(2)) }
    ]
  };
}

export function buildEntradasAlmacenApiReportDefinition(
  response: EntradasAlmacenReportResponse
): InventoryReportDefinition {
  return buildMovimientoAlmacenApiReportDefinition({
    type: "entradas-almacen",
    title: "Entradas De Almacen General Mina Lipeña",
    quantityLabel: "Cantidad Ingresada",
    data: {
      ...response.data,
      meses: response.data.meses.map((periodo) => ({
        ...periodo,
        grupos: periodo.grupos.map((grupo) => {
          const subGrupos = grupo.subGrupos.map((subGrupo) => ({
            ...subGrupo,
            productos: subGrupo.productos.map((producto) => ({
              ...producto,
              cantidad: producto.ingresoQty,
              totalBs:
                producto.totalBsEntrada ??
                producto.totalBs ??
                producto.ingresoQty * producto.precioUnit
            }))
          }));
          const totalProductos = subGrupos.reduce(
            (total, subGrupo) =>
              total + subGrupo.productos.reduce((subtotal, producto) => subtotal + producto.totalBs, 0),
            0
          );

          return {
            ...grupo,
            totalBs: grupo.totalBsEntrada ?? grupo.totalBs ?? totalProductos,
            subGrupos
          };
        })
      }))
    }
  });
}

export function buildSalidasAlmacenApiReportDefinition(
  response: SalidasAlmacenReportResponse
): InventoryReportDefinition {
  return buildMovimientoAlmacenApiReportDefinition({
    type: "salidas-almacen",
    title: "Salidas De Almacen General Mina Lipeña",
    quantityLabel: "Cantidad Despachada",
    data: {
      ...response.data,
      meses: response.data.meses.map((periodo) => ({
        ...periodo,
        grupos: periodo.grupos.map((grupo) => ({
          ...grupo,
          totalBs: grupo.totalBsSalida,
          subGrupos: grupo.subGrupos.map((subGrupo) => ({
            ...subGrupo,
            productos: subGrupo.productos.map((producto) => ({
              ...producto,
              cantidad: producto.salidaQty,
              totalBs: producto.totalBsSalida
            }))
          }))
        }))
      }))
    }
  });
}
