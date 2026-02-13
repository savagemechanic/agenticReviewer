export const env = {
  databaseUrl: process.env.DATABASE_URL ?? "postgresql://postgres:postgres@localhost:5432/agentic_reviewer",
  redisUrl: process.env.REDIS_URL ?? "redis://localhost:6379",
  minio: {
    endpoint: process.env.MINIO_ENDPOINT ?? "localhost",
    port: Number(process.env.MINIO_PORT ?? 9000),
    accessKey: process.env.MINIO_ACCESS_KEY ?? "minioadmin",
    secretKey: process.env.MINIO_SECRET_KEY ?? "minioadmin",
    bucket: process.env.MINIO_BUCKET ?? "agentic-reviewer",
  },
  videoRendererUrl: process.env.VIDEO_RENDERER_URL ?? "http://localhost:3002",
  CORS_ORIGIN: process.env.CORS_ORIGIN,
};
