import { z } from "zod";
import { statusSchema } from "./common";

export const customerStatusSchema = z.object({
  status: statusSchema,
});

export type CustomerStatusInput = z.infer<typeof customerStatusSchema>;
