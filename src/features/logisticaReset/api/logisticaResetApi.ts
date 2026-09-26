import { deleteRequest } from "@/shared/api/core/request";
import { apiEndpoints } from "@/shared/api/endpoints";
import { resetLogisticaResponseSchema } from "@/features/logisticaReset/model/logisticaReset.schema";

export async function resetLogistica() {
  return deleteRequest({
    url: apiEndpoints.logisticaReset.base,
    config: { data: { confirmacion: "ELIMINAR TODO" } },
    schema: resetLogisticaResponseSchema
  });
}
