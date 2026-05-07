import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { employeeDb, type EmployeeRecord } from "@/modules/employee/db/employee.db";
import { queryKeys } from "@/shared/lib/queryKeys";
import { httpClient } from "@/shared/api/core/httpClient";
import { ApiError } from "@/shared/api/core/apiError";

interface EmployeePayload {
  nombre: string;
  deviceUserId: string;
}

interface UpdateEmployeePayload extends EmployeePayload {
  id: number;
}

interface ApiEmployee {
  id?: number | string;
  nombre?: string;
  name?: string;
  deviceUserId?: string;
  device_user_id?: string;
  deviceuserid?: string;
  syncStatus?: "PENDING" | "SYNCED";
}

const EMPLOYEES_ENDPOINTS = ["/employees", "/api/employees"] as const;

async function withEndpointFallback<T>(operation: (endpoint: string) => Promise<T>) {
  let lastError: unknown = null;

  for (const endpoint of EMPLOYEES_ENDPOINTS) {
    try {
      return await operation(endpoint);
    } catch (error) {
      lastError = error;
      if (error instanceof ApiError && error.statusCode && error.statusCode < 500) {
        continue;
      }
      break;
    }
  }

  throw lastError;
}

async function fetchEmployeesFromApi() {
  return withEndpointFallback(async (endpoint) => {
    const response = await httpClient.get(endpoint);
    const payload = response.data as ApiEmployee[] | { data?: ApiEmployee[] } | undefined;
    if (Array.isArray(payload)) return payload;
    if (Array.isArray(payload?.data)) return payload.data;
    return [];
  });
}

function toStringOrUndefined(value: unknown) {
  if (typeof value === "string") {
    const trimmed = value.trim();
    return trimmed ? trimmed : undefined;
  }
  if (typeof value === "number" && Number.isFinite(value)) {
    return String(value);
  }
  return undefined;
}

function normalizeApiEmployee(apiEmployee: ApiEmployee): EmployeeRecord | null {
  const remoteId = apiEmployee.id;
  const nombre = toStringOrUndefined(apiEmployee.nombre) ?? toStringOrUndefined(apiEmployee.name);
  const deviceUserId =
    toStringOrUndefined(apiEmployee.deviceUserId) ??
    toStringOrUndefined(apiEmployee.device_user_id) ??
    toStringOrUndefined(apiEmployee.deviceuserid);

  if (remoteId === undefined || !nombre || !deviceUserId) return null;

  const now = new Date().toISOString();
  return {
    nombre,
    deviceUserId,
    remoteId,
    syncStatus: apiEmployee.syncStatus ?? "SYNCED",
    createdAt: now,
    updatedAt: now
  };
}

async function hydrateLocalEmployeesFromApi() {
  const apiEmployees = await fetchEmployeesFromApi();
  const normalized = apiEmployees.map(normalizeApiEmployee).filter((item): item is EmployeeRecord => Boolean(item));
  if (normalized.length === 0) return employeeDb.employees.orderBy("createdAt").reverse().toArray();

  const local = await employeeDb.employees.toArray();
  const byRemoteId = new Map(
    local.filter((item) => item.remoteId !== undefined).map((item) => [String(item.remoteId), item])
  );

  for (const employee of normalized) {
    const existing = byRemoteId.get(String(employee.remoteId));
    if (existing?.id) {
      await employeeDb.employees.update(existing.id, {
        nombre: employee.nombre,
        deviceUserId: employee.deviceUserId,
        syncStatus: "SYNCED",
        updatedAt: new Date().toISOString()
      });
      continue;
    }
    await employeeDb.employees.add({
      nombre: employee.nombre,
      deviceUserId: employee.deviceUserId,
      remoteId: employee.remoteId,
      syncStatus: "SYNCED",
      createdAt: employee.createdAt,
      updatedAt: employee.updatedAt
    });
  }

  return employeeDb.employees.orderBy("createdAt").reverse().toArray();
}

async function persistCreateInApi(payload: EmployeePayload) {
  return withEndpointFallback(async (endpoint) => {
    const response = await httpClient.post(endpoint, payload);
    return response.data as { id?: number | string } | undefined;
  });
}

async function persistUpdateInApi(id: number | string, payload: EmployeePayload) {
  await withEndpointFallback(async (endpoint) => {
    await httpClient.put(`${endpoint}/${id}`, payload);
  });
}

async function enqueueSync(
  action: "CREATE" | "UPDATE",
  payload: {
    localEmployeeId: number;
    remoteId?: number | string;
    nombre: string;
    deviceUserId: string;
  }
) {
  const now = new Date().toISOString();
  await employeeDb.syncQueue.add({
    action,
    payload,
    status: "PENDING",
    createdAt: now,
    updatedAt: now
  });
}

async function processSyncQueue() {
  const pending = await employeeDb.syncQueue.where("status").equals("PENDING").sortBy("createdAt");

  for (const entry of pending) {
    if (!entry.id) continue;
    try {
      if (entry.action === "CREATE") {
        const remote = await persistCreateInApi({
          nombre: entry.payload.nombre,
          deviceUserId: entry.payload.deviceUserId
        });
        await employeeDb.employees.update(entry.payload.localEmployeeId, {
          syncStatus: "SYNCED",
          remoteId: remote?.id,
          updatedAt: new Date().toISOString()
        });
      } else if (entry.action === "UPDATE") {
        const targetId = entry.payload.remoteId ?? entry.payload.localEmployeeId;
        await persistUpdateInApi(targetId, {
          nombre: entry.payload.nombre,
          deviceUserId: entry.payload.deviceUserId
        });
        await employeeDb.employees.update(entry.payload.localEmployeeId, {
          syncStatus: "SYNCED",
          updatedAt: new Date().toISOString()
        });
      }

      await employeeDb.syncQueue.update(entry.id, {
        status: "DONE",
        updatedAt: new Date().toISOString(),
        lastError: undefined
      });
    } catch (error) {
      await employeeDb.syncQueue.update(entry.id, {
        status: "ERROR",
        updatedAt: new Date().toISOString(),
        lastError: error instanceof Error ? error.message : "No se pudo sincronizar"
      });
    }
  }
}

export function useEmployees() {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: queryKeys.employees.list(),
    queryFn: async () => {
      try {
        const apiEmployees = await fetchEmployeesFromApi();
        const normalized = apiEmployees
          .map(normalizeApiEmployee)
          .filter((item): item is EmployeeRecord => Boolean(item));

        if (normalized.length > 0) {
          // Keep local storage in sync, but render directly from API result.
          void hydrateLocalEmployeesFromApi();
          return normalized;
        }

        return employeeDb.employees.orderBy("createdAt").reverse().toArray();
      } catch {
        // If API is unavailable, we keep local Dexie as source for offline mode.
        return employeeDb.employees.orderBy("createdAt").reverse().toArray();
      }
    }
  });

  const createMutation = useMutation({
    mutationFn: async (payload: EmployeePayload) => {
      const now = new Date().toISOString();
      const createdId = await employeeDb.employees.add({
        nombre: payload.nombre,
        deviceUserId: payload.deviceUserId,
        syncStatus: "PENDING",
        createdAt: now,
        updatedAt: now
      });
      const localEmployeeId = Number(createdId);

      await enqueueSync("CREATE", {
        localEmployeeId,
        nombre: payload.nombre,
        deviceUserId: payload.deviceUserId
      });

      try {
        const remote = await persistCreateInApi(payload);
        await employeeDb.employees.update(localEmployeeId, {
          syncStatus: "SYNCED",
          remoteId: remote?.id,
          updatedAt: new Date().toISOString()
        });
      } catch {
        // Offline-first: keep pending and retry later.
      }

      return employeeDb.employees.get(localEmployeeId);
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.employees.all });
    }
  });

  const updateMutation = useMutation({
    mutationFn: async (payload: UpdateEmployeePayload) => {
      const existing = await employeeDb.employees.get(payload.id);
      if (!existing) throw new Error("Empleado no encontrado en base local.");

      await employeeDb.employees.update(payload.id, {
        nombre: payload.nombre,
        deviceUserId: payload.deviceUserId,
        syncStatus: "PENDING",
        updatedAt: new Date().toISOString()
      });

      await enqueueSync("UPDATE", {
        localEmployeeId: payload.id,
        remoteId: existing.remoteId,
        nombre: payload.nombre,
        deviceUserId: payload.deviceUserId
      });

      try {
        const targetId = existing.remoteId ?? payload.id;
        await persistUpdateInApi(targetId, {
          nombre: payload.nombre,
          deviceUserId: payload.deviceUserId
        });
        await employeeDb.employees.update(payload.id, {
          syncStatus: "SYNCED",
          updatedAt: new Date().toISOString()
        });
      } catch {
        // Offline-first: keep pending and retry later.
      }

      return employeeDb.employees.get(payload.id);
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.employees.all });
    }
  });

  const retryMutation = useMutation({
    mutationFn: async () => {
      await processSyncQueue();
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.employees.all });
      await queryClient.invalidateQueries({ queryKey: queryKeys.employees.syncQueue() });
    }
  });

  const syncQueueQuery = useQuery({
    queryKey: queryKeys.employees.syncQueue(),
    queryFn: () => employeeDb.syncQueue.orderBy("createdAt").reverse().toArray()
  });

  return {
    getAll: {
      data: (query.data ?? []) as EmployeeRecord[],
      isLoading: query.isLoading,
      error: query.error
    },
    create: createMutation.mutateAsync,
    update: updateMutation.mutateAsync,
    retrySync: retryMutation.mutateAsync,
    isSaving: createMutation.isPending || updateMutation.isPending,
    isRetrying: retryMutation.isPending,
    syncQueue: syncQueueQuery.data ?? []
  };
}
