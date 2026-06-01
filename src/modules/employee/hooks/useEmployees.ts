import { useCallback } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import axios from "axios";
import { employeeDb, type EmployeeRecord } from "@/modules/employee/db/employee.db";
import { httpClient } from "@/shared/api/core/httpClient";
import { queryKeys } from "@/shared/lib/queryKeys";
import { env } from "@/shared/config/env";

interface EmployeePayload {
  nombre: string;
  documento?: string;
  cargo?: string;
  deviceUserId?: string;
  activo?: boolean;
}

interface UpdateEmployeePayload extends EmployeePayload {
  id: number;
}

interface EmployeeApiItem {
  id: number | string;
  nombre?: string;
  documento?: string | null;
  cargo?: string | null;
  deviceUserId?: string | null;
  activo?: boolean;
  syncStatus?: "PENDING" | "SYNCED" | "ERROR";
  createdAt?: string;
  updatedAt?: string;
}

interface AttendanceItem {
  id: number | string;
  fecha: string;
  tipo: string;
  deviceUserId?: string;
  empleado?: {
    id: number;
    nombre: string;
    cargo?: string | null;
  } | null;
}

function toEmployeeRecord(item: EmployeeApiItem): EmployeeRecord {
  const now = new Date().toISOString();
  return {
    remoteId: item.id,
    nombre: item.nombre ?? "",
    documento: item.documento ?? undefined,
    cargo: item.cargo ?? undefined,
    deviceUserId: item.deviceUserId ?? undefined,
    activo: item.activo ?? true,
    syncStatus: item.syncStatus ?? "PENDING",
    createdAt: item.createdAt ?? now,
    updatedAt: item.updatedAt ?? now
  };
}

async function fetchEmployeesFromApi() {
  const limit = 500;
  const employees: EmployeeApiItem[] = [];
  let page = 1;
  let hasMore = true;

  while (hasMore) {
    const response = await httpClient.get("/api/employees", {
      params: { page, limit }
    });
    const payload = response.data as {
      data?: EmployeeApiItem[];
      pagination?: {
        page?: number;
        totalPages?: number;
      };
    };
    const currentBatch = payload.data ?? [];
    employees.push(...currentBatch);

    const totalPages = payload.pagination?.totalPages ?? 0;
    if (totalPages > 0) {
      hasMore = page < totalPages;
    } else {
      hasMore = currentBatch.length === limit;
    }
    page += 1;
  }

  return employees;
}

async function syncLocalEmployees(apiEmployees: EmployeeApiItem[]) {
  if (apiEmployees.length === 0) {
    await employeeDb.employees.clear();
    return [];
  }

  const normalized = apiEmployees.map(toEmployeeRecord);
  const local = await employeeDb.employees.toArray();
  const byRemoteId = new Map(
    local.filter((item) => item.remoteId !== undefined).map((item) => [String(item.remoteId), item])
  );

  for (const employee of normalized) {
    const existing = byRemoteId.get(String(employee.remoteId));
    if (existing?.id) {
      await employeeDb.employees.update(existing.id, {
        nombre: employee.nombre,
        documento: employee.documento,
        cargo: employee.cargo,
        deviceUserId: employee.deviceUserId,
        activo: employee.activo,
        syncStatus: employee.syncStatus,
        updatedAt: new Date().toISOString()
      });
      continue;
    }
    await employeeDb.employees.add(employee);
  }

  return employeeDb.employees.orderBy("updatedAt").reverse().toArray();
}

export function useEmployees() {
  const queryClient = useQueryClient();

  const employeesQuery = useQuery({
    queryKey: queryKeys.employees.list(),
    queryFn: async () => {
      try {
        const apiEmployees = await fetchEmployeesFromApi();
        return await syncLocalEmployees(apiEmployees);
      } catch {
        return employeeDb.employees.orderBy("updatedAt").reverse().toArray();
      }
    }
  });

  const createMutation = useMutation({
    mutationFn: async (payload: EmployeePayload) => {
      const response = await httpClient.post("/api/employees", payload);
      const data = (response.data as { data?: EmployeeApiItem }).data;
      if (!data) throw new Error("Respuesta inválida al crear empleado.");
      return toEmployeeRecord(data);
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.employees.all });
    }
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, ...payload }: UpdateEmployeePayload) => {
      const local = await employeeDb.employees.get(id);
      const remoteId = local?.remoteId ?? id;
      const response = await httpClient.put(`/api/employees/${remoteId}`, payload);
      const data = (response.data as { data?: EmployeeApiItem }).data;
      if (!data) throw new Error("Respuesta inválida al actualizar empleado.");
      return toEmployeeRecord(data);
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.employees.all });
    }
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      const local = await employeeDb.employees.get(id);
      const remoteId = local?.remoteId ?? id;
      await httpClient.delete(`/api/employees/${remoteId}`);
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.employees.all });
    }
  });

  const retryMutation = useMutation({
    mutationFn: async () => {
      await httpClient.post("/api/employees/sync-device");
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.employees.all });
      await queryClient.invalidateQueries({ queryKey: [...queryKeys.employees.all, "pending-commands"] });
    }
  });

  const importDeviceUsersMutation = useMutation({
    mutationFn: async () => {
      await axios.post(
        env.VITE_BIOMETRIC_SYNC_USERS_URL,
        {},
        {
          timeout: 35_000,
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json"
          }
        }
      );
      await new Promise((resolve) => setTimeout(resolve, 30_000));
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.employees.all });
      await queryClient.invalidateQueries({ queryKey: [...queryKeys.employees.all, "device-users"] });
      await queryClient.invalidateQueries({ queryKey: [...queryKeys.employees.all, "attendance"] });
    }
  });

  const clearLocalCacheMutation = useMutation({
    mutationFn: async () => {
      await employeeDb.employees.clear();
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.employees.all });
    }
  });

  const biometricStatusQuery = useQuery({
    queryKey: [...queryKeys.employees.all, "biometric-status"],
    queryFn: async () => {
      const response = await httpClient.get("/api/biometric/status");
      return (response.data as { data?: { conectado: boolean; sn?: string; lastSeen?: string } }).data;
    },
    refetchInterval: 30000
  });

  const attendanceQuery = useQuery({
    queryKey: [...queryKeys.employees.all, "attendance"],
    queryFn: async () => {
      const response = await httpClient.get("/api/biometric/attendance", {
        params: { page: 1, limit: 150 }
      });
      const payload = response.data as { data?: AttendanceItem[] };
      return payload.data ?? [];
    },
    refetchInterval: 15000
  });

  const deviceUsersQuery = useQuery({
    queryKey: [...queryKeys.employees.all, "device-users"],
    queryFn: async () => {
      const response = await httpClient.get("/api/biometric/device-users");
      const payload = response.data as {
        data?: Array<{ employeeId: number; deviceUserId: string; nombre: string; cargo?: string }>;
      };
      return payload.data ?? [];
    }
  });

  const pendingCommandsQuery = useQuery({
    queryKey: [...queryKeys.employees.all, "pending-commands"],
    queryFn: async () => {
      const response = await httpClient.get("/api/biometric/pending-commands");
      const payload = response.data as {
        data?: Array<{
          id: number;
          action: string;
          status: string;
          createdAt: string;
          deviceIp?: string;
        }>;
      };
      return payload.data ?? [];
    },
    refetchInterval: 30000
  });

  const refreshAttendance = useCallback(async () => {
    await queryClient.invalidateQueries({ queryKey: [...queryKeys.employees.all, "attendance"] });
  }, [queryClient]);

  return {
    getAll: {
      data: employeesQuery.data ?? [],
      isLoading: employeesQuery.isLoading,
      error: employeesQuery.error
    },
    biometricStatus: biometricStatusQuery.data,
    attendance: attendanceQuery.data ?? [],
    isLoadingAttendance: attendanceQuery.isLoading,
    deviceUsers: deviceUsersQuery.data ?? [],
    pendingCommands: pendingCommandsQuery.data ?? [],
    create: createMutation.mutateAsync,
    update: updateMutation.mutateAsync,
    remove: deleteMutation.mutateAsync,
    retrySync: retryMutation.mutateAsync,
    importDeviceUsers: importDeviceUsersMutation.mutateAsync,
    isSaving: createMutation.isPending || updateMutation.isPending || deleteMutation.isPending,
    isRetrying: retryMutation.isPending,
    isImportingDeviceUsers: importDeviceUsersMutation.isPending
    ,
    clearLocalCache: clearLocalCacheMutation.mutateAsync,
    isClearingCache: clearLocalCacheMutation.isPending,
    refreshAttendance
  };
}
