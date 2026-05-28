import { z } from "zod";

export const submitVoteSchema = z.object({
  voterName: z.string().trim().min(1, "Bạn cần nhập tên").max(120),
  optionIds: z.array(z.string().uuid()).min(1, "Bạn cần chọn ít nhất 1 option"),
  voterToken: z.string().trim().min(8).max(160).nullable().optional(),
  replaceExisting: z.boolean().optional(),
});

export const slugSchema = z
  .string()
  .trim()
  .toLowerCase()
  .min(1)
  .max(120)
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);

export const voteIdSchema = z.string().uuid("Vote id không hợp lệ");
