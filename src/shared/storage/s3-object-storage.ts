import { DeleteObjectCommand, GetObjectCommand, PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { getServerEnv } from '@/shared/config/environment';
import { prisma } from '@/shared/database/prisma';

export interface PrivateObjectStorage {
  putObject(input: { key: string; body: Uint8Array; contentType: string; metadata?: Record<string, string> }): Promise<void>;
  createReadUrl(key: string, expiresInSeconds?: number): Promise<{ url: string; expiresAt: Date }>;
}

export interface ProductMediaStorage extends PrivateObjectStorage {}

// In-memory mock storage fallback for local development when S3 credentials are missing
const memoryStorageCache = new Map<string, { body: Uint8Array; contentType: string; metadata?: Record<string, string> }>();

export class S3PrivateObjectStorage implements PrivateObjectStorage {
  private _client: S3Client | null = null;
  private _bucket: string | null = null;
  private _isMock: boolean = false;

  private async getClientAndBucket(): Promise<{ client: S3Client | null; bucket: string; isMock: boolean }> {
    if (this._bucket && (this._client || this._isMock)) {
      return { client: this._client, bucket: this._bucket, isMock: this._isMock };
    }

    let provider = 'AWS_S3';
    let s3Bucket = process.env.S3_BUCKET_NAME || 'alifworld-media';
    let region = process.env.S3_REGION || 'us-east-1';
    let endpoint = process.env.S3_ENDPOINT || '';
    let forcePathStyle = (process.env.S3_FORCE_PATH_STYLE ?? 'false') === 'true';
    let accessKeyId = process.env.S3_ACCESS_KEY_ID || '';
    let secretAccessKey = process.env.S3_SECRET_ACCESS_KEY || '';

    try {
      const dbConfigs = await prisma.systemConfig.findMany({
        where: {
          key: {
            in: [
              'STORAGE_PROVIDER',
              'STORAGE_S3_BUCKET',
              'STORAGE_S3_REGION',
              'STORAGE_S3_ENDPOINT',
              'STORAGE_S3_ACCESS_KEY',
              'STORAGE_S3_SECRET_KEY',
              'STORAGE_S3_FORCE_PATH_STYLE',
              'STORAGE_R2_BUCKET',
              'STORAGE_R2_ACCOUNT_ID',
              'STORAGE_R2_ENDPOINT',
              'STORAGE_R2_ACCESS_KEY',
              'STORAGE_R2_SECRET_KEY',
            ],
          },
          deletedAt: null,
        },
      });

      const map = new Map(dbConfigs.map((c) => [c.key, c.value]));
      provider = map.get('STORAGE_PROVIDER') || provider;

      if (provider === 'CLOUDFLARE_R2') {
        const r2Bucket = map.get('STORAGE_R2_BUCKET');
        const accountId = map.get('STORAGE_R2_ACCOUNT_ID');
        const r2Endpoint = map.get('STORAGE_R2_ENDPOINT') || (accountId ? `https://${accountId}.r2.cloudflarestorage.com` : '');
        const r2AccessKey = map.get('STORAGE_R2_ACCESS_KEY');
        const r2SecretKey = map.get('STORAGE_R2_SECRET_KEY');

        if (r2Bucket) s3Bucket = r2Bucket;
        if (r2Endpoint) endpoint = r2Endpoint;
        if (r2AccessKey) accessKeyId = r2AccessKey;
        if (r2SecretKey && r2SecretKey !== '••••••••') secretAccessKey = r2SecretKey;
        region = 'auto';
      } else {
        const bucket = map.get('STORAGE_S3_BUCKET');
        const reg = map.get('STORAGE_S3_REGION');
        const ep = map.get('STORAGE_S3_ENDPOINT');
        const ak = map.get('STORAGE_S3_ACCESS_KEY');
        const sk = map.get('STORAGE_S3_SECRET_KEY');
        const fps = map.get('STORAGE_S3_FORCE_PATH_STYLE');

        if (bucket) s3Bucket = bucket;
        if (reg) region = reg;
        if (ep) endpoint = ep;
        if (ak) accessKeyId = ak;
        if (sk && sk !== '••••••••') secretAccessKey = sk;
        if (fps !== undefined) forcePathStyle = fps === 'true';
      }
    } catch {
      // Fallback to env
    }

    if (!accessKeyId || !secretAccessKey || secretAccessKey === '••••••���•') {
      const env = getServerEnv();
      accessKeyId = env.S3_ACCESS_KEY_ID || '';
      secretAccessKey = env.S3_SECRET_ACCESS_KEY || '';
      if (env.S3_BUCKET_NAME) s3Bucket = env.S3_BUCKET_NAME;
    }

    if (!accessKeyId || !secretAccessKey || secretAccessKey === '••••••••') {
      this._isMock = true;
      this._bucket = s3Bucket;
      return { client: null, bucket: s3Bucket, isMock: true };
    }

    this._bucket = s3Bucket;
    this._client = new S3Client({
      region,
      endpoint: endpoint || undefined,
      forcePathStyle,
      credentials: {
        accessKeyId,
        secretAccessKey,
      },
    });

    return { client: this._client, bucket: s3Bucket, isMock: false };
  }

  async putObject(input: { key: string; body: Uint8Array; contentType: string; metadata?: Record<string, string> }): Promise<void> {
    const { client, bucket, isMock } = await this.getClientAndBucket();

    if (isMock || !client) {
      memoryStorageCache.set(input.key, {
        body: input.body,
        contentType: input.contentType,
        metadata: input.metadata,
      });
      return;
    }

    await client.send(
      new PutObjectCommand({
        Bucket: bucket,
        Key: input.key,
        Body: input.body,
        ContentType: input.contentType,
        Metadata: input.metadata,
        ServerSideEncryption: 'AES256',
      })
    );
  }

  async deleteObject(key: string): Promise<void> {
    const { client, bucket, isMock } = await this.getClientAndBucket();

    if (isMock || !client) {
      memoryStorageCache.delete(key);
      return;
    }

    await client.send(new DeleteObjectCommand({ Bucket: bucket, Key: key }));
  }

  async createReadUrl(key: string, expiresInSeconds = 15 * 60): Promise<{ url: string; expiresAt: Date }> {
    const expiresAt = new Date(Date.now() + expiresInSeconds * 1000);
    const { client, bucket, isMock } = await this.getClientAndBucket();

    if (isMock || !client) {
      const appUrl = process.env.APP_URL || process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
      return {
        url: `${appUrl}/api/v1/seller/kyc/mock-file?key=${encodeURIComponent(key)}`,
        expiresAt,
      };
    }

    const url = await getSignedUrl(
      client,
      new GetObjectCommand({ Bucket: bucket, Key: key }),
      { expiresIn: expiresInSeconds }
    );
    return { url, expiresAt };
  }
}
