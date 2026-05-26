import { z } from "zod";

const slugRegex = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

const emptyStringToNull = (value: unknown) => {
  if (typeof value !== "string") {
    return value;
  }

  const trimmed = value.trim();
  return trimmed.length === 0 ? null : trimmed;
};

export const pollOptionSchema = z.object({
  id: z.string().uuid().optional(),
  label: z.string().trim().min(1, "Option cần có tên").max(160),
  imageUrl: z.preprocess(
    emptyStringToNull,
    z.string().url("URL hình không hợp lệ").nullable().optional(),
  ),
  orderIndex: z.coerce.number().int().min(0).optional(),
});

export const pollInputSchema = z
  .object({
    title: z.string().trim().min(1, "Poll cần có tiêu đề").max(180),
    description: z.preprocess(emptyStringToNull, z.string().max(1000).nullable().optional()),
    slug: z
      .string()
      .trim()
      .toLowerCase()
      .min(3, "Slug cần ít nhất 3 ký tự")
      .max(120)
      .regex(slugRegex, "Slug chỉ gồm chữ thường, số và dấu gạch ngang"),
    allowMultiple: z.coerce.boolean().default(false),
    maxSelections: z.preprocess(
      (value) => {
        if (value === "" || value === undefined) {
          return null;
        }

        return value;
      },
      z.coerce.number().int().min(1).nullable().optional(),
    ),
    status: z.enum(["active", "closed"]).default("active"),
    showResultAfterVote: z.coerce.boolean().default(true),
    options: z.array(pollOptionSchema).min(2, "Cần ít nhất 2 option"),
  })
  .superRefine((value, ctx) => {
    if (!value.allowMultiple && value.maxSelections && value.maxSelections !== 1) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["maxSelections"],
        message: "Poll chọn 1 chỉ nên có maxSelections là 1 hoặc để trống",
      });
    }

    if (
      value.allowMultiple &&
      value.maxSelections &&
      value.maxSelections > value.options.length
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["maxSelections"],
        message: "Số lựa chọn tối đa không được lớn hơn số option",
      });
    }
  });

export const pollIdSchema = z.string().uuid("Poll id không hợp lệ");
