import { createStorageClient } from "@repo/storage";
import { env } from "./env.js";

export const storage = createStorageClient({
  endpoint: env.MINIO_ENDPOINT,
  port: env.MINIO_PORT,
  accessKey: env.MINIO_ACCESS_KEY,
  secretKey: env.MINIO_SECRET_KEY,
  bucket: env.MINIO_BUCKET,
});
