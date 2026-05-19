import Dexie, { type EntityTable } from "dexie";

export type InventoryOfflineOperationType =
  | "CREATE_COMPRA"
  | "RECIBIR_COMPRA"
  | "CREATE_VALE"
  | "ENTREGAR_VALE"
  | "CREATE_AND_ENTREGAR_VALE";

export interface InventoryOfflineOperation {
  id: number;
  operationType: InventoryOfflineOperationType;
  payloadJson: string;
  createdAt: string;
  attempts: number;
  lastError?: string;
}

class InventoryOfflineDb extends Dexie {
  operations!: EntityTable<InventoryOfflineOperation, "id">;

  constructor() {
    super("inventory_offline_db");
    this.version(1).stores({
      operations: "++id, operationType, createdAt"
    });
  }
}

export const inventoryOfflineDb = new InventoryOfflineDb();
