import { z } from "zod";

const envSchema = z.object({
  DATABASE_URL: z.string().url(),
  MINIO_ENDPOINT: z.string().min(1),
  MINIO_PORT: z.coerce.number().int().positive().default(9000),
  MINIO_ACCESS_KEY: z.string().min(1),
  MINIO_SECRET_KEY: z.string().min(1),
  MINIO_BUCKET: z.string().min(1).default("agentic-reviewer"),
  PORT: z.coerce.number().int().positive().default(3002),
});

export const env = envSchema.parse(process.env);
