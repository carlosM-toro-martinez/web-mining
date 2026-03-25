import type { AxiosInstance, AxiosRequestConfig } from "axios";
import type { ZodType } from "zod";
import { httpClient } from "@/shared/api/core/httpClient";

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
  return schema.parse(response.data);
}

export async function postRequest<TResponse, TBody>({
  url,
  body,
  config,
  schema,
  client = httpClient
}: PostRequestOptions<TResponse, TBody>): Promise<TResponse> {
  const response = await client.post(url, body, config);
  return schema.parse(response.data);
}
