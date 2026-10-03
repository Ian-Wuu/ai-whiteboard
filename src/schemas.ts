import { z } from "zod";

export const interactiveTemplateSchema = z.enum([
  "parameter_slider",
  "toggle_compare",
  "timeline_scrubber",
  "calculator_form",
]);

const createOperationSchema = z.object({
  op: z.literal("create"),
  element: z.object({
    type: z.enum(["text", "note", "rectangle", "ellipse", "diamond", "arrow", "interactive", "reference_image"]),
    id: z.string().min(1).optional(),
    text: z.string().max(2_000).optional(),
    x: z.number().finite().optional(),
    y: z.number().finite().optional(),
    width: z.number().positive().max(1_600).optional(),
    height: z.number().positive().max(900).optional(),
    templateId: interactiveTemplateSchema.optional(),
    assetToken: z.string().min(16).max(200).optional(),
    imageUrl: z.string().url().refine((value) => value.startsWith("https://")).optional(),
    sourceUrl: z.string().url().refine((value) => value.startsWith("https://")).optional(),
    sourceDomain: z.string().trim().min(1).max(253).optional(),
  }).refine(
    (element) => element.type !== "reference_image" || Boolean(element.assetToken || element.imageUrl),
    { message: "reference_image_requires_asset" },
  ),
});

export const boardOperationSchema = z.discriminatedUnion("op", [
  createOperationSchema,
  z.object({
    op: z.literal("patch"),
    elementId: z.string().min(1),
    patch: z.object({
      x: z.number().finite().optional(),
      y: z.number().finite().optional(),
      width: z.number().positive().max(1_600).optional(),
      height: z.number().positive().max(900).optional(),
    }),
  }),
  z.object({ op: z.literal("remove"), elementId: z.string().min(1) }),
]);

export const toolArgsSchemas = {
  get_board_state: z.object({
    boardId: z.string().min(1),
    detail: z.enum(["compact", "full"]),
  }),
  apply_board_ops: z.object({
    boardId: z.string().min(1),
    expectedBoardRevision: z.number().int().nonnegative(),
    ops: z.array(boardOperationSchema).min(1).max(30),
  }),
  advance_board: z.object({
    fromBoardId: z.string().min(1),
    title: z.string().trim().min(1).max(80),
    reason: z.string().trim().min(1).max(300),
  }),
  search_reference_images: z.object({
    query: z.string().trim().min(2).max(200),
    maxResults: z.number().int().min(1).max(5),
  }),
} as const;

export function validateToolArguments(name: string, value: unknown) {
  const schema = toolArgsSchemas[name as keyof typeof toolArgsSchemas];
  if (!schema) return { success: false as const, error: "unknown_tool" };
  const result = schema.safeParse(value);
  return result.success
    ? { success: true as const, data: result.data }
    : { success: false as const, error: "invalid_arguments" };
}
