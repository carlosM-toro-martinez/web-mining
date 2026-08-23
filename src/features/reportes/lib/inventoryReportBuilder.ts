import type { Producto } from "@/features/productos/model/producto.schema";
import type {
  AnulacionesEntradasReportResponse,
  AnulacionesSalidasReportResponse,
  BalanceMensualReportResponse,
  BinCardValoradoItem,
  CuadroSuministrosReportResponse,
  DetalleMaterialesReportResponse,
  DiarioAlmacenesReportResponse,
  EntradasAlmacenReportResponse,
  InventarioAlmacenReportResponse,
  SaldosInicialesReportResponse,
  SalidasAlmacenReportResponse,
  SalidasDetalleReportResponse
} from "@/features/reportes/model/reportes.schema";

export type InventoryReportType =
  | "balance-mensual"
  | "inventario-general"
  | "saldos-iniciales"
  | "detalle-materiales"
  | "diario-almacenes"
  | "inventarios-suministros"
  | "entradas-almacen"
  | "salidas-almacen"
  | "salidas-detalle"
  | "anulaciones-entradas"
  | "anulaciones-salidas"
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
  sourceResponse?: unknown;
};

type BuildContext = {
  type: InventoryReportType;
  items: BinCardValoradoItem[];
  productos: Producto[];
  dateLabel: string;
};

const MONTH_NAMES = [
  "ENERO",
  "FEBRERO",
  "MARZO",
  "ABRIL",
  "MAYO",
  "JUNIO",
  "JULIO",
  "AGOSTO",
  "SEPTIEMBRE",
  "OCTUBRE",
  "NOVIEMBRE",
  "DICIEMBRE"
];

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

function roundMoney(value: number) {
  return Number(value.toFixed(2));
}

function totalMenos13(value: number) {
  return roundMoney(value * 0.87);
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

export function buildDetalleMaterialesApiReportDefinition(
  response: DetalleMaterialesReportResponse,
  reportType: "detalle-materiales" | "costo-produccion" = "detalle-materiales"
): InventoryReportDefinition {
  const { data } = response;
  const rows: InventoryReportRow[] = [];
  let lineCount = 0;

  if (reportType === "costo-produccion" && data.meses.some((periodo) => periodo.porCuenta.length)) {
    for (const periodo of data.meses) {
      rows.push({
        id: `periodo-costo-produccion-${periodo.anio}-${periodo.mes}`,
        type: "group",
        values: {
          periodo: `${formatMonth(periodo.anio, periodo.mes)} ${periodo.esCerrado ? "(cerrado)" : "(abierto)"}`,
          seccion: "",
          subCuenta: "",
          subCentro: "",
          detalle: "",
          cantidad: "",
          importeBs: "",
          subtotalBs: ""
        }
      });

      for (const cuenta of periodo.porCuenta) {
        const sectionName = cuenta.esTransporte
          ? cuenta.vehiculo ?? cuenta.funcionGastoNombre ?? cuenta.centroCostoNombre ?? "Transporte"
          : cuenta.centroCostoNombre ?? cuenta.funcionGastoNombre ?? "Costo";
        rows.push({
          id: `cuenta-costo-${periodo.anio}-${periodo.mes}-${cuenta.codigoCompleto}-${sectionName}`,
          type: "subtotal",
          values: {
            periodo: formatMonth(periodo.anio, periodo.mes),
            seccion: sectionName,
            subCuenta: cuenta.codigoCompleto ?? "",
            subCentro: "",
            detalle: cuenta.esTransporte ? "DETALLE DE TRANSPORTE" : "DETALLE POR FUNCION DEL GASTO",
            cantidad: cuenta.totalCantidad ?? "",
            importeBs: "",
            subtotalBs: Number(cuenta.totalBs.toFixed(2))
          }
        });

        if (cuenta.esTransporte) {
          cuenta.detalles.forEach((detalle, index) => {
            lineCount += 1;
            rows.push({
              id: `detalle-transporte-${periodo.anio}-${periodo.mes}-${cuenta.codigoCompleto}-${index}`,
              values: {
                periodo: formatMonth(periodo.anio, periodo.mes),
                seccion: sectionName,
                subCuenta: "",
                subCentro: detalle.unidad ?? "",
                detalle: `${detalle.productoNombre ?? ""}${detalle.vehiculo ? ` - ${detalle.vehiculo}` : ""}`,
                cantidad: detalle.cantidad,
                importeBs: Number(detalle.importeBs.toFixed(2)),
                subtotalBs: ""
              }
            });
          });
        } else {
          const totalsBySubCentro = new Map<string, number>();
          cuenta.lineas.forEach((linea) => {
            const key = linea.subCentro ?? "";
            totalsBySubCentro.set(key, (totalsBySubCentro.get(key) ?? 0) + linea.importeBs);
          });
          const lastIndexBySubCentro = new Map<string, number>();
          cuenta.lineas.forEach((linea, index) => lastIndexBySubCentro.set(linea.subCentro ?? "", index));
          cuenta.lineas.forEach((linea, index) => {
            lineCount += 1;
            const key = linea.subCentro ?? "";
            rows.push({
              id: `detalle-costo-${periodo.anio}-${periodo.mes}-${cuenta.codigoCompleto}-${index}`,
              values: {
                periodo: formatMonth(periodo.anio, periodo.mes),
                seccion: sectionName,
                subCuenta: linea.subCuenta ?? "",
                subCentro: linea.subCentro ?? "",
                detalle: linea.subCentroNombre ?? "",
                cantidad: "",
                importeBs: Number(linea.importeBs.toFixed(2)),
                subtotalBs:
                  lastIndexBySubCentro.get(key) === index
                    ? Number((totalsBySubCentro.get(key) ?? linea.importeBs).toFixed(2))
                    : ""
              }
            });
          });
        }
      }

      rows.push({
        id: `total-costo-produccion-${periodo.anio}-${periodo.mes}`,
        type: "total",
        values: {
          periodo: formatMonth(periodo.anio, periodo.mes),
          seccion: "TOTAL GENERAL",
          subCuenta: "",
          subCentro: "",
          detalle: "",
          cantidad: "",
          importeBs: "",
          subtotalBs: Number(periodo.totalGeneral.toFixed(2))
        }
      });
    }

    const totalGeneral = data.meses.reduce((sum, periodo) => sum + periodo.totalGeneral, 0);
    return {
      type: "costo-produccion",
      title: "Detalle De Materiales Costo De Produccion",
      subtitle: `Correspondiente a: ${formatRangeLabel(data)}`,
      columns: [
        { key: "periodo", label: "Periodo", align: "center" },
        { key: "seccion", label: "Seccion" },
        { key: "subCuenta", label: "Sub Cuenta", align: "center" },
        { key: "subCentro", label: "Sub Centro / Unidad", align: "center" },
        { key: "detalle", label: "Detalle" },
        { key: "cantidad", label: "Cantidad", align: "right" },
        { key: "importeBs", label: "Importe Bs.", align: "right" },
        { key: "subtotalBs", label: "Sub Totales Funcion Del Gasto Bs.", align: "right" }
      ],
      rows,
      summary: [
        { label: "Meses", value: data.meses.length },
        { label: "Secciones", value: data.meses.reduce((sum, periodo) => sum + periodo.porCuenta.length, 0) },
        { label: "Lineas", value: lineCount },
        { label: "Total general", value: Number(totalGeneral.toFixed(2)) }
      ],
      sourceResponse: response
    };
  }

  for (const periodo of data.meses) {
    const subtotals = new Map(
      periodo.subtotalesPorSubCentro.map((subtotal) => [
        subtotal.subCentro ?? "",
        { nombre: subtotal.nombre ?? "", importeBs: subtotal.importeBs }
      ])
    );
    const bySubCentro = new Map<string, typeof periodo.lineas>();

    for (const linea of periodo.lineas) {
      const key = linea.subCentro ?? "";
      const chunk = bySubCentro.get(key);
      if (chunk) chunk.push(linea);
      else bySubCentro.set(key, [linea]);
    }

    rows.push({
      id: `periodo-detalle-materiales-${periodo.anio}-${periodo.mes}`,
      type: "group",
      values: {
        periodo: `${formatMonth(periodo.anio, periodo.mes)} ${periodo.esCerrado ? "(cerrado)" : "(abierto)"}`,
        subCuenta: "",
        subCentro: "",
        importeBs: "",
        subtotalBs: ""
      }
    });

    for (const [subCentro, lineas] of [...bySubCentro.entries()].sort((a, b) =>
      a[0].localeCompare(b[0])
    )) {
      const subtotal = subtotals.get(subCentro);
      rows.push({
        id: `subcentro-${periodo.anio}-${periodo.mes}-${subCentro}`,
        type: "group",
        values: {
          periodo: formatMonth(periodo.anio, periodo.mes),
          subCuenta: "",
          subCentro: `${subCentro} ${subtotal?.nombre ?? lineas[0]?.subCentroNombre ?? ""}`.trim(),
          importeBs: "",
          subtotalBs: ""
        }
      });

      for (const linea of lineas.sort((a, b) => (a.subCuenta ?? "").localeCompare(b.subCuenta ?? ""))) {
        lineCount += 1;
        rows.push({
          id: `detalle-materiales-${periodo.anio}-${periodo.mes}-${subCentro}-${linea.subCuenta}-${lineCount}`,
          values: {
            periodo: formatMonth(periodo.anio, periodo.mes),
            subCuenta: linea.subCuenta ?? "",
            subCentro: linea.subCentro ?? "",
            importeBs: Number(linea.importeBs.toFixed(2)),
            subtotalBs: ""
          }
        });
      }

      rows.push({
        id: `subtotal-detalle-materiales-${periodo.anio}-${periodo.mes}-${subCentro}`,
        type: "subtotal",
        values: {
          periodo: formatMonth(periodo.anio, periodo.mes),
          subCuenta: "",
          subCentro: `SUBTOTAL ${subCentro}`,
          importeBs: "",
          subtotalBs: Number((subtotal?.importeBs ?? 0).toFixed(2))
        }
      });
    }

    rows.push({
      id: `total-detalle-materiales-${periodo.anio}-${periodo.mes}`,
      type: "total",
      values: {
        periodo: formatMonth(periodo.anio, periodo.mes),
        subCuenta: "",
        subCentro: "TOTAL GENERAL",
        importeBs: "",
        subtotalBs: Number(periodo.totalGeneral.toFixed(2))
      }
    });
  }

  const totalGeneral = data.meses.reduce((sum, periodo) => sum + periodo.totalGeneral, 0);

  return {
    type: "detalle-materiales",
    title: "Detalle De Materiales Costo De Produccion",
    subtitle: `Correspondiente a: ${formatRangeLabel(data)}`,
    columns: [
      { key: "periodo", label: "Periodo", align: "center" },
      { key: "subCuenta", label: "Sub Cuenta", align: "center" },
      { key: "subCentro", label: "Sub Centro" },
      { key: "importeBs", label: "Importe Bs.", align: "right" },
      { key: "subtotalBs", label: "Sub Totales Funcion Del Gasto Bs.", align: "right" }
    ],
    rows,
    summary: [
      { label: "Meses", value: data.meses.length },
      { label: "Lineas", value: lineCount },
      { label: "Total general", value: Number(totalGeneral.toFixed(2)) }
    ],
    sourceResponse: response
  };
}

type DiarioPeriodo = DiarioAlmacenesReportResponse["data"]["meses"][number];
type DiarioSectorHaber = DiarioPeriodo["sectoresHaber"][number];

function diarioSectorLineas(sector: DiarioSectorHaber) {
  const centroCostos = sector.centroCostos ?? [];
  const funcionGastos = sector.funcionGastos ?? [];
  const desdeCentros = centroCostos.flatMap((centroCosto) =>
    (centroCosto.subCuentas ?? []).map((subCuenta) => ({
      id: subCuenta.codigoCompleto ?? `${centroCosto.centroCostoCodigo ?? ""}-${subCuenta.funcionGastoCodigo ?? ""}`,
      centroCostoCodigo: centroCosto.centroCostoCodigo ?? "",
      funcionGastoCodigo: subCuenta.funcionGastoCodigo ?? "",
      funcionGastoNombre: subCuenta.funcionGastoNombre ?? centroCosto.centroCostoNombre ?? "",
      totalBs: subCuenta.totalBs
    }))
  );
  if (desdeCentros.length) return desdeCentros;
  return funcionGastos.map((funcionGasto) => ({
    id: funcionGasto.codigo ?? "",
    centroCostoCodigo: "",
    funcionGastoCodigo: funcionGasto.codigo ?? "",
    funcionGastoNombre: funcionGasto.nombre ?? "",
    totalBs: funcionGasto.totalBs
  }));
}

function reportCuentaKey(value?: string | null) {
  return (value ?? "").replace(/[^\d]/g, "");
}

function diarioSectorOrderValue(sector: DiarioSectorHaber) {
  const order = [
    "22001008",
    "35001000",
    "44002000",
    "22001010",
    "67001010",
    "22001009",
    "67001009",
    "100001000",
    "104001000"
  ];
  const index = order.indexOf(reportCuentaKey(sector.sectorCodigo));
  return index >= 0 ? index : order.length;
}

function sortDiarioSectores(sectores: DiarioSectorHaber[]) {
  return [...sectores].sort((a, b) => {
    const orderDiff = diarioSectorOrderValue(a) - diarioSectorOrderValue(b);
    if (orderDiff !== 0) return orderDiff;
    return (a.sectorNombre ?? "").localeCompare(b.sectorNombre ?? "", "es");
  });
}

function cuentaDetalleDiario(centroCostoCodigo?: string | null, funcionGastoCodigo?: string | null) {
  return [centroCostoCodigo, funcionGastoCodigo].filter(Boolean).join("-");
}

function shouldShowDiarioSectorDetails(sector: DiarioSectorHaber) {
  return reportCuentaKey(sector.sectorCodigo) === "100001000";
}

export function buildDiarioAlmacenesApiReportDefinition(
  response: DiarioAlmacenesReportResponse,
  reportType: "diario-almacenes" | "movimiento-almacen" = "diario-almacenes"
): InventoryReportDefinition {
  const { data } = response;
  const rows: InventoryReportRow[] = [];

  for (const periodo of data.meses) {
    if (reportType !== "diario-almacenes") {
      rows.push({
        id: `periodo-diario-${periodo.anio}-${periodo.mes}`,
        type: "group",
        values: {
          periodo: `${formatMonth(periodo.anio, periodo.mes)} ${periodo.esCerrado ? "(cerrado)" : "(abierto)"}`,
          cargos: "",
          descripcion: "",
          parcialesBs: "",
          cuenta: "",
          debeBs: "",
          haberBs: ""
        }
      });
    }

    if (reportType === "diario-almacenes" && periodo.sectoresHaber.length) {
      rows.push({
        id: `intro-diario-${periodo.anio}-${periodo.mes}`,
        type: "group",
        values: {
          periodo: formatMonth(periodo.anio, periodo.mes),
          cargos: "",
          descripcion: "CONTABILIZACION DIARIO ALMACENES MES:",
          parcialesBs: "",
          cuenta: "",
          debeBs: "",
          haberBs: ""
        }
      });
      rows.push({
        id: `intro-mes-diario-${periodo.anio}-${periodo.mes}`,
        type: "group",
        values: {
          periodo: "",
          cargos: "",
          descripcion: `${MONTH_NAMES[periodo.mes - 1]}-${periodo.anio}`,
          parcialesBs: "",
          cuenta: "",
          debeBs: "",
          haberBs: ""
        }
      });

      // Lookup sectorNombre → cuentasHaber entries (tienen centroCostoCodigo por cuenta)
      const sectorNombreToCuentas = new Map<string, typeof periodo.cuentasHaber>();
      for (const cuenta of periodo.cuentasHaber) {
        if (!cuenta.sectorNombre) continue;
        const arr = sectorNombreToCuentas.get(cuenta.sectorNombre) ?? [];
        arr.push(cuenta);
        sectorNombreToCuentas.set(cuenta.sectorNombre, arr);
      }

      for (const sector of sortDiarioSectores(periodo.sectoresHaber)) {
        const sectorKey = reportCuentaKey(sector.sectorCodigo);
        const showDetails = shouldShowDiarioSectorDetails(sector);
        const sectorCuentas = (sectorNombreToCuentas.get(sector.sectorNombre ?? "") ?? [])
          .sort((a, b) => (a.codigoCompleto ?? "").localeCompare(b.codigoCompleto ?? ""));
        const centroCodigo = sectorCuentas[0]?.centroCostoCodigo ?? "";
        const funcionCodigo = sector.funcionGastos[0]?.funcionGastoCodigo ?? "";

        rows.push({
          id: `sector-diario-${periodo.anio}-${periodo.mes}-${sectorKey}`,
          type: "group",
          values: {
            periodo: formatMonth(periodo.anio, periodo.mes),
            cargos: "",
            descripcion: (sector.sectorNombre ?? "SIN SECTOR").toUpperCase(),
            centroCostoCodigo: "",
            funcionGastoCodigo: "",
            parcialesBs: "",
            cuenta: sector.sectorCodigo ?? "",
            debeBs: showDetails ? Number(sector.totalBs.toFixed(2)) : "",
            haberBs: ""
          }
        });
        rows.push({
          id: `sector-aten-diario-${periodo.anio}-${periodo.mes}-${sectorKey}`,
          values: {
            periodo: "",
            cargos: "",
            descripcion: `Aten. Material mes de ${MONTH_NAMES[periodo.mes - 1]}- ${periodo.anio}`,
            centroCostoCodigo: showDetails ? "" : centroCodigo,
            funcionGastoCodigo: showDetails ? "" : funcionCodigo,
            parcialesBs: showDetails ? "" : Number(sector.totalBs.toFixed(2)),
            cuenta: "",
            debeBs: showDetails ? "" : Number(sector.totalBs.toFixed(2)),
            haberBs: ""
          }
        });

        if (showDetails) {
          const hasCuentaLineas = sectorCuentas.some(c => c.lineas.length > 0);
          if (hasCuentaLineas) {
            sectorCuentas.forEach((cuenta, ci) => {
              cuenta.lineas.forEach((linea, li) => {
                const fgCodigo = linea.subCentro ?? linea.funcionGastoCodigo ?? "";
                rows.push({
                  id: `sector-detalle-diario-${periodo.anio}-${periodo.mes}-${ci}-${li}`,
                  values: {
                    periodo: "",
                    cargos: "",
                    descripcion: linea.nombre ?? linea.funcionGastoNombre ?? "",
                    centroCostoCodigo: cuenta.centroCostoCodigo ?? "",
                    funcionGastoCodigo: fgCodigo,
                    parcialesBs: Number(linea.importeBs.toFixed(2)),
                    cuenta: cuentaDetalleDiario(cuenta.centroCostoCodigo, fgCodigo),
                    debeBs: "",
                    haberBs: ""
                  }
                });
              });
            });
          } else {
            for (const linea of diarioSectorLineas(sector)) {
              rows.push({
                id: `sector-detalle-diario-${periodo.anio}-${periodo.mes}-${linea.id || rows.length}`,
                values: {
                  periodo: "",
                  cargos: "",
                  descripcion: linea.funcionGastoNombre,
                  centroCostoCodigo: linea.centroCostoCodigo,
                  funcionGastoCodigo: linea.funcionGastoCodigo,
                  parcialesBs: Number(linea.totalBs.toFixed(2)),
                  cuenta: cuentaDetalleDiario(linea.centroCostoCodigo, linea.funcionGastoCodigo),
                  debeBs: "",
                  haberBs: ""
                }
              });
            }
          }
        }
      }
    } else {
      rows.push({
        id: `inventario-debe-${periodo.anio}-${periodo.mes}`,
        type: "group",
        values: {
          periodo: formatMonth(periodo.anio, periodo.mes),
          cargos: "26 002 000",
          descripcion: "INVENTARIO MATERIAL Y SUMIN. LIPEÑA",
          parcialesBs: "",
          cuenta: "26.002.000",
          debeBs: Number(periodo.totalInventarioDebe.toFixed(2)),
          haberBs: ""
        }
      });
      rows.push({
        id: `saldo-anterior-${periodo.anio}-${periodo.mes}`,
        values: {
          periodo: "",
          cargos: "",
          descripcion: `Saldo inventario al  cierre anterior`,
          parcialesBs: Number(periodo.saldoInventarioAnterior.toFixed(2)),
          cuenta: "",
          debeBs: "",
          haberBs: ""
        }
      });
      rows.push({
        id: `compras-${periodo.anio}-${periodo.mes}`,
        values: {
          periodo: "",
          cargos: "",
          descripcion: "Cuadro Mat. y Sumin. del mes",
          parcialesBs: Number((periodo.comprasSinIva ?? periodo.comprasImporteBs).toFixed(2)),
          cuenta: "",
          debeBs: "",
          haberBs: ""
        }
      });

      for (const cuenta of periodo.cuentasHaber) {
        const isCostoProduccion = reportCuentaKey(cuenta.sectorCodigo ?? cuenta.codigoCompleto) === "100001000";
        rows.push({
          id: `haber-${periodo.anio}-${periodo.mes}-${cuenta.centroCostoCodigo}`,
          type: "group",
          values: {
            periodo: formatMonth(periodo.anio, periodo.mes),
            cargos: cuenta.centroCostoCodigo ?? "",
            descripcion: cuenta.centroCostoNombre ?? "",
            parcialesBs: isCostoProduccion ? "" : Number(cuenta.totalBs.toFixed(2)),
            cuenta: `${cuenta.centroCostoCodigo ?? ""}.000`.replace(/^\./, ""),
            debeBs: "",
            haberBs: isCostoProduccion ? "" : Number(cuenta.totalBs.toFixed(2))
          }
        });
        rows.push({
          id: `haber-atencion-${periodo.anio}-${periodo.mes}-${cuenta.centroCostoCodigo}`,
          values: {
            periodo: "",
            cargos: "",
            descripcion: `Aten. Material mes de ${MONTH_NAMES[periodo.mes - 1]}- ${periodo.anio}`,
            parcialesBs: "",
            cuenta: "",
            debeBs: "",
            haberBs: isCostoProduccion ? Number(cuenta.totalBs.toFixed(2)) : ""
          }
        });

        const funcionGastos = cuenta.funcionGastos.length
          ? cuenta.funcionGastos.map((funcion) => ({
              codigoCompleto: cuenta.codigoCompleto ?? "",
              funcionGastoCodigo: funcion.codigo,
              funcionGastoNombre: funcion.nombre,
              totalBs: funcion.totalBs
            }))
          : cuenta.subCentros;

        for (const subCentro of isCostoProduccion ? funcionGastos : []) {
          rows.push({
            id: `haber-sub-${periodo.anio}-${periodo.mes}-${cuenta.centroCostoCodigo}-${subCentro.codigoCompleto}-${subCentro.funcionGastoCodigo}`,
            values: {
              periodo: "",
              cargos: "",
              descripcion: `${subCentro.funcionGastoCodigo ?? ""} - ${subCentro.funcionGastoNombre ?? ""}`.trim(),
              parcialesBs: Number(subCentro.totalBs.toFixed(2)),
              cuenta: subCentro.codigoCompleto ?? "",
              debeBs: "",
              haberBs: ""
            }
          });
        }
      }
    }

    if (reportType === "diario-almacenes") {
      rows.push({
        id: `inventario-haber-diario-${periodo.anio}-${periodo.mes}`,
        type: "group",
        values: {
          periodo: formatMonth(periodo.anio, periodo.mes),
          cargos: "",
          descripcion: "INVENTARIO MATERIALES Y SUMINISTROS",
          parcialesBs: "",
          cuenta: "26.002.000",
          debeBs: "",
          haberBs: Number(periodo.totalSalidasHaber.toFixed(2))
        }
      });
      rows.push({
        id: `inventario-haber-detalle-diario-${periodo.anio}-${periodo.mes}`,
        values: {
          periodo: "",
          cargos: "",
          descripcion: "Según Vales Salida Materiales",
          parcialesBs: "",
          cuenta: "",
          debeBs: "",
          haberBs: ""
        }
      });
    }
    rows.push({
      id: `total-diario-${periodo.anio}-${periodo.mes}`,
      type: "total",
      values: {
        periodo: formatMonth(periodo.anio, periodo.mes),
        cargos: "",
        descripcion: "",
        parcialesBs: "",
        cuenta: "",
        debeBs: Number(
          (reportType === "diario-almacenes" ? periodo.totalSalidasHaber : periodo.totalInventarioDebe).toFixed(2)
        ),
        haberBs: Number(periodo.totalSalidasHaber.toFixed(2))
      }
    });
  }

  const totalDebe = data.meses.reduce(
    (sum, periodo) => sum + (reportType === "diario-almacenes" ? periodo.totalSalidasHaber : periodo.totalInventarioDebe),
    0
  );
  const totalHaber = data.meses.reduce((sum, periodo) => sum + periodo.totalSalidasHaber, 0);

  return {
    type: reportType,
    title: reportType === "movimiento-almacen" ? "Movimiento Almacen" : "Diario Almacenes",
    subtitle: `Correspondiente a: ${formatRangeLabel(data)}`,
    columns:
      reportType === "diario-almacenes"
        ? [
            { key: "descripcion", label: "Descripcion" },
            { key: "centroCostoCodigo", label: "Centro Costo", align: "center" },
            { key: "funcionGastoCodigo", label: "Funcion Gasto", align: "center" },
            { key: "parcialesBs", label: "Parciales Bs.", align: "right" },
            { key: "cuenta", label: "No De Cuenta", align: "center" },
            { key: "debeBs", label: "Debe Bs.", align: "right" },
            { key: "haberBs", label: "Haber Bs.", align: "right" }
          ]
        : [
            { key: "periodo", label: "Periodo", align: "center" },
            { key: "cargos", label: "Cargos", align: "center" },
            { key: "descripcion", label: "Descripcion" },
            { key: "parcialesBs", label: "Parciales Bs.", align: "right" },
            { key: "cuenta", label: "No De Cuenta", align: "center" },
            { key: "debeBs", label: "Debe Bs.", align: "right" },
            { key: "haberBs", label: "Haber Bs.", align: "right" }
          ],
    rows,
    summary: [
      { label: "Meses", value: data.meses.length },
      { label: "Total debe", value: Number(totalDebe.toFixed(2)) },
      { label: "Total haber", value: Number(totalHaber.toFixed(2)) }
    ],
    sourceResponse: response
  };
}

export function buildCuadroSuministrosApiReportDefinition(
  response: CuadroSuministrosReportResponse
): InventoryReportDefinition {
  const { data } = response;
  const rows: InventoryReportRow[] = [];
  let itemCount = 0;

  for (const periodo of data.meses) {
    rows.push({
      id: `periodo-cuadro-${periodo.anio}-${periodo.mes}`,
      type: "group",
      values: {
        periodo: `${formatMonth(periodo.anio, periodo.mes)} ${periodo.esCerrado ? "(cerrado)" : "(abierto)"}`,
        proveedor: "",
        factura: "",
        cantidad: "",
        unidad: "",
        descripcion: "",
        totalBs: "",
        sinIvaBs: "",
        grupo: ""
      }
    });

    for (const proveedor of periodo.proveedores) {
      const proveedorNombre = proveedor.proveedor?.nombre ?? "Sin proveedor";
      const proveedorSinIva = proveedor.totalSinIVA;
      rows.push({
        id: `proveedor-cuadro-${periodo.anio}-${periodo.mes}-${proveedorNombre}`,
        type: "group",
        values: {
          periodo: formatMonth(periodo.anio, periodo.mes),
          proveedor: proveedorNombre,
          factura: "",
          cantidad: "",
          unidad: "",
          descripcion: "",
          totalBs: Number(proveedor.totalBs.toFixed(2)),
          sinIvaBs: proveedorSinIva == null ? "" : Number(proveedorSinIva.toFixed(2)),
          grupo: ""
        }
      });

      for (const compra of proveedor.compras) {
        compra.items.forEach((item, index) => {
          itemCount += 1;
          rows.push({
            id: `cuadro-item-${periodo.anio}-${periodo.mes}-${compra.id}-${index}`,
            values: {
              periodo: "",
              proveedor: "",
              factura: index === 0 ? compra.numeroFactura ?? "" : "",
              cantidad: Number(item.cantidad.toFixed(2)),
              unidad: item.unidad ?? "",
              descripcion: item.nombre ?? "",
              totalBs: Number(item.importeBs.toFixed(2)),
              sinIvaBs: item.importeSinIVA,
              grupo: item.grupo?.codigo ?? ""
            }
          });
        });
      }
    }

    const periodoSinIva =
      periodo.totalGeneralSinIVA ?? periodo.totalSinIVA ?? periodo.totalGeneralMenos13;
    rows.push({
      id: `total-cuadro-${periodo.anio}-${periodo.mes}`,
      type: "total",
      values: {
        periodo: formatMonth(periodo.anio, periodo.mes),
        proveedor: "",
        factura: "",
        cantidad: "",
        unidad: "",
        descripcion: "TOTAL GENERAL",
        totalBs: Number(periodo.totalGeneral.toFixed(2)),
        sinIvaBs: periodoSinIva == null ? "" : Number(periodoSinIva.toFixed(2)),
        grupo: ""
      }
    });
  }

  const totalGeneral = data.meses.reduce((sum, periodo) => sum + periodo.totalGeneral, 0);
  const totalGeneralSinIva = data.meses.reduce((sum, periodo) => {
    const periodoSinIva =
      periodo.totalGeneralSinIVA ?? periodo.totalSinIVA ?? periodo.totalGeneralMenos13;
    return sum + (periodoSinIva ?? 0);
  }, 0);
  const hasTotalGeneralSinIva = data.meses.some(
    (periodo) =>
      periodo.totalGeneralSinIVA != null ||
      periodo.totalSinIVA != null ||
      periodo.totalGeneralMenos13 != null
  );

  return {
    type: "inventarios-suministros",
    title: "Cuadro De Inventarios Y Suministros",
    subtitle: `Correspondiente a: ${formatRangeLabel(data)}`,
    columns: [
      { key: "periodo", label: "Periodo", align: "center" },
      { key: "proveedor", label: "Proveedor" },
      { key: "factura", label: "No Factura", align: "center" },
      { key: "cantidad", label: "Cantidad", align: "right" },
      { key: "unidad", label: "Unidad", align: "center" },
      { key: "descripcion", label: "Descripcion" },
      { key: "totalBs", label: "F-total Bs.", align: "right" },
      { key: "sinIvaBs", label: "(-13%) Bs.", align: "right" },
      { key: "grupo", label: "Grupo", align: "center" }
    ],
    rows,
    summary: [
      { label: "Meses", value: data.meses.length },
      { label: "Items", value: itemCount },
      { label: "Total general", value: Number(totalGeneral.toFixed(2)) },
      {
        label: "Total general -13%",
        value: hasTotalGeneralSinIva ? Number(totalGeneralSinIva.toFixed(2)) : ""
      }
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
    type: "saldos-iniciales",
    title: "Saldos Iniciales",
    description: "Totales iniciales por mes, grupo y producto, indicando fuente corregida o calculada."
  },
  {
    type: "inventarios-suministros",
    title: "Inventarios Y Suministros",
    description: "Cuadro de compras por proveedor, factura, grupo y valor sin IVA."
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
    type: "salidas-detalle",
    title: "Salidas Detalle",
    description: "Auditoria de salidas por cuenta, centro, funcion, sector y movimientos sin cuenta."
  },
  {
    type: "anulaciones-entradas",
    title: "Anulaciones De Entradas",
    description: "Compras anuladas con detalle de productos, motivo y usuario de anulacion."
  },
  {
    type: "anulaciones-salidas",
    title: "Anulaciones De Salidas",
    description: "Vales anulados con detalle de productos, motivo y usuario de anulacion."
  },
  {
    type: "costo-produccion",
    title: "Costo De Produccion",
    description: "Detalle por subcuenta, subcentro y funcion de gasto con subtotales."
  },
  {
    type: "detalle-materiales",
    title: "Detalle Materiales",
    description: "Costo de produccion por subcuenta y subcentro con subtotales."
  },
  {
    type: "movimiento-almacen",
    title: "Movimiento Almacen",
    description: "Asiento consolidado de cargos, debe y haber del periodo."
  },
  {
    type: "diario-almacenes",
    title: "Diario Almacenes",
    description: "Comprobante de diario y movimiento contable de almacenes."
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
          saldoInicial: roundMoney(grupo.saldoInicial),
          ingresoMateriales: roundMoney(grupo.ingresoMateriales),
          salidaMateriales: roundMoney(grupo.salidaMateriales),
          saldoFinal: roundMoney(grupo.saldoFinal)
        }
      });
    }

    rows.push({
      id: `total-${periodo.anio}-${periodo.mes}`,
      type: "subtotal",
      values: {
        periodo: formatMonth(periodo.anio, periodo.mes),
        grupo: "TOTAL PERIODO",
        saldoInicial: roundMoney(periodo.totales.saldoInicial),
        ingresoMateriales: roundMoney(periodo.totales.ingresoMateriales),
        salidaMateriales: roundMoney(periodo.totales.salidaMateriales),
        saldoFinal: roundMoney(periodo.totales.saldoFinal)
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
      saldoInicial: roundMoney(totals.saldoInicial),
      ingresoMateriales: roundMoney(totals.ingresoMateriales),
      salidaMateriales: roundMoney(totals.salidaMateriales),
      saldoFinal: roundMoney(totals.saldoFinal)
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
    totalGeneralMenos13?: number;
    grupos: Array<{
      codigo?: string | null;
      nombre?: string | null;
      totalBs: number;
      totalBsMenos13?: number;
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
          totalBsMenos13?: number;
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
  const useApiMenos13Only = params.type === "entradas-almacen";

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
        totalBs: "",
        totalBsMenos13: ""
      }
    });

    for (const grupo of periodo.grupos) {
      const grupoTotal = roundMoney(grupo.totalBs);
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
          totalBs: grupoTotal,
          totalBsMenos13:
            grupo.totalBsMenos13 ?? (useApiMenos13Only ? "" : totalMenos13(grupoTotal))
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
            totalBs: "",
            totalBsMenos13: ""
          }
        });

        for (const producto of subGrupo.productos) {
          productCount += 1;
          const productoTotal = roundMoney(producto.totalBs);
          rows.push({
            id: `producto-${params.type}-${periodo.anio}-${periodo.mes}-${producto.codigo ?? productCount}`,
            values: {
              periodo: formatMonth(periodo.anio, periodo.mes),
              codigo: producto.codigo ?? "-",
              descripcion: producto.nombre ?? "Sin nombre",
              unidad: producto.unidad ?? "-",
              cantidad: roundMoney(producto.cantidad),
              precioUnit: roundMoney(producto.precioUnit),
              totalBs: productoTotal,
              totalBsMenos13:
                producto.totalBsMenos13 ?? (useApiMenos13Only ? "" : totalMenos13(productoTotal))
            }
          });
        }

        const subGrupoTotal = roundMoney(subGrupoTotales.totalBs);
        rows.push({
          id: `subgrupo-total-${params.type}-${periodo.anio}-${periodo.mes}-${grupo.codigo ?? "grupo"}-${subGrupo.codigo ?? rows.length}`,
          type: "subtotal",
          values: {
            periodo: formatMonth(periodo.anio, periodo.mes),
            codigo: "",
            descripcion: `TOTAL SUB-GRUPO ${subGrupo.codigo ?? "-"} ${subGrupo.nombre ?? "Sin subgrupo"}`,
            unidad: "",
            cantidad: roundMoney(subGrupoTotales.cantidad),
            precioUnit: "",
            totalBs: subGrupoTotal,
            totalBsMenos13: useApiMenos13Only ? "" : totalMenos13(subGrupoTotal)
          }
        });
      }
    }

    const periodoTotal = roundMoney(periodo.totalGeneral);
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
        totalBs: periodoTotal,
        totalBsMenos13:
          periodo.totalGeneralMenos13 ?? (useApiMenos13Only ? "" : totalMenos13(periodoTotal))
      }
    });
  }

  const totalGeneral = params.data.meses.reduce(
    (total, periodo) => total + periodo.totalGeneral,
    0
  );
  const totalGeneralMenos13 = params.data.meses.reduce(
    (total, periodo) =>
      total +
      (periodo.totalGeneralMenos13 ??
        (useApiMenos13Only ? 0 : totalMenos13(periodo.totalGeneral))),
    0
  );
  const hasTotalGeneralMenos13 = params.data.meses.some(
    (periodo) => periodo.totalGeneralMenos13 != null
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
      { key: "totalBs", label: "Total Bs.", align: "right" },
      { key: "totalBsMenos13", label: "Total -13% Bs.", align: "right" }
    ],
    rows,
    summary: [
      { label: "Meses", value: params.data.meses.length },
      { label: "Productos con movimiento", value: productCount },
      { label: "Total general", value: roundMoney(totalGeneral) },
      {
        label: "Total general -13%",
        value: useApiMenos13Only && !hasTotalGeneralMenos13 ? "" : roundMoney(totalGeneralMenos13)
      }
    ]
  };
}

export function buildSaldosInicialesApiReportDefinition(
  response: SaldosInicialesReportResponse
): InventoryReportDefinition {
  const { data } = response;
  const rows: InventoryReportRow[] = [];
  let productCount = 0;

  for (const periodo of data.meses) {
    rows.push({
      id: `periodo-saldos-iniciales-${periodo.anio}-${periodo.mes}`,
      type: "group",
      values: {
        periodo: `${formatMonth(periodo.anio, periodo.mes)} ${periodo.esCerrado ? "(cerrado)" : "(abierto)"}`,
        codigo: "",
        descripcion: `Productos: ${periodo.meta.totalProductos} | Corregidos: ${periodo.meta.corregidos} | Calculados: ${periodo.meta.calculados}`,
        unidad: "",
        saldoInicial: "",
        precioUnit: "",
        totalBsInicial: Number(periodo.totalGeneral.toFixed(2)),
        fuente: ""
      }
    });

    for (const grupo of periodo.grupos) {
      rows.push({
        id: `grupo-saldos-iniciales-${periodo.anio}-${periodo.mes}-${grupo.grupoCodigo ?? grupo.grupoNombre ?? "sg"}`,
        type: "subtotal",
        values: {
          periodo: formatMonth(periodo.anio, periodo.mes),
          codigo: grupo.grupoCodigo ?? "",
          descripcion: grupo.grupoNombre ?? "Sin grupo",
          unidad: "",
          saldoInicial: "",
          precioUnit: "",
          totalBsInicial: Number(grupo.totalBsInicial.toFixed(2)),
          fuente: "subtotal grupo"
        }
      });

      for (const producto of grupo.productos) {
        productCount += 1;
        rows.push({
          id: `producto-saldos-iniciales-${periodo.anio}-${periodo.mes}-${producto.codigo ?? productCount}`,
          values: {
            periodo: formatMonth(periodo.anio, periodo.mes),
            codigo: producto.codigo ?? "",
            descripcion: producto.nombre ?? "",
            unidad: producto.unidad ?? "",
            saldoInicial: producto.saldoInicial,
            precioUnit: Number(producto.precioUnit.toFixed(4)),
            totalBsInicial: Number(producto.totalBsInicial.toFixed(2)),
            fuente: producto.fuente
          }
        });
      }
    }
  }

  const totalGeneral = data.meses.reduce((sum, periodo) => sum + periodo.totalGeneral, 0);
  const totalCorregidos = data.meses.reduce((sum, periodo) => sum + periodo.meta.corregidos, 0);
  const totalCalculados = data.meses.reduce((sum, periodo) => sum + periodo.meta.calculados, 0);

  return {
    type: "saldos-iniciales",
    title: "Saldos Iniciales",
    subtitle: `Correspondiente a: ${formatRangeLabel(data)}`,
    columns: [
      { key: "periodo", label: "Periodo" },
      { key: "codigo", label: "Codigo" },
      { key: "descripcion", label: "Descripcion" },
      { key: "unidad", label: "Unidad", align: "center" },
      { key: "saldoInicial", label: "Saldo Inicial", align: "right" },
      { key: "precioUnit", label: "P. Unit.", align: "right" },
      { key: "totalBsInicial", label: "Total Bs. Inicial", align: "right" },
      { key: "fuente", label: "Fuente" }
    ],
    rows,
    summary: [
      { label: "Meses", value: data.meses.length },
      { label: "Productos", value: productCount },
      { label: "Corregidos", value: totalCorregidos },
      { label: "Calculados", value: totalCalculados },
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
                producto.ingresoQty * producto.precioUnit,
              totalBsMenos13: producto.totalBsEntradaMenos13
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
            totalBsMenos13: grupo.totalBsEntradaMenos13,
            subGrupos
          };
        }),
        totalGeneralMenos13: periodo.totalGeneralMenos13
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
          totalBsMenos13: grupo.totalBsSalidaMenos13 ?? totalMenos13(grupo.totalBsSalida),
          subGrupos: grupo.subGrupos.map((subGrupo) => ({
            ...subGrupo,
            productos: subGrupo.productos.map((producto) => ({
              ...producto,
              cantidad: producto.salidaQty,
              totalBs: producto.totalBsSalida,
              totalBsMenos13:
                producto.totalBsSalidaMenos13 ?? totalMenos13(producto.totalBsSalida)
            }))
          }))
        })),
        totalGeneralMenos13:
          periodo.totalGeneralMenos13 ?? totalMenos13(periodo.totalGeneral)
      }))
    }
  });
}

function formatReportDate(value?: string | null) {
  if (!value) return "";
  const midnightUtcMatch = /^(\d{4})-(\d{2})-(\d{2})T00:00:00(?:\.000)?Z$/.exec(value);
  if (midnightUtcMatch) {
    const [, year, month, day] = midnightUtcMatch;
    return `${day}/${month}/${year}`;
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString("es-BO");
}

export function buildSalidasDetalleApiReportDefinition(
  response: SalidasDetalleReportResponse
): InventoryReportDefinition {
  const { data } = response;
  const rows: InventoryReportRow[] = data.movimientos.map((movimiento, index) => ({
    id: `salida-detalle-${movimiento.id}-${index}`,
    values: {
      periodo:
        movimiento.periodoAnio && movimiento.periodoMes
          ? formatMonth(movimiento.periodoAnio, movimiento.periodoMes)
          : "",
      fecha: formatReportDate(movimiento.fecha),
      referencia: [movimiento.referencia, movimiento.referenciaId].filter(Boolean).join(" "),
      codigo: movimiento.productoCodigo ?? "",
      producto: movimiento.productoNombre ?? "",
      unidad: movimiento.productoUnidad ?? "",
      cantidad: Number(movimiento.cantidad.toFixed(2)),
      precioUnit: movimiento.precioUnit ? Number(movimiento.precioUnit.toFixed(4)) : "",
      salidaBs: Number(movimiento.salidaBs.toFixed(2)),
      cuenta: movimiento.cuenta?.codigoCompleto ?? "SIN CUENTA",
      centroCosto: [
        movimiento.cuenta?.centroCostoCodigo,
        movimiento.cuenta?.centroCostoNombre
      ].filter(Boolean).join(" - "),
      funcionGasto: [
        movimiento.cuenta?.funcionGastoCodigo,
        movimiento.cuenta?.funcionGastoNombre
      ].filter(Boolean).join(" - "),
      sector: [movimiento.cuenta?.sectorCodigo, movimiento.cuenta?.sectorNombre]
        .filter(Boolean)
        .join(" - "),
      usuarioEntrega: movimiento.usuarioEntrega ?? ""
    }
  }));

  return {
    type: "salidas-detalle",
    title: "Salidas Detalle",
    subtitle: `Correspondiente a: ${formatRangeLabel(data)}`,
    columns: [
      { key: "periodo", label: "Periodo", align: "center" },
      { key: "fecha", label: "Fecha" },
      { key: "referencia", label: "Referencia" },
      { key: "codigo", label: "Codigo", align: "center" },
      { key: "producto", label: "Producto" },
      { key: "unidad", label: "Unidad", align: "center" },
      { key: "cantidad", label: "Cantidad", align: "right" },
      { key: "precioUnit", label: "P. Unit.", align: "right" },
      { key: "salidaBs", label: "Salida Bs.", align: "right" },
      { key: "cuenta", label: "Cuenta", align: "center" },
      { key: "centroCosto", label: "Centro Costo" },
      { key: "funcionGasto", label: "Funcion Gasto" },
      { key: "sector", label: "Sector" },
      { key: "usuarioEntrega", label: "Entrega" }
    ],
    rows,
    summary: [
      { label: "Movimientos", value: data.totalMovimientos },
      { label: "Sin cuenta", value: data.movimientosSinCuenta },
      { label: "Total Bs.", value: Number(data.totalBs.toFixed(2)) }
    ],
    sourceResponse: response
  };
}

export function buildAnulacionesEntradasApiReportDefinition(
  response: AnulacionesEntradasReportResponse
): InventoryReportDefinition {
  const { data } = response;
  const rows: InventoryReportRow[] = [];
  let itemCount = 0;

  for (const periodo of data.meses) {
    rows.push({
      id: `periodo-anulaciones-entradas-${periodo.anio}-${periodo.mes}`,
      type: "group",
      values: {
        periodo: `${formatMonth(periodo.anio, periodo.mes)} ${periodo.esCerrado ? "(cerrado)" : "(abierto)"}`,
        documento: "",
        fechaOperacion: "",
        proveedor: "",
        producto: "",
        cantidad: "",
        precioUnit: "",
        motivo: "",
        anuladoPor: "",
        fechaAnulacion: ""
      }
    });

    for (const compra of periodo.comprasAnuladas) {
      if (!compra.items.length) {
        rows.push({
          id: `compra-anulada-${compra.id}`,
          values: {
            periodo: formatMonth(periodo.anio, periodo.mes),
            documento: compra.numeroFactura ?? `Compra ${compra.id}`,
            fechaOperacion: formatReportDate(compra.fechaOperacion),
            proveedor: compra.proveedor?.nombre ?? "",
            producto: "",
            cantidad: "",
            precioUnit: "",
            motivo: compra.anulacion?.motivo ?? "",
            anuladoPor: compra.anulacion?.usuario?.nombre ?? "",
            fechaAnulacion: formatReportDate(compra.anulacion?.creadoEn ?? compra.anulacion?.creadoAt)
          }
        });
        continue;
      }

      compra.items.forEach((item, index) => {
        itemCount += 1;
        rows.push({
          id: `compra-anulada-${compra.id}-${item.id}`,
          values: {
            periodo: index === 0 ? formatMonth(periodo.anio, periodo.mes) : "",
            documento: index === 0 ? compra.numeroFactura ?? `Compra ${compra.id}` : "",
            fechaOperacion: index === 0 ? formatReportDate(compra.fechaOperacion) : "",
            proveedor: index === 0 ? compra.proveedor?.nombre ?? "" : "",
            producto: `${item.producto?.codigo ?? "-"} - ${item.producto?.nombre ?? "Sin producto"} (${item.producto?.unidad ?? "-"})`,
            cantidad: Number((item.cantidadRecibida ?? item.cantidadSolicitada ?? 0).toFixed(2)),
            precioUnit: item.precioUnit ? Number(item.precioUnit.toFixed(2)) : "",
            motivo: index === 0 ? compra.anulacion?.motivo ?? "" : "",
            anuladoPor: index === 0 ? compra.anulacion?.usuario?.nombre ?? "" : "",
            fechaAnulacion:
              index === 0 ? formatReportDate(compra.anulacion?.creadoEn ?? compra.anulacion?.creadoAt) : ""
          }
        });
      });
    }
  }

  return {
    type: "anulaciones-entradas",
    title: "Anulaciones De Entradas",
    subtitle: `Correspondiente a: ${formatRangeLabel(data)}`,
    columns: [
      { key: "periodo", label: "Periodo" },
      { key: "documento", label: "Factura / Compra" },
      { key: "fechaOperacion", label: "Fecha Operacion" },
      { key: "proveedor", label: "Proveedor" },
      { key: "producto", label: "Producto" },
      { key: "cantidad", label: "Cantidad", align: "right" },
      { key: "precioUnit", label: "P. Unit.", align: "right" },
      { key: "motivo", label: "Motivo" },
      { key: "anuladoPor", label: "Anulado Por" },
      { key: "fechaAnulacion", label: "Fecha Anulacion" }
    ],
    rows,
    summary: [
      { label: "Meses", value: data.meses.length },
      {
        label: "Compras anuladas",
        value: data.meses.reduce((sum, periodo) => sum + periodo.comprasAnuladas.length, 0)
      },
      { label: "Items", value: itemCount }
    ]
  };
}

export function buildAnulacionesSalidasApiReportDefinition(
  response: AnulacionesSalidasReportResponse
): InventoryReportDefinition {
  const { data } = response;
  const rows: InventoryReportRow[] = [];
  let itemCount = 0;

  for (const periodo of data.meses) {
    rows.push({
      id: `periodo-anulaciones-salidas-${periodo.anio}-${periodo.mes}`,
      type: "group",
      values: {
        periodo: `${formatMonth(periodo.anio, periodo.mes)} ${periodo.esCerrado ? "(cerrado)" : "(abierto)"}`,
        documento: "",
        fechaOperacion: "",
        solicitante: "",
        producto: "",
        cantidad: "",
        motivo: "",
        anuladoPor: "",
        fechaAnulacion: ""
      }
    });

    for (const vale of periodo.valesAnulados) {
      if (!vale.items.length) {
        rows.push({
          id: `vale-anulado-${vale.id}`,
          values: {
            periodo: formatMonth(periodo.anio, periodo.mes),
            documento: vale.codigo ?? `Vale ${vale.id}`,
            fechaOperacion: formatReportDate(vale.fechaOperacion),
            solicitante: vale.solicitante?.nombre ?? "",
            producto: "",
            cantidad: "",
            motivo: vale.anulacion?.motivo ?? "",
            anuladoPor: vale.anulacion?.usuario?.nombre ?? "",
            fechaAnulacion: formatReportDate(vale.anulacion?.creadoEn ?? vale.anulacion?.creadoAt)
          }
        });
        continue;
      }

      vale.items.forEach((item, index) => {
        itemCount += 1;
        rows.push({
          id: `vale-anulado-${vale.id}-${item.id}`,
          values: {
            periodo: index === 0 ? formatMonth(periodo.anio, periodo.mes) : "",
            documento: index === 0 ? vale.codigo ?? `Vale ${vale.id}` : "",
            fechaOperacion: index === 0 ? formatReportDate(vale.fechaOperacion) : "",
            solicitante: index === 0 ? vale.solicitante?.nombre ?? "" : "",
            producto: `${item.producto?.codigo ?? "-"} - ${item.producto?.nombre ?? "Sin producto"} (${item.producto?.unidad ?? "-"})`,
            cantidad: Number((item.cantidad ?? 0).toFixed(2)),
            motivo: index === 0 ? vale.anulacion?.motivo ?? "" : "",
            anuladoPor: index === 0 ? vale.anulacion?.usuario?.nombre ?? "" : "",
            fechaAnulacion:
              index === 0 ? formatReportDate(vale.anulacion?.creadoEn ?? vale.anulacion?.creadoAt) : ""
          }
        });
      });
    }
  }

  return {
    type: "anulaciones-salidas",
    title: "Anulaciones De Salidas",
    subtitle: `Correspondiente a: ${formatRangeLabel(data)}`,
    columns: [
      { key: "periodo", label: "Periodo" },
      { key: "documento", label: "Vale" },
      { key: "fechaOperacion", label: "Fecha Operacion" },
      { key: "solicitante", label: "Solicitante" },
      { key: "producto", label: "Producto" },
      { key: "cantidad", label: "Cantidad", align: "right" },
      { key: "motivo", label: "Motivo" },
      { key: "anuladoPor", label: "Anulado Por" },
      { key: "fechaAnulacion", label: "Fecha Anulacion" }
    ],
    rows,
    summary: [
      { label: "Meses", value: data.meses.length },
      {
        label: "Vales anulados",
        value: data.meses.reduce((sum, periodo) => sum + periodo.valesAnulados.length, 0)
      },
      { label: "Items", value: itemCount }
    ]
  };
}
