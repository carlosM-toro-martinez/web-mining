import Dexie, { type EntityTable } from "dexie";

export type EmployeeSyncStatus = "PENDING" | "SYNCED";
export type SyncQueueAction = "CREATE" | "UPDATE";
export type SyncQueueStatus = "PENDING" | "DONE" | "ERROR";

export interface EmployeeRecord {
  id?: number;
  nombre: string;
  deviceUserId: string;
  syncStatus: EmployeeSyncStatus;
  remoteId?: number | string;
  createdAt: string;
  updatedAt: string;
}

export interface EmployeeSyncQueueRecord {
  id?: number;
  action: SyncQueueAction;
  payload: {
    localEmployeeId: number;
    remoteId?: number | string;
    nombre: string;
    deviceUserId: string;
  };
  status: SyncQueueStatus;
  createdAt: string;
  updatedAt: string;
  lastError?: string;
}

class EmployeeDb extends Dexie {
  employees!: EntityTable<EmployeeRecord, "id">;
  syncQueue!: EntityTable<EmployeeSyncQueueRecord, "id">;

  constructor() {
    super("marteEmployeeDb");
    this.version(1).stores({
      employees: "++id, deviceUserId, syncStatus, updatedAt",
      syncQueue: "++id, action, status, updatedAt"
    });
  }
}

export const employeeDb = new EmployeeDb();
