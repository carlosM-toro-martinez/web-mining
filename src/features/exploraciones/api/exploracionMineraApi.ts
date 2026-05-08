import { httpClient } from "@/shared/api/core/httpClient";
import { apiEndpoints } from "@/shared/api/endpoints";
import {
  assaySchema,
  createAssayPayloadSchema,
  createDrillHolePayloadSchema,
  createIntervalPayloadSchema,
  createLithologyPayloadSchema,
  createProjectPayloadSchema,
  createQaqcPayloadSchema,
  createResourcePayloadSchema,
  createZonePayloadSchema,
  drillHoleSchema,
  intervalSchema,
  lithologySchema,
  listMetaSchema,
  projectSchema,
  qaqcSchema,
  resourceSchema,
  updateAssayPayloadSchema,
  updateDrillHolePayloadSchema,
  updateIntervalPayloadSchema,
  updateLithologyPayloadSchema,
  updateProjectPayloadSchema,
  updateQaqcPayloadSchema,
  updateResourcePayloadSchema,
  updateZonePayloadSchema,
  zoneSchema,
  type Assay,
  type CreateAssayPayload,
  type CreateDrillHolePayload,
  type CreateIntervalPayload,
  type CreateLithologyPayload,
  type CreateProjectPayload,
  type CreateQaqcPayload,
  type CreateResourcePayload,
  type CreateZonePayload,
  type DrillHole,
  type Interval,
  type Lithology,
  type Project,
  type QAQC,
  type Resource,
  type UpdateAssayPayload,
  type UpdateDrillHolePayload,
  type UpdateIntervalPayload,
  type UpdateLithologyPayload,
  type UpdateProjectPayload,
  type UpdateQaqcPayload,
  type UpdateResourcePayload,
  type UpdateZonePayload,
  type Zone
} from "@/features/exploraciones/model/exploracionMinera.schema";

interface ListParams {
  search?: string;
  page?: number;
  limit?: number;
}

interface PaginatedResult<T> {
  data: T[];
  meta: {
    total?: number;
    page?: number;
    limit?: number;
  };
}

function normalizeListResponse<T>(raw: unknown, parser: (value: unknown) => T): PaginatedResult<T> {
  const root = raw && typeof raw === "object" && "data" in raw ? (raw as { data: unknown }).data : raw;

  const candidates: unknown[] = [
    root,
    root && typeof root === "object" && "items" in root ? (root as { items?: unknown }).items : undefined,
    root && typeof root === "object" && "rows" in root ? (root as { rows?: unknown }).rows : undefined,
    root && typeof root === "object" && "data" in root ? (root as { data?: unknown }).data : undefined
  ];

  const listRaw = candidates.find((item) => Array.isArray(item));
  const list = Array.isArray(listRaw) ? listRaw.map(parser) : [];

  const metaSource = root && typeof root === "object" ? root : {};
  const meta = listMetaSchema
    .safeParse({
      total: (metaSource as Record<string, unknown>).total,
      page: (metaSource as Record<string, unknown>).page,
      limit: (metaSource as Record<string, unknown>).limit
    })
    .success
    ? listMetaSchema.parse({
        total: (metaSource as Record<string, unknown>).total,
        page: (metaSource as Record<string, unknown>).page,
        limit: (metaSource as Record<string, unknown>).limit
      })
    : {};

  return { data: list, meta };
}

function normalizeDetailResponse<T>(raw: unknown, parse: (value: unknown) => T): T {
  const root = raw && typeof raw === "object" && "data" in raw ? (raw as { data: unknown }).data : raw;
  return parse(root);
}

function buildParams(params?: { [key: string]: string | number | undefined }) {
  if (!params) return undefined;
  const clean = Object.fromEntries(
    Object.entries(params).filter(([, value]) => value !== undefined && value !== "")
  );
  return Object.keys(clean).length ? clean : undefined;
}

export async function getProjects(params?: ListParams) {
  const response = await httpClient.get(apiEndpoints.exploraciones.projects, {
    params: buildParams(params as { [key: string]: string | number | undefined } | undefined)
  });
  return normalizeListResponse(response.data, (item) => projectSchema.parse(item));
}

export async function getProjectById(id: number) {
  const response = await httpClient.get(apiEndpoints.exploraciones.projectById(id));
  return normalizeDetailResponse(response.data, (item) => projectSchema.parse(item));
}

export async function createProject(payload: CreateProjectPayload) {
  const response = await httpClient.post(
    apiEndpoints.exploraciones.projects,
    createProjectPayloadSchema.parse(payload)
  );
  return normalizeDetailResponse(response.data, (item) => projectSchema.parse(item));
}

export async function updateProject(id: number, payload: UpdateProjectPayload) {
  const response = await httpClient.patch(
    apiEndpoints.exploraciones.projectById(id),
    updateProjectPayloadSchema.parse(payload)
  );
  return normalizeDetailResponse(response.data, (item) => projectSchema.parse(item));
}

export async function getZones(params: { projectId?: number; page?: number; limit?: number }) {
  const response = await httpClient.get(apiEndpoints.exploraciones.zones, {
    params: buildParams(params)
  });
  return normalizeListResponse(response.data, (item) => zoneSchema.parse(item));
}

export async function getZoneById(id: number) {
  const response = await httpClient.get(apiEndpoints.exploraciones.zoneById(id));
  return normalizeDetailResponse(response.data, (item) => zoneSchema.parse(item));
}

export async function createZone(payload: CreateZonePayload) {
  const response = await httpClient.post(
    apiEndpoints.exploraciones.zones,
    createZonePayloadSchema.parse(payload)
  );
  return normalizeDetailResponse(response.data, (item) => zoneSchema.parse(item));
}

export async function updateZone(id: number, payload: UpdateZonePayload) {
  const response = await httpClient.patch(
    apiEndpoints.exploraciones.zoneById(id),
    updateZonePayloadSchema.parse(payload)
  );
  return normalizeDetailResponse(response.data, (item) => zoneSchema.parse(item));
}

export async function getDrillHoles(params: { zoneId?: number; page?: number; limit?: number }) {
  const response = await httpClient.get(apiEndpoints.exploraciones.drillholes, {
    params: buildParams(params)
  });
  return normalizeListResponse(response.data, (item) => drillHoleSchema.parse(item));
}

export async function getDrillHoleById(id: number) {
  const response = await httpClient.get(apiEndpoints.exploraciones.drillholeById(id));
  return normalizeDetailResponse(response.data, (item) => drillHoleSchema.parse(item));
}

export async function createDrillHole(payload: CreateDrillHolePayload) {
  const response = await httpClient.post(
    apiEndpoints.exploraciones.drillholes,
    createDrillHolePayloadSchema.parse(payload)
  );
  return normalizeDetailResponse(response.data, (item) => drillHoleSchema.parse(item));
}

export async function updateDrillHole(id: number, payload: UpdateDrillHolePayload) {
  const response = await httpClient.patch(
    apiEndpoints.exploraciones.drillholeById(id),
    updateDrillHolePayloadSchema.parse(payload)
  );
  return normalizeDetailResponse(response.data, (item) => drillHoleSchema.parse(item));
}

export async function getIntervals(params: { drillHoleId?: number; page?: number; limit?: number }) {
  const response = await httpClient.get(apiEndpoints.exploraciones.intervals, {
    params: buildParams(params)
  });
  return normalizeListResponse(response.data, (item) => intervalSchema.parse(item));
}

export async function getIntervalById(id: number) {
  const response = await httpClient.get(apiEndpoints.exploraciones.intervalById(id));
  return normalizeDetailResponse(response.data, (item) => intervalSchema.parse(item));
}

export async function createInterval(payload: CreateIntervalPayload) {
  const response = await httpClient.post(
    apiEndpoints.exploraciones.intervals,
    createIntervalPayloadSchema.parse(payload)
  );
  return normalizeDetailResponse(response.data, (item) => intervalSchema.parse(item));
}

export async function updateInterval(id: number, payload: UpdateIntervalPayload) {
  const response = await httpClient.patch(
    apiEndpoints.exploraciones.intervalById(id),
    updateIntervalPayloadSchema.parse(payload)
  );
  return normalizeDetailResponse(response.data, (item) => intervalSchema.parse(item));
}

export async function getAssays(params: { intervalId?: number; page?: number; limit?: number }) {
  const response = await httpClient.get(apiEndpoints.exploraciones.assays, {
    params: buildParams(params)
  });
  return normalizeListResponse(response.data, (item) => assaySchema.parse(item));
}

export async function getAssayById(id: number) {
  const response = await httpClient.get(apiEndpoints.exploraciones.assayById(id));
  return normalizeDetailResponse(response.data, (item) => assaySchema.parse(item));
}

export async function createAssay(payload: CreateAssayPayload) {
  const response = await httpClient.post(
    apiEndpoints.exploraciones.assays,
    createAssayPayloadSchema.parse(payload)
  );
  return normalizeDetailResponse(response.data, (item) => assaySchema.parse(item));
}

export async function updateAssay(id: number, payload: UpdateAssayPayload) {
  const response = await httpClient.patch(
    apiEndpoints.exploraciones.assayById(id),
    updateAssayPayloadSchema.parse(payload)
  );
  return normalizeDetailResponse(response.data, (item) => assaySchema.parse(item));
}

export async function getLithologies(params: { intervalId?: number; page?: number; limit?: number }) {
  const response = await httpClient.get(apiEndpoints.exploraciones.lithologies, {
    params: buildParams(params)
  });
  return normalizeListResponse(response.data, (item) => lithologySchema.parse(item));
}

export async function getLithologyById(id: number) {
  const response = await httpClient.get(apiEndpoints.exploraciones.lithologyById(id));
  return normalizeDetailResponse(response.data, (item) => lithologySchema.parse(item));
}

export async function createLithology(payload: CreateLithologyPayload) {
  const response = await httpClient.post(
    apiEndpoints.exploraciones.lithologies,
    createLithologyPayloadSchema.parse(payload)
  );
  return normalizeDetailResponse(response.data, (item) => lithologySchema.parse(item));
}

export async function updateLithology(id: number, payload: UpdateLithologyPayload) {
  const response = await httpClient.patch(
    apiEndpoints.exploraciones.lithologyById(id),
    updateLithologyPayloadSchema.parse(payload)
  );
  return normalizeDetailResponse(response.data, (item) => lithologySchema.parse(item));
}

export async function getQaqc(params: { assayId?: number; page?: number; limit?: number }) {
  const response = await httpClient.get(apiEndpoints.exploraciones.qaqc, {
    params: buildParams(params)
  });
  return normalizeListResponse(response.data, (item) => qaqcSchema.parse(item));
}

export async function getQaqcById(id: number) {
  const response = await httpClient.get(apiEndpoints.exploraciones.qaqcById(id));
  return normalizeDetailResponse(response.data, (item) => qaqcSchema.parse(item));
}

export async function createQaqc(payload: CreateQaqcPayload) {
  const response = await httpClient.post(
    apiEndpoints.exploraciones.qaqc,
    createQaqcPayloadSchema.parse(payload)
  );
  return normalizeDetailResponse(response.data, (item) => qaqcSchema.parse(item));
}

export async function updateQaqc(id: number, payload: UpdateQaqcPayload) {
  const response = await httpClient.patch(
    apiEndpoints.exploraciones.qaqcById(id),
    updateQaqcPayloadSchema.parse(payload)
  );
  return normalizeDetailResponse(response.data, (item) => qaqcSchema.parse(item));
}

export async function getResources(params: { projectId?: number; page?: number; limit?: number }) {
  const response = await httpClient.get(apiEndpoints.exploraciones.resources, {
    params: buildParams(params)
  });
  return normalizeListResponse(response.data, (item) => resourceSchema.parse(item));
}

export async function getResourceById(id: number) {
  const response = await httpClient.get(apiEndpoints.exploraciones.resourceById(id));
  return normalizeDetailResponse(response.data, (item) => resourceSchema.parse(item));
}

export async function createResource(payload: CreateResourcePayload) {
  const response = await httpClient.post(
    apiEndpoints.exploraciones.resources,
    createResourcePayloadSchema.parse(payload)
  );
  return normalizeDetailResponse(response.data, (item) => resourceSchema.parse(item));
}

export async function updateResource(id: number, payload: UpdateResourcePayload) {
  const response = await httpClient.patch(
    apiEndpoints.exploraciones.resourceById(id),
    updateResourcePayloadSchema.parse(payload)
  );
  return normalizeDetailResponse(response.data, (item) => resourceSchema.parse(item));
}

export interface ExplorationHierarchy {
  projects: Project[];
  zones: Zone[];
  drillHoles: DrillHole[];
  intervals: Interval[];
  assays: Assay[];
  lithologies: Lithology[];
  qaqc: QAQC[];
  resources: Resource[];
}

export async function getExplorationHierarchy(params?: { search?: string; page?: number; limit?: number }) {
  const projects = await getProjects(params);
  const projectIds = projects.data.map((p) => p.id);

  const safe = async <T>(task: () => Promise<T>, fallback: T): Promise<T> => {
    try {
      return await task();
    } catch {
      return fallback;
    }
  };

  const zonesByProject = await Promise.all(
    projectIds.map((projectId) =>
      safe(() => getZones({ projectId, page: 1, limit: 100 }), { data: [], meta: {} })
    )
  );
  const zones = zonesByProject.flatMap((result) => result.data);

  const resourcesByProject = await Promise.all(
    projectIds.map((projectId) =>
      safe(() => getResources({ projectId, page: 1, limit: 100 }), { data: [], meta: {} })
    )
  );
  const resources = resourcesByProject.flatMap((result) => result.data);

  const zoneIds = zones.map((z) => z.id);
  const drillHolesByZone = await Promise.all(
    zoneIds.map((zoneId) =>
      safe(() => getDrillHoles({ zoneId, page: 1, limit: 100 }), { data: [], meta: {} })
    )
  );
  const drillHoles = drillHolesByZone.flatMap((result) => result.data);

  const drillHoleIds = drillHoles.map((d) => d.id);
  const intervalsByDrillHole = await Promise.all(
    drillHoleIds.map((drillHoleId) =>
      safe(() => getIntervals({ drillHoleId, page: 1, limit: 100 }), { data: [], meta: {} })
    )
  );
  const intervals = intervalsByDrillHole.flatMap((result) => result.data);

  const intervalIds = intervals.map((i) => i.id);
  const assaysByInterval = await Promise.all(
    intervalIds.map((intervalId) =>
      safe(() => getAssays({ intervalId, page: 1, limit: 100 }), { data: [], meta: {} })
    )
  );
  const lithologiesByInterval = await Promise.all(
    intervalIds.map((intervalId) =>
      safe(() => getLithologies({ intervalId, page: 1, limit: 100 }), { data: [], meta: {} })
    )
  );
  const assays = assaysByInterval.flatMap((result) => result.data);
  const lithologies = lithologiesByInterval.flatMap((result) => result.data);

  const assayIds = assays.map((a) => a.id);
  const qaqcByAssay = await Promise.all(
    assayIds.map((assayId) =>
      safe(() => getQaqc({ assayId, page: 1, limit: 100 }), { data: [], meta: {} })
    )
  );
  const qaqc = qaqcByAssay.flatMap((result) => result.data);

  return {
    projects: projects.data,
    zones,
    drillHoles,
    intervals,
    assays,
    lithologies,
    qaqc,
    resources
  };
}
