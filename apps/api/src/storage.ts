import { createStorageClient } from "@repo/storage";
import { env } from "./env.js";

export const storage = createStorageClient(env.minio);
