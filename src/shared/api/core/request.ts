import type { AxiosInstance, AxiosRequestConfig } from "axios";
import { ZodError, type ZodType } from "zod";
import { httpClient } from "@/shared/api/core/httpClient";
import { ApiError } from "@/shared/api/core/apiError";

interface RequestOptions<TResponse> {
  url: string;
  config?: AxiosRequestConfig;
  schema: ZodType<TResponse>;
  client?: AxiosInstance;
}

interface PostRequestOptions<TResponse, TBody> {
  url: string;
  body: TBody;
  config?: AxiosRequestConfig;
  schema: ZodType<TResponse>;
  client?: AxiosInstance;
}

export async function getRequest<TResponse>({
  url,
  config,
  schema,
  client = httpClient
}: RequestOptions<TResponse>): Promise<TResponse> {
  const response = await client.get(url, config);
  try {
    return schema.parse(response.data);
  } catch (error) {
    if (error instanceof ZodError) {
      throw new ApiError("Respuesta del servidor con formato inesperado.", {
        details: {
          url,
          method: "GET",
          response: response.data,
          issues: error.issues
        }
      });
    }
    throw error;
  }
}

export async function postRequest<TResponse, TBody>({
  url,
  body,
  config,
  schema,
  client = httpClient
}: PostRequestOptions<TResponse, TBody>): Promise<TResponse> {
  const response = await client.post(url, body, config);
  try {
    return schema.parse(response.data);
  } catch (error) {
    if (error instanceof ZodError) {
      throw new ApiError("Respuesta del servidor con formato inesperado.", {
        details: {
          url,
          method: "POST",
          response: response.data,
          issues: error.issues
        }
      });
    }
    throw error;
  }
}
