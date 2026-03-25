import { z } from "zod";

const movementSchema = z.enum(["ENTRADA", "SALIDA"]);

const kardexSummaryItemSchema = z.object({
  value: z.string().min(1),
  label: z.string().min(1)
});

const kardexRowSchema = z.object({
  date: z.string().min(1),
  movement: movementSchema,
  documentRef: z.string().min(1),
  quantity: z.string().min(1),
  balance: z.string().min(1),
  unitCost: z.string().min(1),
  totalCost: z.string().min(1)
});

export const kardexValoradoSchema = z.object({
  title: z.string().min(1),
  subtitle: z.string().min(1),
  breadcrumbs: z.tuple([z.string(), z.string()]),
  filters: z.object({
    dateRange: z.string().min(1),
    costCenters: z.array(z.string().min(1)).min(1),
    productFamilies: z.array(z.string().min(1)).min(1)
  }),
  summary: z.object({
    initialBalance: kardexSummaryItemSchema,
    totalEntries: kardexSummaryItemSchema,
    totalOutputs: kardexSummaryItemSchema,
    finalTotalValue: kardexSummaryItemSchema
  }),
  rows: z.array(kardexRowSchema).min(1),
  pagination: z.object({
    label: z.string().min(1),
    pages: z.array(z.number().int().positive()).min(1),
    currentPage: z.number().int().positive()
  }),
  notes: z.object({
    valuationMethod: z.string().min(1),
    lastSync: z.string().min(1)
  })
});

export type KardexValorado = z.infer<typeof kardexValoradoSchema>;
