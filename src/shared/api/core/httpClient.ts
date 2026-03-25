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

httpClient.interceptors.request.use((config) => {
  const nextConfig = config;
  nextConfig.headers["X-Requested-With"] = "XMLHttpRequest";
  const token = getAuthToken();
  if (token) {
    nextConfig.headers.Authorization = `Bearer ${token}`;
  }
  return nextConfig;
});

httpClient.interceptors.response.use(
  (response) => response,
  (error: unknown) => Promise.reject(normalizeApiError(error))
);
