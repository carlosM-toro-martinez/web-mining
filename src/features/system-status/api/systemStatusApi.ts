import { getRequest } from "@/shared/api/core/request";
import { staticClient } from "@/shared/api/core/staticClient";
import { apiEndpoints } from "@/shared/api/endpoints";
import {
  systemStatusSchema,
  type SystemStatus
} from "@/features/system-status/model/systemStatus.schema";

const fallbackStatus: SystemStatus = {
  message: "Sistema en progreso - Marte Mining listo",
  version: "v3.0.0",
  company: "Marte Mining",
  creator: "Encuentra Software Solutions",
  updatedAt: new Date().toISOString()
};

export async function getSystemStatus(): Promise<SystemStatus> {
  try {
    return await getRequest({
      url: apiEndpoints.systemStatus.getStatus,
      schema: systemStatusSchema,
      client: staticClient
    });
  } catch {
    return fallbackStatus;
  }
}
