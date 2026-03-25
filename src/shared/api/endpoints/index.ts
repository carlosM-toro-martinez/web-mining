import { systemStatusEndpoints } from "@/shared/api/endpoints/systemStatus.endpoints";
import { kardexValoradoEndpoints } from "@/shared/api/endpoints/kardexValorado.endpoints";
import { authEndpoints } from "@/shared/api/endpoints/auth.endpoints";

export const apiEndpoints = {
  auth: authEndpoints,
  systemStatus: systemStatusEndpoints,
  kardexValorado: kardexValoradoEndpoints
} as const;
