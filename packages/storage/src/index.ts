import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
} from "@aws-sdk/client-s3";

export interface StorageConfig {
  endpoint: string;
  port: number;
  accessKey: string;
  secretKey: string;
  bucket: string;
}

export function createStorageClient(config: StorageConfig) {
  const client = new S3Client({
    endpoint: `http://${config.endpoint}:${config.port}`,
    region: "us-east-1",
    credentials: {
      accessKeyId: config.accessKey,
      secretAccessKey: config.secretKey,
    },
    forcePathStyle: true,
  });

  return {
    async upload(key: string, body: Buffer | Uint8Array, contentType: string): Promise<string> {
      await client.send(
        new PutObjectCommand({
          Bucket: config.bucket,
          Key: key,
          Body: body,
          ContentType: contentType,
        })
      );
      return `http://${config.endpoint}:${config.port}/${config.bucket}/${key}`;
    },

    async download(key: string): Promise<Buffer> {
      const response = await client.send(
        new GetObjectCommand({
          Bucket: config.bucket,
          Key: key,
        })
      );
      const bytes = await response.Body!.transformToByteArray();
      return Buffer.from(bytes);
    },

    async remove(key: string): Promise<void> {
      await client.send(
        new DeleteObjectCommand({
          Bucket: config.bucket,
          Key: key,
        })
      );
    },

    getPublicUrl(key: string): string {
      return `http://${config.endpoint}:${config.port}/${config.bucket}/${key}`;
    },
  };
}

export type StorageClient = ReturnType<typeof createStorageClient>;
