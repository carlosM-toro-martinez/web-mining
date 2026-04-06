import { z } from "zod";

export const roleSchema = z.enum(["ADMIN", "ALMACENERO", "SUPERINTENDENTE", "TRABAJADOR"]);

export const authUserSchema = z.object({
  id: z.number().int().positive(),
  nombre: z.string().min(1),
  email: z.string().email(),
  role: roleSchema
});

export const loginPayloadSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1)
});

export const loginResponseSchema = z.object({
  success: z.boolean(),
  data: z.object({
    accessToken: z.string().min(1),
    refreshToken: z.string().min(1),
    user: authUserSchema
  })
});

export const refreshPayloadSchema = z.object({
  refreshToken: z.string().min(1)
});

export const refreshResponseSchema = z.object({
  success: z.boolean(),
  data: z.object({
    accessToken: z.string().min(1),
    refreshToken: z.string().min(1).optional()
  })
});

export const registerPayloadSchema = z.object({
  nombre: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(8),
  role: roleSchema
});

export const registerResponseSchema = z.object({
  success: z.boolean(),
  data: authUserSchema
});

export const forgotPasswordPayloadSchema = z.object({
  email: z.string().email()
});

const genericMessageResponseSchema = z
  .object({
    success: z.boolean().optional(),
    message: z.string().min(1).optional(),
    data: z
      .object({
        message: z.string().min(1).optional()
      })
      .optional()
  })
  .transform((value) => ({
    success: value.success ?? true,
    message: value.message ?? value.data?.message ?? "Operacion completada."
  }));

export const forgotPasswordResponseSchema = genericMessageResponseSchema;

export const resetPasswordPayloadSchema = z
  .object({
    token: z.string().min(1),
    password: z.string().min(8),
    confirmPassword: z.string().min(8)
  })
  .refine((value) => value.password === value.confirmPassword, {
    message: "Las contraseñas no coinciden.",
    path: ["confirmPassword"]
  });

export const resetPasswordRequestSchema = z.object({
  password: z.string().min(8)
});

export const resetPasswordResponseSchema = genericMessageResponseSchema;

export const authSessionSchema = z.object({
  accessToken: z.string().min(1),
  refreshToken: z.string().min(1),
  user: authUserSchema
});

export type AuthRole = z.infer<typeof roleSchema>;
export type AuthUser = z.infer<typeof authUserSchema>;
export type LoginPayload = z.infer<typeof loginPayloadSchema>;
export type RegisterPayload = z.infer<typeof registerPayloadSchema>;
export type ForgotPasswordPayload = z.infer<typeof forgotPasswordPayloadSchema>;
export type ResetPasswordPayload = z.infer<typeof resetPasswordPayloadSchema>;
export type RefreshPayload = z.infer<typeof refreshPayloadSchema>;
export type AuthSession = z.infer<typeof authSessionSchema>;
