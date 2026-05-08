import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/shared/lib/queryKeys";
import {
  createAssay,
  createDrillHole,
  createInterval,
  createLithology,
  createProject,
  createQaqc,
  createResource,
  createZone,
  getAssayById,
  getAssays,
  getDrillHoleById,
  getDrillHoles,
  getExplorationHierarchy,
  getIntervalById,
  getIntervals,
  getLithologies,
  getProjectById,
  getProjects,
  getQaqc,
  getResources,
  getZoneById,
  getZones,
  updateAssay,
  updateDrillHole,
  updateInterval,
  updateLithology,
  updateProject,
  updateQaqc,
  updateResource,
  updateZone
} from "@/features/exploraciones/api/exploracionMineraApi";
import type {
  CreateAssayPayload,
  CreateDrillHolePayload,
  CreateIntervalPayload,
  CreateLithologyPayload,
  CreateProjectPayload,
  CreateQaqcPayload,
  CreateResourcePayload,
  CreateZonePayload,
  UpdateAssayPayload,
  UpdateDrillHolePayload,
  UpdateIntervalPayload,
  UpdateLithologyPayload,
  UpdateProjectPayload,
  UpdateQaqcPayload,
  UpdateResourcePayload,
  UpdateZonePayload
} from "@/features/exploraciones/model/exploracionMinera.schema";

export function useExplorationHierarchyQuery(params: { search?: string; page?: number; limit?: number }) {
  return useQuery({
    queryKey: queryKeys.exploraciones.hierarchy(params),
    queryFn: async () => {
      try {
        return await getExplorationHierarchy(params);
      } catch {
        return {
          projects: [],
          zones: [],
          drillHoles: [],
          intervals: [],
          assays: [],
          lithologies: [],
          qaqc: [],
          resources: []
        };
      }
    },
    retry: false,
    refetchOnWindowFocus: false
  });
}

export function useProjectsQuery(params: { search?: string; page?: number; limit?: number }) {
  return useQuery({
    queryKey: [...queryKeys.exploraciones.all, "projects", params],
    queryFn: () => getProjects(params),
    retry: false
  });
}

export function useProjectDetailQuery(projectId?: number) {
  return useQuery({
    queryKey: [...queryKeys.exploraciones.all, "project", projectId],
    queryFn: () => getProjectById(projectId as number),
    enabled: Boolean(projectId),
    retry: false
  });
}

export function useZonesByProjectQuery(projectId?: number) {
  return useQuery({
    queryKey: [...queryKeys.exploraciones.all, "zones", projectId],
    queryFn: () => getZones({ projectId, page: 1, limit: 100 }),
    enabled: Boolean(projectId),
    retry: false
  });
}

export function useZoneDetailQuery(zoneId?: number) {
  return useQuery({
    queryKey: [...queryKeys.exploraciones.all, "zone", zoneId],
    queryFn: () => getZoneById(zoneId as number),
    enabled: Boolean(zoneId),
    retry: false
  });
}

export function useDrillHolesByZoneQuery(zoneId?: number) {
  return useQuery({
    queryKey: [...queryKeys.exploraciones.all, "drillholes", zoneId],
    queryFn: () => getDrillHoles({ zoneId, page: 1, limit: 100 }),
    enabled: Boolean(zoneId),
    retry: false
  });
}

export function useDrillHoleDetailQuery(drillHoleId?: number) {
  return useQuery({
    queryKey: [...queryKeys.exploraciones.all, "drillhole", drillHoleId],
    queryFn: () => getDrillHoleById(drillHoleId as number),
    enabled: Boolean(drillHoleId),
    retry: false
  });
}

export function useIntervalsByDrillHoleQuery(drillHoleId?: number) {
  return useQuery({
    queryKey: [...queryKeys.exploraciones.all, "intervals", drillHoleId],
    queryFn: () => getIntervals({ drillHoleId, page: 1, limit: 100 }),
    enabled: Boolean(drillHoleId),
    retry: false
  });
}

export function useIntervalDetailQuery(intervalId?: number) {
  return useQuery({
    queryKey: [...queryKeys.exploraciones.all, "interval", intervalId],
    queryFn: () => getIntervalById(intervalId as number),
    enabled: Boolean(intervalId),
    retry: false
  });
}

export function useAssaysByIntervalQuery(intervalId?: number) {
  return useQuery({
    queryKey: [...queryKeys.exploraciones.all, "assays", intervalId],
    queryFn: () => getAssays({ intervalId, page: 1, limit: 100 }),
    enabled: Boolean(intervalId),
    retry: false
  });
}

export function useLithologiesByIntervalQuery(intervalId?: number) {
  return useQuery({
    queryKey: [...queryKeys.exploraciones.all, "lithologies", intervalId],
    queryFn: () => getLithologies({ intervalId, page: 1, limit: 100 }),
    enabled: Boolean(intervalId),
    retry: false
  });
}

export function useAssayDetailQuery(assayId?: number) {
  return useQuery({
    queryKey: [...queryKeys.exploraciones.all, "assay", assayId],
    queryFn: () => getAssayById(assayId as number),
    enabled: Boolean(assayId),
    retry: false
  });
}

export function useQaqcByAssayQuery(assayId?: number) {
  return useQuery({
    queryKey: [...queryKeys.exploraciones.all, "qaqc", assayId],
    queryFn: () => getQaqc({ assayId, page: 1, limit: 100 }),
    enabled: Boolean(assayId),
    retry: false
  });
}

export function useResourcesByProjectQuery(projectId?: number) {
  return useQuery({
    queryKey: [...queryKeys.exploraciones.all, "resources", projectId],
    queryFn: () => getResources({ projectId, page: 1, limit: 100 }),
    enabled: Boolean(projectId),
    retry: false
  });
}

function useInvalidateExplorationHierarchy() {
  const queryClient = useQueryClient();
  return async () => {
    await queryClient.invalidateQueries({ queryKey: queryKeys.exploraciones.all });
  };
}

export function useCreateProjectMutation() {
  const invalidate = useInvalidateExplorationHierarchy();
  return useMutation({
    mutationFn: (payload: CreateProjectPayload) => createProject(payload),
    onSuccess: invalidate
  });
}

export function useUpdateProjectMutation() {
  const invalidate = useInvalidateExplorationHierarchy();
  return useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: UpdateProjectPayload }) =>
      updateProject(id, payload),
    onSuccess: invalidate
  });
}

export function useCreateZoneMutation() {
  const invalidate = useInvalidateExplorationHierarchy();
  return useMutation({
    mutationFn: (payload: CreateZonePayload) => createZone(payload),
    onSuccess: invalidate
  });
}

export function useUpdateZoneMutation() {
  const invalidate = useInvalidateExplorationHierarchy();
  return useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: UpdateZonePayload }) => updateZone(id, payload),
    onSuccess: invalidate
  });
}

export function useCreateDrillHoleMutation() {
  const invalidate = useInvalidateExplorationHierarchy();
  return useMutation({
    mutationFn: (payload: CreateDrillHolePayload) => createDrillHole(payload),
    onSuccess: invalidate
  });
}

export function useUpdateDrillHoleMutation() {
  const invalidate = useInvalidateExplorationHierarchy();
  return useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: UpdateDrillHolePayload }) =>
      updateDrillHole(id, payload),
    onSuccess: invalidate
  });
}

export function useCreateIntervalMutation() {
  const invalidate = useInvalidateExplorationHierarchy();
  return useMutation({
    mutationFn: (payload: CreateIntervalPayload) => createInterval(payload),
    onSuccess: invalidate
  });
}

export function useUpdateIntervalMutation() {
  const invalidate = useInvalidateExplorationHierarchy();
  return useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: UpdateIntervalPayload }) =>
      updateInterval(id, payload),
    onSuccess: invalidate
  });
}

export function useCreateAssayMutation() {
  const invalidate = useInvalidateExplorationHierarchy();
  return useMutation({
    mutationFn: (payload: CreateAssayPayload) => createAssay(payload),
    onSuccess: invalidate
  });
}

export function useUpdateAssayMutation() {
  const invalidate = useInvalidateExplorationHierarchy();
  return useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: UpdateAssayPayload }) => updateAssay(id, payload),
    onSuccess: invalidate
  });
}

export function useCreateLithologyMutation() {
  const invalidate = useInvalidateExplorationHierarchy();
  return useMutation({
    mutationFn: (payload: CreateLithologyPayload) => createLithology(payload),
    onSuccess: invalidate
  });
}

export function useUpdateLithologyMutation() {
  const invalidate = useInvalidateExplorationHierarchy();
  return useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: UpdateLithologyPayload }) =>
      updateLithology(id, payload),
    onSuccess: invalidate
  });
}

export function useCreateQaqcMutation() {
  const invalidate = useInvalidateExplorationHierarchy();
  return useMutation({
    mutationFn: (payload: CreateQaqcPayload) => createQaqc(payload),
    onSuccess: invalidate
  });
}

export function useUpdateQaqcMutation() {
  const invalidate = useInvalidateExplorationHierarchy();
  return useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: UpdateQaqcPayload }) => updateQaqc(id, payload),
    onSuccess: invalidate
  });
}

export function useCreateResourceMutation() {
  const invalidate = useInvalidateExplorationHierarchy();
  return useMutation({
    mutationFn: (payload: CreateResourcePayload) => createResource(payload),
    onSuccess: invalidate
  });
}

export function useUpdateResourceMutation() {
  const invalidate = useInvalidateExplorationHierarchy();
  return useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: UpdateResourcePayload }) =>
      updateResource(id, payload),
    onSuccess: invalidate
  });
}
