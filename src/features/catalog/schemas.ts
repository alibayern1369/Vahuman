import { z } from "zod";

const toman = z
  .number({ invalid_type_error: "قیمت باید عدد باشد." })
  .int("قیمت باید عدد صحیح تومان باشد.")
  .nonnegative("قیمت نمی‌تواند منفی باشد.");

const optionalToman = z
  .number({ invalid_type_error: "قیمت باید عدد باشد." })
  .int("قیمت باید عدد صحیح تومان باشد.")
  .nonnegative("قیمت نمی‌تواند منفی باشد.")
  .nullable()
  .optional();

export const entityStatusSchema = z.enum(["active", "inactive"], {
  errorMap: () => ({ message: "وضعیت نامعتبر است." }),
});

export const productStatusSchema = z.enum(["draft", "published", "archived"], {
  errorMap: () => ({ message: "وضعیت محصول نامعتبر است." }),
});

export const brandInputSchema = z.object({
  name: z.string().trim().min(1, "نام برند الزامی است.").max(120),
  slug: z.string().trim().max(160).optional(),
  description: z.string().trim().max(2000).optional().nullable(),
  logoUrl: z
    .string()
    .trim()
    .url("آدرس لوگو نامعتبر است.")
    .optional()
    .nullable()
    .or(z.literal("")),
  status: entityStatusSchema.default("active"),
});

export const categoryInputSchema = z.object({
  name: z.string().trim().min(1, "نام دسته الزامی است.").max(120),
  slug: z.string().trim().max(160).optional(),
  description: z.string().trim().max(2000).optional().nullable(),
  parentId: z.string().uuid("دسته والد نامعتبر است.").optional().nullable(),
  status: entityStatusSchema.default("active"),
  sortOrder: z.number().int().default(0),
});

export const attributeInputSchema = z.object({
  name: z.string().trim().min(1, "نام ویژگی الزامی است.").max(120),
  slug: z.string().trim().max(160).optional(),
  sortOrder: z.number().int().default(0),
  status: entityStatusSchema.default("active"),
});

export const attributeValueInputSchema = z.object({
  attributeId: z.string().uuid(),
  value: z.string().trim().min(1, "مقدار ویژگی الزامی است.").max(120),
  slug: z.string().trim().max(160).optional(),
  hex: z
    .string()
    .trim()
    .regex(/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/, "کد رنگ نامعتبر است.")
    .optional()
    .nullable()
    .or(z.literal("")),
  sortOrder: z.number().int().default(0),
  status: entityStatusSchema.default("active"),
});

export const productInputSchema = z
  .object({
    name: z.string().trim().min(1, "نام محصول الزامی است.").max(200),
    slug: z.string().trim().max(220).optional(),
    shortDescription: z.string().trim().max(500).optional().nullable(),
    description: z.string().trim().max(20000).optional().nullable(),
    sku: z.string().trim().max(120).optional().nullable().or(z.literal("")),
    brandId: z.string().uuid().optional().nullable(),
    categoryIds: z.array(z.string().uuid()).default([]),
    primaryCategoryId: z.string().uuid().optional().nullable(),
    status: productStatusSchema.default("draft"),
    priceToman: toman,
    compareAtPriceToman: optionalToman,
    trackInventory: z.boolean().default(true),
    stockQuantity: z.number().int().nonnegative().default(0),
    isFeatured: z.boolean().default(false),
    seoTitle: z.string().trim().max(200).optional().nullable(),
    seoDescription: z.string().trim().max(500).optional().nullable(),
    specifications: z
      .array(
        z.object({
          label: z.string().trim().min(1).max(120),
          value: z.string().trim().min(1).max(500),
          sortOrder: z.number().int().default(0),
        }),
      )
      .default([]),
    media: z
      .array(
        z.object({
          url: z.string().trim().url("آدرس تصویر نامعتبر است."),
          alt: z.string().trim().max(200).optional().nullable(),
          sortOrder: z.number().int().default(0),
          isPrimary: z.boolean().default(false),
        }),
      )
      .default([]),
  })
  .superRefine((data, ctx) => {
    if (
      data.compareAtPriceToman != null &&
      data.compareAtPriceToman > 0 &&
      data.compareAtPriceToman < data.priceToman
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "قیمت قبلی نباید کمتر از قیمت فروش باشد.",
        path: ["compareAtPriceToman"],
      });
    }
    if (
      data.primaryCategoryId &&
      data.categoryIds.length > 0 &&
      !data.categoryIds.includes(data.primaryCategoryId)
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "دسته اصلی باید در لیست دسته‌ها باشد.",
        path: ["primaryCategoryId"],
      });
    }
  });

export const variantGenerateSchema = z.object({
  productId: z.string().uuid(),
  attributeValueIdsByAttribute: z.record(
    z.string().uuid(),
    z.array(z.string().uuid()).min(1),
  ),
});

export const variantUpdateSchema = z.object({
  id: z.string().uuid(),
  sku: z.string().trim().max(120).optional().nullable().or(z.literal("")),
  priceToman: optionalToman,
  compareAtPriceToman: optionalToman,
  stockQuantity: z.number().int().nonnegative(),
  isActive: z.boolean(),
  title: z.string().trim().max(200).optional().nullable(),
});

export type BrandInput = z.infer<typeof brandInputSchema>;
export type CategoryInput = z.infer<typeof categoryInputSchema>;
export type AttributeInput = z.infer<typeof attributeInputSchema>;
export type AttributeValueInput = z.infer<typeof attributeValueInputSchema>;
export type ProductInput = z.infer<typeof productInputSchema>;
