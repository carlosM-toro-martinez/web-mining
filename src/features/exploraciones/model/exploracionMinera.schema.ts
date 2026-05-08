import { z } from "zod";

export const drillHoleTypeSchema = z.enum(["DDH", "RC", "AC", "OTHER"]);
export const assayMethodSchema = z.enum(["AAS", "ICP", "XRF", "OTHER"]);
export const qaqcTypeSchema = z.enum(["BLANK", "DUPLICATE", "STANDARD"]);
export const resourceTypeSchema = z.enum(["OPEN_PIT", "UNDERGROUND"]);
export const resourceCategorySchema = z.enum(["MEASURED", "INDICATED", "INFERRED"]);

const optionalText = z.string().trim().optional().or(z.literal(""));
const requiredText = z.string().trim().min(1);
const decimalLike = z.number().finite();

const auditFieldsSchema = z.object({
  createdAt: z.string().optional(),
  updatedAt: z.string().optional(),
  createdById: z.number().int().optional().nullable(),
  updatedById: z.number().int().optional().nullable()
});

export const projectSchema = z
  .object({
    id: z.number().int().positive(),
    name: z.string().min(1),
    description: z.string().optional().nullable(),
    location: z.string().optional().nullable()
  })
  .merge(auditFieldsSchema)
  .passthrough();

export const zoneSchema = z
  .object({
    id: z.number().int().positive(),
    projectId: z.number().int().positive(),
    name: z.string().min(1),
    description: z.string().optional().nullable()
  })
  .merge(auditFieldsSchema)
  .passthrough();

export const drillHoleSchema = z
  .object({
    id: z.number().int().positive(),
    projectId: z.number().int().positive(),
    zoneId: z.number().int().positive(),
    name: z.string().min(1),
    east: z.coerce.number(),
    north: z.coerce.number(),
    elevation: z.coerce.number().optional().nullable(),
    depth: z.coerce.number(),
    azimuth: z.coerce.number().optional().nullable(),
    dip: z.coerce.number().optional().nullable(),
    type: drillHoleTypeSchema,
    campaign: z.string().optional().nullable(),
    year: z.number().int().optional().nullable()
  })
  .merge(auditFieldsSchema)
  .passthrough();

export const intervalSchema = z
  .object({
    id: z.number().int().positive(),
    drillHoleId: z.number().int().positive(),
    fromDepth: z.coerce.number(),
    toDepth: z.coerce.number()
  })
  .merge(auditFieldsSchema)
  .passthrough();

export const assaySchema = z
  .object({
    id: z.number().int().positive(),
    intervalId: z.number().int().positive(),
    au: z.coerce.number(),
    cu: z.coerce.number(),
    ag: z.coerce.number(),
    assayMethod: assayMethodSchema,
    laboratory: z.string().optional().nullable()
  })
  .merge(auditFieldsSchema)
  .passthrough();

export const lithologySchema = z
  .object({
    id: z.number().int().positive(),
    intervalId: z.number().int().positive(),
    rockType: z.string().optional().nullable(),
    alteration: z.string().optional().nullable(),
    mineralization: z.string().optional().nullable(),
    comments: z.string().optional().nullable()
  })
  .merge(auditFieldsSchema)
  .passthrough();

export const qaqcSchema = z
  .object({
    id: z.number().int().positive(),
    assayId: z.number().int().positive(),
    type: qaqcTypeSchema,
    passed: z.boolean(),
    notes: z.string().optional().nullable()
  })
  .merge(auditFieldsSchema)
  .passthrough();

export const resourceSchema = z
  .object({
    id: z.number().int().positive(),
    projectId: z.number().int().positive(),
    type: resourceTypeSchema,
    category: resourceCategorySchema,
    cutoff: z.coerce.number(),
    tonnes: z.coerce.number(),
    au: z.coerce.number(),
    cu: z.coerce.number(),
    ag: z.coerce.number(),
    cuEq: z.coerce.number(),
    description: z.string().optional().nullable()
  })
  .merge(auditFieldsSchema)
  .passthrough();

export const listMetaSchema = z
  .object({
    total: z.number().int().nonnegative().optional(),
    page: z.number().int().positive().optional(),
    limit: z.number().int().positive().optional()
  })
  .passthrough();

export const createProjectPayloadSchema = z.object({
  name: requiredText,
  description: optionalText,
  location: optionalText
});

export const updateProjectPayloadSchema = createProjectPayloadSchema.partial().refine((v) => Object.keys(v).length > 0);

export const createZonePayloadSchema = z.object({
  projectId: z.number().int().positive(),
  name: requiredText,
  description: optionalText
});

export const updateZonePayloadSchema = createZonePayloadSchema.partial().refine((v) => Object.keys(v).length > 0);

export const createDrillHolePayloadSchema = z.object({
  projectId: z.number().int().positive(),
  zoneId: z.number().int().positive(),
  name: requiredText,
  east: decimalLike,
  north: decimalLike,
  depth: decimalLike,
  type: drillHoleTypeSchema,
  elevation: decimalLike.optional(),
  azimuth: decimalLike.optional(),
  dip: decimalLike.optional(),
  campaign: optionalText,
  year: z.number().int().optional()
});

export const updateDrillHolePayloadSchema = createDrillHolePayloadSchema
  .partial()
  .refine((v) => Object.keys(v).length > 0);

export const createIntervalPayloadSchema = z.object({
  drillHoleId: z.number().int().positive(),
  fromDepth: decimalLike,
  toDepth: decimalLike
});

export const updateIntervalPayloadSchema = createIntervalPayloadSchema.partial().refine((v) => Object.keys(v).length > 0);

export const createAssayPayloadSchema = z.object({
  intervalId: z.number().int().positive(),
  au: decimalLike,
  cu: decimalLike,
  ag: decimalLike,
  assayMethod: assayMethodSchema,
  laboratory: optionalText
});

export const updateAssayPayloadSchema = createAssayPayloadSchema.partial().refine((v) => Object.keys(v).length > 0);

export const createLithologyPayloadSchema = z.object({
  intervalId: z.number().int().positive(),
  rockType: optionalText,
  alteration: optionalText,
  mineralization: optionalText,
  comments: optionalText
});

export const updateLithologyPayloadSchema = createLithologyPayloadSchema.partial().refine((v) => Object.keys(v).length > 0);

export const createQaqcPayloadSchema = z.object({
  assayId: z.number().int().positive(),
  type: qaqcTypeSchema,
  passed: z.boolean(),
  notes: optionalText
});

export const updateQaqcPayloadSchema = createQaqcPayloadSchema.partial().refine((v) => Object.keys(v).length > 0);

export const createResourcePayloadSchema = z.object({
  projectId: z.number().int().positive(),
  type: resourceTypeSchema,
  category: resourceCategorySchema,
  cutoff: decimalLike,
  tonnes: decimalLike,
  au: decimalLike,
  cu: decimalLike,
  ag: decimalLike,
  cuEq: decimalLike,
  description: optionalText
});

export const updateResourcePayloadSchema = createResourcePayloadSchema.partial().refine((v) => Object.keys(v).length > 0);

export type Project = z.infer<typeof projectSchema>;
export type Zone = z.infer<typeof zoneSchema>;
export type DrillHole = z.infer<typeof drillHoleSchema>;
export type Interval = z.infer<typeof intervalSchema>;
export type Assay = z.infer<typeof assaySchema>;
export type Lithology = z.infer<typeof lithologySchema>;
export type QAQC = z.infer<typeof qaqcSchema>;
export type Resource = z.infer<typeof resourceSchema>;

export type CreateProjectPayload = z.infer<typeof createProjectPayloadSchema>;
export type UpdateProjectPayload = z.infer<typeof updateProjectPayloadSchema>;
export type CreateZonePayload = z.infer<typeof createZonePayloadSchema>;
export type UpdateZonePayload = z.infer<typeof updateZonePayloadSchema>;
export type CreateDrillHolePayload = z.infer<typeof createDrillHolePayloadSchema>;
export type UpdateDrillHolePayload = z.infer<typeof updateDrillHolePayloadSchema>;
export type CreateIntervalPayload = z.infer<typeof createIntervalPayloadSchema>;
export type UpdateIntervalPayload = z.infer<typeof updateIntervalPayloadSchema>;
export type CreateAssayPayload = z.infer<typeof createAssayPayloadSchema>;
export type UpdateAssayPayload = z.infer<typeof updateAssayPayloadSchema>;
export type CreateLithologyPayload = z.infer<typeof createLithologyPayloadSchema>;
export type UpdateLithologyPayload = z.infer<typeof updateLithologyPayloadSchema>;
export type CreateQaqcPayload = z.infer<typeof createQaqcPayloadSchema>;
export type UpdateQaqcPayload = z.infer<typeof updateQaqcPayloadSchema>;
export type CreateResourcePayload = z.infer<typeof createResourcePayloadSchema>;
export type UpdateResourcePayload = z.infer<typeof updateResourcePayloadSchema>;
