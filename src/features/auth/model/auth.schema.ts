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
    token: z.string().min(1),
    user: authUserSchema
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

export const authSessionSchema = z.object({
  token: z.string().min(1),
  user: authUserSchema
});

export type AuthRole = z.infer<typeof roleSchema>;
export type AuthUser = z.infer<typeof authUserSchema>;
export type LoginPayload = z.infer<typeof loginPayloadSchema>;
export type RegisterPayload = z.infer<typeof registerPayloadSchema>;
export type AuthSession = z.infer<typeof authSessionSchema>;
