import { DeleteObjectCommand, GetObjectCommand, PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { getServerEnv } from '@/shared/config/environment';

export interface PrivateObjectStorage {
  putObject(input: { key: string; body: Uint8Array; contentType: string; metadata?: Record<string, string> }): Promise<void>;
  createReadUrl(key: string, expiresInSeconds?: number): Promise<{ url: string; expiresAt: Date }>;
}

export interface ProductMediaStorage extends PrivateObjectStorage {}

export class S3PrivateObjectStorage implements PrivateObjectStorage {
  private _client: S3Client | null = null;
  private _bucket: string | null = null;

  private get client(): S3Client {
    if (!this._client) {
      this.initialize();
    }
    return this._client!;
  }

  private get bucket(): string {
    if (!this._bucket) {
      this.initialize();
    }
    return this._bucket!;
  }

  private initialize(): void {
    const env = getServerEnv();
    if (!env.S3_BUCKET_NAME || !env.S3_ACCESS_KEY_ID || !env.S3_SECRET_ACCESS_KEY) {
      throw new Error('S3_BUCKET_NAME, S3_ACCESS_KEY_ID, and S3_SECRET_ACCESS_KEY are required for S3 storage');
    }
    this._bucket = env.S3_BUCKET_NAME;
    this._client = new S3Client({
      region: env.S3_REGION ?? 'us-east-1',
      endpoint: env.S3_ENDPOINT,
      forcePathStyle: env.S3_FORCE_PATH_STYLE ?? false,
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
