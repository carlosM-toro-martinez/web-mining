import type { CreateGastoCajaPayload } from "@/features/gastoCaja/model/gastoCaja.schema";

const STORAGE_KEY = "caja-chica:gastos-pendientes";

export interface GastoCajaPendiente {
  localId: string;
  payload: CreateGastoCajaPayload;
  createdAt: string;
  intentos: number;
  ultimoError?: string;
}

function readQueue(): GastoCajaPendiente[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeQueue(queue: GastoCajaPendiente[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(queue));
  } catch {
    // Almacenamiento no disponible (modo privado, cuota excedida, etc.):
    // se pierde el respaldo offline puntual, no la aplicación.
  }
}

export function getGastosPendientes(): GastoCajaPendiente[] {
  return readQueue();
}

export function addGastoPendiente(payload: CreateGastoCajaPayload): GastoCajaPendiente {
  const item: GastoCajaPendiente = {
    localId: crypto.randomUUID(),
    payload,
    createdAt: new Date().toISOString(),
    intentos: 0
  };
  writeQueue([...readQueue(), item]);
  return item;
}

export function removeGastoPendiente(localId: string) {
  writeQueue(readQueue().filter((item) => item.localId !== localId));
}

export function marcarIntentoFallido(localId: string, error: string) {
  writeQueue(
    readQueue().map((item) =>
      item.localId === localId ? { ...item, intentos: item.intentos + 1, ultimoError: error } : item
    )
  );
}
