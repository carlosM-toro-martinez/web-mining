import { apiEndpoints } from "@/shared/api/endpoints";
import { deleteRequest, getRequest, postRequest } from "@/shared/api/core/request";
import {
  ambientalDeleteResponseSchema,
  createHidricoSchema,
  createManifiestoSchema,
  createPozoSchema,
  createPuntoAmbientalSchema,
  createResiduoSchema,
  createRuidoSchema,
  createSueloSchema,
  dashboardAmbientalResponseSchema,
  hidricoItemResponseSchema,
  hidricoResponseSchema,
  manifiestoItemResponseSchema,
  manifiestosResponseSchema,
  mapaAmbientalResponseSchema,
  pozoItemResponseSchema,
  pozosResponseSchema,
  puntoAmbientalResponseSchema,
  puntosAmbientalesResponseSchema,
  residuosResponseSchema,
  residuoItemResponseSchema,
  ruidoItemResponseSchema,
  ruidoResponseSchema,
  sueloItemResponseSchema,
  sueloResponseSchema,
  type CreateHidricoPayload,
  type CreateManifiestoPayload,
  type CreatePozoPayload,
  type CreatePuntoAmbientalPayload,
  type CreateResiduoPayload,
  type CreateRuidoPayload,
  type CreateSueloPayload,
  type PuntoAmbientalTipo,
  type TipoResiduo
} from "@/features/ambiental/model/ambiental.schema";

function cleanParams(params: Record<string, unknown>) {
  return Object.fromEntries(
    Object.entries(params).filter(([, value]) => value !== undefined && value !== "")
  );
}

export function getAmbientalDashboard() {
  return getRequest({
    url: apiEndpoints.ambiental.dashboard,
    schema: dashboardAmbientalResponseSchema
  });
}

export function getAmbientalMapa() {
  return getRequest({ url: apiEndpoints.ambiental.mapa, schema: mapaAmbientalResponseSchema });
}

export function getAmbientalPuntos(params: { tipo?: PuntoAmbientalTipo; activo?: string } = {}) {
  return getRequest({
    url: apiEndpoints.ambiental.puntos,
    config: { params: cleanParams(params) },
    schema: puntosAmbientalesResponseSchema
  });
}

export function createAmbientalPunto(payload: CreatePuntoAmbientalPayload) {
  return postRequest({
    url: apiEndpoints.ambiental.puntos,
    body: createPuntoAmbientalSchema.parse(payload),
    schema: puntoAmbientalResponseSchema
  });
}

export function deleteAmbientalPunto(id: number | string) {
  return deleteRequest({
    url: apiEndpoints.ambiental.puntoById(id),
    schema: ambientalDeleteResponseSchema
  });
}

export function getAmbientalHidrico(params: Record<string, unknown> = {}) {
  return getRequest({
    url: apiEndpoints.ambiental.hidrico,
    config: { params: cleanParams(params) },
    schema: hidricoResponseSchema
  });
}

export function createAmbientalHidrico(payload: CreateHidricoPayload) {
  return postRequest({
    url: apiEndpoints.ambiental.hidrico,
    body: createHidricoSchema.parse(payload),
    schema: hidricoItemResponseSchema
  });
}

export function getAmbientalResiduos(
  params: { puntoId?: number; tipoResiduo?: TipoResiduo; desde?: string; hasta?: string; page?: number; limit?: number } = {}
) {
  return getRequest({
    url: apiEndpoints.ambiental.residuos,
    config: { params: cleanParams(params) },
    schema: residuosResponseSchema
  });
}

export function createAmbientalResiduo(payload: CreateResiduoPayload) {
  return postRequest({
    url: apiEndpoints.ambiental.residuos,
    body: createResiduoSchema.parse(payload),
    schema: residuoItemResponseSchema
  });
}

export function getAmbientalRuido(params: Record<string, unknown> = {}) {
  return getRequest({
    url: apiEndpoints.ambiental.ruido,
    config: { params: cleanParams(params) },
    schema: ruidoResponseSchema
  });
}

export function createAmbientalRuido(payload: CreateRuidoPayload) {
  return postRequest({
    url: apiEndpoints.ambiental.ruido,
    body: createRuidoSchema.parse(payload),
    schema: ruidoItemResponseSchema
  });
}

export function getAmbientalSuelo(params: Record<string, unknown> = {}) {
  return getRequest({
    url: apiEndpoints.ambiental.suelo,
    config: { params: cleanParams(params) },
    schema: sueloResponseSchema
  });
}

export function createAmbientalSuelo(payload: CreateSueloPayload) {
  return postRequest({
    url: apiEndpoints.ambiental.suelo,
    body: createSueloSchema.parse(payload),
    schema: sueloItemResponseSchema
  });
}

export function getAmbientalPozos(params: { activo?: string } = {}) {
  return getRequest({
    url: apiEndpoints.ambiental.pozos,
    config: { params: cleanParams(params) },
    schema: pozosResponseSchema
  });
}

export function createAmbientalPozo(payload: CreatePozoPayload) {
  return postRequest({
    url: apiEndpoints.ambiental.pozos,
    body: createPozoSchema.parse(payload),
    schema: pozoItemResponseSchema
  });
}

export function getAmbientalManifiestos(params: { anio?: number | string } = {}) {
  return getRequest({
    url: apiEndpoints.ambiental.manifiestos,
    config: { params: cleanParams(params) },
    schema: manifiestosResponseSchema
  });
}

export function createAmbientalManifiesto(payload: CreateManifiestoPayload) {
  return postRequest({
    url: apiEndpoints.ambiental.manifiestos,
    body: createManifiestoSchema.parse(payload),
    schema: manifiestoItemResponseSchema
  });
}
