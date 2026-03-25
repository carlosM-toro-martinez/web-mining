import axios from "axios";
import { env } from "@/shared/config/env";
import { normalizeApiError } from "@/shared/api/core/apiError";
import { getAuthToken } from "@/shared/lib/authToken";

const resolvedBaseUrl = env.VITE_API_BASE_URL || "http://localhost:3000";

export const httpClient = axios.create({
  baseURL: resolvedBaseUrl,
  timeout: 12_000,
  headers: {
    "Content-Type": "application/json",
    Accept: "application/json"
  }
});

if (import.meta.env.DEV) {
  // Helps verify runtime env loading in browser console.
  console.info("[httpClient] baseURL:", resolvedBaseUrl);
}

function maskSensitive(value: unknown): unknown {
  if (!value || typeof value !== "object") {
    return value;
  }

  if (Array.isArray(value)) {
    return value.map(maskSensitive);
  }

  return Object.entries(value as Record<string, unknown>).reduce<Record<string, unknown>>(
    (accumulator, [key, currentValue]) => {
      const lowerKey = key.toLowerCase();
      const shouldMask =
        lowerKey.includes("password") ||
        lowerKey.includes("token") ||
        lowerKey === "authorization";

      accumulator[key] = shouldMask ? "***" : maskSensitive(currentValue);
      return accumulator;
    },
    {}
  );
}

httpClient.interceptors.request.use((config) => {
  const nextConfig = config;
  nextConfig.headers["X-Requested-With"] = "XMLHttpRequest";
  const token = getAuthToken();
  if (token) {
    nextConfig.headers.Authorization = `Bearer ${token}`;
  }

  if (import.meta.env.DEV) {
    const method = (nextConfig.method ?? "GET").toUpperCase();
    console.info(`[API ->] ${method} ${nextConfig.url ?? ""}`, {
      params: maskSensitive(nextConfig.params),
      data: maskSensitive(nextConfig.data)
    });
  }

  return nextConfig;
});

httpClient.interceptors.response.use(
  (response) => {
    if (import.meta.env.DEV) {
      const method = (response.config.method ?? "GET").toUpperCase();
      console.info(`[API <-] ${response.status} ${method} ${response.config.url ?? ""}`, {
        data: maskSensitive(response.data)
      });
    }
    return response;
  },
  (error: unknown) => {
    const normalized = normalizeApiError(error);
    if (normalized.statusCode === 401 && typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("auth:unauthorized"));
    }

    if (import.meta.env.DEV) {
      console.error("[API xx]", {
        message: normalized.message,
        statusCode: normalized.statusCode,
        code: normalized.code,
        details: maskSensitive(normalized.details)
      });
    }

    return Promise.reject(normalized);
  }
);
