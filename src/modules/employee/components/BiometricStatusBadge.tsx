import { useQuery } from "@tanstack/react-query";
import { Fingerprint } from "lucide-react";
import { usePermisos } from "@/features/auth/hooks/usePermisos";
import { httpClient } from "@/shared/api/core/httpClient";
import { queryKeys } from "@/shared/lib/queryKeys";

interface BiometricStatus {
  conectado: boolean;
  sn?: string;
  lastSeen?: string;
}

function formatLastSeen(lastSeen?: string) {
  if (!lastSeen) return "sin registro";
  const seconds = Math.max(0, Math.round((Date.now() - new Date(lastSeen).getTime()) / 1000));
  if (seconds < 60) return `hace ${seconds} s`;
  if (seconds < 3600) return `hace ${Math.round(seconds / 60)} min`;
  return new Date(lastSeen).toLocaleString("es-BO");
}

// Estado de conexión del biométrico. Solo visible con el permiso
// personal.biometrico:ver_estado (por defecto solo ADMIN).
export function BiometricStatusBadge() {
  const { can } = usePermisos();
  const puedeVer = can("personal.biometrico", "ver_estado");

  const statusQuery = useQuery({
    queryKey: [...queryKeys.employees.all, "biometric-status"],
    enabled: puedeVer,
    queryFn: async () => {
      const response = await httpClient.get("/api/biometric/status");
      return (response.data as { data?: BiometricStatus }).data ?? { conectado: false };
    },
    refetchInterval: 30000
  });

  if (!puedeVer) return null;

  const status = statusQuery.data;
  const conectado = status?.conectado ?? false;
  const label = statusQuery.isLoading
    ? "Consultando biométrico..."
    : statusQuery.isError
      ? "No se pudo consultar el biométrico"
      : conectado
        ? "Biométrico conectado"
        : "Biométrico desconectado";

  const colorClass = statusQuery.isLoading
    ? "border-[var(--color-border-soft)] text-[var(--color-on-surface-variant)]"
    : conectado
      ? "border-emerald-500/45 bg-emerald-500/10 text-emerald-600"
      : "border-red-500/45 bg-red-500/10 text-red-600";

  return (
    <div className={`inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-xs font-semibold ${colorClass}`}>
      <span className="relative flex h-2.5 w-2.5">
        {conectado ? <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-500 opacity-60" /> : null}
        <span className={`relative inline-flex h-2.5 w-2.5 rounded-full ${conectado ? "bg-emerald-500" : statusQuery.isLoading ? "bg-gray-400" : "bg-red-500"}`} />
      </span>
      <Fingerprint size={14} />
      <span>{label}</span>
      {status && !statusQuery.isLoading ? (
        <span className="font-normal opacity-80">
          · última señal {formatLastSeen(status.lastSeen)}
          {status.sn ? ` · SN ${status.sn}` : ""}
        </span>
      ) : null}
    </div>
  );
}
