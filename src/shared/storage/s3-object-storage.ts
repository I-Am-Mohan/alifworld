import { DeleteObjectCommand, GetObjectCommand, PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { getServerEnv } from '@/shared/config/environment';

export interface PrivateObjectStorage {
  putObject(input: { key: string; body: Uint8Array; contentType: string; metadata?: Record<string, string> }): Promise<void>;
  createReadUrl(key: string, expiresInSeconds?: number): Promise<{ url: string; expiresAt: Date }>;
}

export interface ProductMediaStorage extends PrivateObjectStorage {}

export class S3PrivateObjectStorage implements PrivateObjectStorage {
  private readonly client: S3Client;
  private readonly bucket: string;

  constructor() {
    const env = getServerEnv();
    this.bucket = env.S3_BUCKET_NAME;
    this.client = new S3Client({
      region: env.S3_REGION,
      endpoint: env.S3_ENDPOINT,
      forcePathStyle: env.S3_FORCE_PATH_STYLE,
      credentials: {
        accessKeyId: env.S3_ACCESS_KEY_ID,
        secretAccessKey: env.S3_SECRET_ACCESS_KEY,
      },
    });
  }

  async putObject(input: { key: string; body: Uint8Array; contentType: string; metadata?: Record<string, string> }): Promise<void> {
    await this.client.send(new PutObjectCommand({
      Bucket: this.bucket,
      Key: input.key,
      Body: input.body,
      ContentType: input.contentType,
      Metadata: input.metadata,
      ServerSideEncryption: 'AES256',
    }));
  }

  async deleteObject(key: string): Promise<void> {
    await this.client.send(new DeleteObjectCommand({ Bucket: this.bucket, Key: key }));
  }

  async createReadUrl(key: string, expiresInSeconds = 15 * 60): Promise<{ url: string; expiresAt: Date }> {
    const expiresAt = new Date(Date.now() + expiresInSeconds * 1000);
    const url = await getSignedUrl(
      this.client,
      new GetObjectCommand({ Bucket: this.bucket, Key: key }),
      { expiresIn: expiresInSeconds }
    );
    return { url, expiresAt };
  }
}
