import axios, { AxiosError } from "axios";

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

  const axiosError = error as AxiosError<{ message?: string; code?: string }>;
  const message =
    axiosError.response?.data?.message ??
    axiosError.message ??
    "No fue posible completar la solicitud.";

  return new ApiError(message, {
    statusCode: axiosError.response?.status,
    code: axiosError.response?.data?.code,
    details: axiosError.response?.data ?? error
  });
}
