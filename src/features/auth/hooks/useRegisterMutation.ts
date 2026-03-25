import { useMutation } from "@tanstack/react-query";
import { registerUser } from "@/features/auth/api/authApi";
import {
  registerPayloadSchema,
  type RegisterPayload
} from "@/features/auth/model/auth.schema";

export function useRegisterMutation() {
  return useMutation({
    mutationFn: async (payload: RegisterPayload) => {
      const parsed = registerPayloadSchema.parse(payload);
      return registerUser(parsed);
    }
  });
}
