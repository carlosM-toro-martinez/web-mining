import { getRequest, postRequest } from "@/shared/api/core/request";
import { apiEndpoints } from "@/shared/api/endpoints";
import {
  anularFormulario101PayloadSchema,
  anulacionFormulario101ResponseSchema,
  formulario101ListResponseSchema,
  formulario101ResponseSchema,
  reutilizarFormulario101PayloadSchema,
  vincularFormulario101PayloadSchema,
  type AnularFormulario101Payload,
  type ReutilizarFormulario101Payload,
  type VincularFormulario101Payload
} from "@/features/formulario101/model/formulario101.schema";

export interface Formulario101QueryParams {
  estado?: string;
  loteId?: string;
}

export async function getFormularios101(params: Formulario101QueryParams = {}) {
  return getRequest({
    url: apiEndpoints.formulario101.base,
    config: { params },
    schema: formulario101ListResponseSchema
  });
}

export async function vincularFormulario101(loteId: string, payload: VincularFormulario101Payload) {
  const body = vincularFormulario101PayloadSchema.parse(payload);
  return postRequest({ url: apiEndpoints.formulario101.vincular(loteId), body, schema: formulario101ResponseSchema });
}

export async function reutilizarFormulario101(id: string, payload: ReutilizarFormulario101Payload) {
  const body = reutilizarFormulario101PayloadSchema.parse(payload);
  return postRequest({ url: apiEndpoints.formulario101.reutilizar(id), body, schema: formulario101ResponseSchema });
}

export async function anularFormulario101(id: string, payload: AnularFormulario101Payload) {
  const body = anularFormulario101PayloadSchema.parse(payload);
  return postRequest({ url: apiEndpoints.formulario101.anular(id), body, schema: formulario101ResponseSchema });
}

export async function marcarPeticionEnviadaFormulario101(id: string) {
  return postRequest({
    url: apiEndpoints.formulario101.peticionEnviada(id),
    body: {},
    schema: anulacionFormulario101ResponseSchema
  });
}
