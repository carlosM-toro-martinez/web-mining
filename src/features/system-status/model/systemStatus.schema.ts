import { z } from "zod";

export const systemStatusSchema = z.object({
  message: z.string().min(1),
  version: z.string().min(1),
  company: z.string().min(1),
  creator: z.string().min(1),
  updatedAt: z.string().min(1)
});

export type SystemStatus = z.infer<typeof systemStatusSchema>;
