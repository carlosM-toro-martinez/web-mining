import Dexie, { type EntityTable } from "dexie";

export type EmployeeSyncStatus = "PENDING" | "SYNCED" | "ERROR";
export type EmployeeTipoPersonal = "OBRERO" | "TECNICO_EMPLEADO";
export type SyncQueueAction = "CREATE" | "UPDATE";
export type SyncQueueStatus = "PENDING" | "DONE" | "ERROR";

export interface EmployeeRecord {
  id?: number;
  remoteId?: number | string;
  nombre: string;
  documento?: string;
  cargo?: string;
  tipoPersonal: EmployeeTipoPersonal;
  deviceUserId?: string;
  activo: boolean;
  syncStatus: EmployeeSyncStatus;
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
    this.version(2)
      .stores({
        employees: "++id, deviceUserId, syncStatus, tipoPersonal, updatedAt",
        syncQueue: "++id, action, status, updatedAt"
      })
      .upgrade(async (tx) => {
        await tx.table<EmployeeRecord, number>("employees").toCollection().modify((employee) => {
          employee.tipoPersonal = employee.tipoPersonal ?? "OBRERO";
        });
      });
  }
}

export const employeeDb = new EmployeeDb();
