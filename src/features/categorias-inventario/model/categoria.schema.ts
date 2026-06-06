import { z } from "zod";

const categoriaBaseSchema = z.object({
  id: z.number().int().positive(),
  codigo: z.string().min(1),
  nombre: z.string().min(1),
  parentId: z.number().int().positive().nullable().optional()
});

const categoriaParentSchema = z.object({
  id: z.number().int().positive(),
  codigo: z.string().min(1),
  nombre: z.string().min(1)
});

export const categoriaSchema = categoriaBaseSchema.extend({
  parent: categoriaParentSchema.nullable().optional()
});

export const categoriaTreeNodeSchema: z.ZodType<{
  id: number;
  codigo: string;
  nombre: string;
  parentId?: number | null;
  children: Array<{
    id: number;
    codigo: string;
    nombre: string;
    parentId?: number | null;
    children?: unknown[];
  }>;
}> = z
  .object({
    id: z.number().int().positive(),
    codigo: z.string().min(1),
    nombre: z.string().optional().nullable(),
    parentId: z.number().int().positive().nullable().optional(),
    children: z.array(
      z.object({
        id: z.number().int().positive(),
        codigo: z.string().min(1),
        nombre: z.string().optional().nullable(),
        parentId: z.number().int().positive().nullable().optional(),
        children: z.array(z.unknown()).optional()
      })
    )
  })
  .transform((node) => ({
    id: node.id,
    codigo: node.codigo,
    nombre: node.nombre?.trim() || "(Sin nombre)",
    parentId: node.parentId ?? null,
    children: node.children.map((child) => ({
      id: child.id,
      codigo: child.codigo,
      nombre: child.nombre?.trim() || "(Sin nombre)",
      parentId: child.parentId ?? null
    }))
  }));

export const categoriasTreeResponseSchema = z.object({
  success: z.boolean(),
  data: z.array(categoriaTreeNodeSchema)
});

export const categoriaResponseSchema = z.object({
  success: z.boolean(),
  data: categoriaSchema
});

export const categoriaDeleteResponseSchema = z.object({
  success: z.boolean(),
  message: z.string().optional()
});

export const createCategoriaPayloadSchema = z.object({
  codigo: z.string().trim().min(1, "El codigo es obligatorio."),
  nombre: z.string().trim().min(1, "El nombre es obligatorio."),
  parentId: z.number().int().positive().optional()
});

export const updateCategoriaPayloadSchema = z.object({
  codigo: z.string().trim().min(1, "El codigo es obligatorio."),
  nombre: z.string().trim().min(1, "El nombre es obligatorio."),
  parentId: z.number().int().positive().optional().nullable()
});

export type Categoria = z.infer<typeof categoriaSchema>;
export type CategoriaTreeNode = z.infer<typeof categoriaTreeNodeSchema>;
export type CategoriasTreeResponse = z.infer<typeof categoriasTreeResponseSchema>;
export type CategoriaResponse = z.infer<typeof categoriaResponseSchema>;
export type CategoriaDeleteResponse = z.infer<typeof categoriaDeleteResponseSchema>;
export type CreateCategoriaPayload = z.infer<typeof createCategoriaPayloadSchema>;
export type UpdateCategoriaPayload = z.infer<typeof updateCategoriaPayloadSchema>;
