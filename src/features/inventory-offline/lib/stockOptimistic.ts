import { queryClient } from "@/shared/lib/queryClient";
import { queryKeys } from "@/shared/lib/queryKeys";

interface StockAdjustment {
  productoId: number;
  deltaCantidad: number;
}

function toNumber(value: unknown) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function applyStockAdjustmentToData(
  data: Array<Record<string, unknown>>,
  adjustments: StockAdjustment[]
) {
  return data.map((row) => {
    const currentId = Number((row as { id?: unknown }).id);
    const match = adjustments.find((item) => item.productoId === currentId);
    if (!match) return row;

    const stockRaw = (row as { stock?: Record<string, unknown> | null }).stock ?? {};
    const cantidad = toNumber(stockRaw.cantidad) + match.deltaCantidad;
    const disponible = toNumber(stockRaw.cantidadDisponible) + match.deltaCantidad;

    return {
      ...row,
      stock: {
        ...stockRaw,
        cantidad: String(cantidad),
        cantidadDisponible: String(disponible)
      }
    };
  });
}

export function applyOptimisticStockAdjustments(adjustments: StockAdjustment[]) {
  const snapshots = queryClient.getQueriesData({ queryKey: queryKeys.productos.all });
  queryClient.setQueriesData({ queryKey: queryKeys.productos.all }, (previous) => {
    if (!previous || typeof previous !== "object") return previous;
    const prev = previous as { data?: unknown };
    if (!Array.isArray(prev.data)) return previous;
    return {
      ...prev,
      data: applyStockAdjustmentToData(prev.data as Array<Record<string, unknown>>, adjustments)
    };
  });
  return snapshots;
}

export function rollbackOptimisticStockAdjustments(
  snapshots: Array<[readonly unknown[], unknown]>
) {
  for (const [key, value] of snapshots) {
    queryClient.setQueryData(key, value);
  }
}

