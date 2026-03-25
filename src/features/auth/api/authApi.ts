import { postRequest } from "@/shared/api/core/request";
import { apiEndpoints } from "@/shared/api/endpoints";
import {
  loginResponseSchema,
  registerResponseSchema,
  type LoginPayload,
  type RegisterPayload
} from "@/features/auth/model/auth.schema";

export async function login(payload: LoginPayload) {
  return postRequest({
    url: apiEndpoints.auth.login,
    body: payload,
    schema: loginResponseSchema
  });
}

export async function registerUser(payload: RegisterPayload) {
  return postRequest({
    url: apiEndpoints.auth.register,
    body: payload,
    schema: registerResponseSchema
  });
}
