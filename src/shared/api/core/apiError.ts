import axios, { AxiosError } from "axios";
import { ZodError } from "zod";

const CAMPOS: Record<string, string> = {
  municipioOrigenId: "Municipio de origen",
  transportistaId: "Transportista",
  vehiculoId: "Vehículo",
  vehiculoNuevoId: "Vehículo nuevo",
  choferId: "Chofer",
  tipoMineralId: "Tipo de mineral",
  destinoIngenioId: "Ingenio destino",
  nivel: "Nivel",
  combustibleAsignadoLitros: "Litros de combustible",
  combustibleEntregadoLitros: "Litros entregados",
  fechaDespachoReal: "Fecha de despacho",
  tonelajeBruto: "Tonelaje bruto",
  tonelajeTara: "Tara",
  tonelajeNeto: "Neto",
  motivo: "Motivo",
  codigo: "Código",
  fecha: "Fecha",
  placa: "Placa",
  nombre: "Nombre",
  ci: "CI"
};

// Mensaje real para mostrarle al usuario: el del servidor, o el de la
// validación hecha en el navegador antes de enviar (nunca uno genérico).
export function mensajeDeError(error: unknown, fallback: string): string {
  if (error instanceof ApiError) return error.message;
  if (error instanceof ZodError) {
    const partes = error.issues.map((issue) => {
      const clave = [...issue.path].reverse().find((p) => typeof p === "string") as string | undefined;
      const campo = clave ? (CAMPOS[clave] ?? clave) : "";
      const porDefecto = /^(Invalid|Too (small|big)|Unrecognized|Expected)/.test(issue.message);
      const texto = porDefecto ? "falta o tiene un valor inválido" : issue.message;
      return campo && porDefecto ? `${campo}: ${texto}` : texto;
    });
    return [...new Set(partes)].join(". ") || fallback;
  }
  return fallback;
}

export class ApiError extends Error {
  readonly statusCode?: number;
  readonly code?: string;
  readonly details?: unknown;

  constructor(message: string, options?: { statusCode?: number; code?: string; details?: unknown }) {
    super(message);
    this.name = "ApiError";
    this.statusCode = options?.statusCode;
    this.code = options?.code;
    this.details = options?.details;
  }
}

export function normalizeApiError(error: unknown): ApiError {
  if (!axios.isAxiosError(error)) {
    return new ApiError("Error inesperado de red o aplicación.", { details: error });
  }

  const axiosError = error as AxiosError<unknown>;
  const payload = axiosError.response?.data;
  const parsedPayload = parseMaybeJson(payload);
  const message = resolveApiMessage(parsedPayload, axiosError);

  return new ApiError(message, {
    statusCode: axiosError.response?.status,
    code: resolveApiCode(parsedPayload),
    details: parsedPayload ?? payload ?? error
  });
}

function parseMaybeJson(value: unknown): unknown {
  if (typeof value !== "string") {
    return value;
  }

  const trimmed = value.trim();
  if (!trimmed.startsWith("{") && !trimmed.startsWith("[")) {
    return value;
  }

  try {
    return JSON.parse(trimmed);
  } catch {
    return value;
  }
}

function resolveApiCode(payload: unknown): string | undefined {
  if (!payload || typeof payload !== "object") return undefined;
  const data = payload as Record<string, unknown>;
  return typeof data.code === "string" ? data.code : undefined;
}

function resolveApiMessage(payload: unknown, axiosError: AxiosError<unknown>): string {
  if (payload && typeof payload === "object") {
    const data = payload as Record<string, unknown>;
    const candidates = [data.error, data.message, data.msg];
    for (const candidate of candidates) {
      if (typeof candidate === "string" && candidate.trim()) {
        return candidate.trim();
      }
    }
  }

  if (typeof payload === "string" && payload.trim()) {
    return payload.trim();
  }

  if (!axiosError.response) {
    return "No se pudo conectar con el servidor.";
  }

  return "No fue posible completar la solicitud.";
}
