import { getRequest } from "@/shared/api/core/request";
import { staticClient } from "@/shared/api/core/staticClient";
import { apiEndpoints } from "@/shared/api/endpoints";
import {
  kardexValoradoSchema,
  type KardexValorado
} from "@/features/kardex-valorado/model/kardexValorado.schema";

export async function getKardexValoradoReport(): Promise<KardexValorado> {
  return getRequest({
    url: apiEndpoints.kardexValorado.getReport,
    schema: kardexValoradoSchema,
    client: staticClient
  });
}
