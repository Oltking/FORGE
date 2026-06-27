/** Input validation for Forge operations. */

import { z } from "zod";

export const scopeSchema = z.enum(["small", "medium", "large"]);

export const workPayloadSchema = z.object({
  kind: z.literal("work_record"),
  v: z.literal(1),
  title: z.string().min(1).max(200),
  description: z.string().min(1).max(5000),
  worker: z.string().min(1).max(80),
  worker_type: z.enum(["human", "agent"]),
  client: z.string().min(1).max(120),
  domain: z.string().min(1).max(80),
  scope: scopeSchema,
  start_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  end_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  deliverable_ref: z.string().max(300).default(""),
  tags: z.array(z.string().min(1).max(40)).max(5).default([]),
});

export type WorkPayloadInput = z.infer<typeof workPayloadSchema>;

const hex64 = z.string().regex(/^[0-9a-f]{64}$/i, "must be 32-byte hex");
const hex32plus = z.string().regex(/^[0-9a-f]{16,}$/i, "must be hex, >=16 chars");

export const createSealSchema = z.discriminatedUnion("mode", [
  z.object({
    mode: z.literal("public"),
    payload: workPayloadSchema,
    salt: hex32plus,
    commitment: hex64,
  }),
  z.object({
    mode: z.literal("nda"),
    commitment: hex64,
  }),
]);

export const attestSchema = z.object({
  note: z.string().max(2000).default(""),
  stake_hac: z.number().min(0).max(1000).default(0.01),
  // Optional machine attestation
  oracle: z.enum(["github", "chain", "ci", "audit"]).optional(),
  oracle_ref: z.string().max(300).optional(),
});

export const revealSchema = z.object({
  payload: workPayloadSchema,
  salt: hex32plus,
});

export const createProfileSchema = z.object({
  handle: z
    .string()
    .min(3)
    .max(40)
    .regex(/^[a-zA-Z0-9_.-]+$/, "letters, numbers, . _ - only"),
  display_name: z.string().min(1).max(80),
  bio: z.string().max(500).default(""),
  domains: z.array(z.string().min(1).max(40)).max(10).default([]),
});
