import Dexie, { type EntityTable } from "dexie";
import type { SystemStatus } from "@/features/system-status/model/systemStatus.schema";

export interface StatusSnapshot {
  id?: number;
  message: string;
  version: string;
  updatedAt: string;
  capturedAt: string;
}

class MarteDb extends Dexie {
  statusSnapshots!: EntityTable<StatusSnapshot, "id">;

  constructor() {
    super("marteMiningDb");
    this.version(1).stores({
      statusSnapshots: "++id, version, capturedAt"
    });
  }
}

export const marteDb = new MarteDb();

export async function saveStatusSnapshot(status: SystemStatus) {
  await marteDb.statusSnapshots.add({
    message: status.message,
    version: status.version,
    updatedAt: status.updatedAt,
    capturedAt: new Date().toISOString()
  });
}
