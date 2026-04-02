import {
  GetObjectCommand,
  HeadObjectCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

const uploadUrlExpiresInSeconds = 60 * 5;
const downloadUrlExpiresInSeconds = 60 * 10;

function getRequiredEnv(name: string) {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

function getR2Config() {
  return {
    accountId: getRequiredEnv("R2_ACCOUNT_ID"),
    bucketName: getRequiredEnv("R2_BUCKET_NAME"),
    accessKeyId: getRequiredEnv("R2_ACCESS_KEY_ID"),
    secretAccessKey: getRequiredEnv("R2_SECRET_ACCESS_KEY"),
  };
}

function getPublicAssetBaseUrl() {
  const value =
    typeof window === "undefined"
      ? process.env.VITE_PUBLIC_ASSET_BASE_URL
      : import.meta.env.VITE_PUBLIC_ASSET_BASE_URL;

  return value?.replace(/\/+$/, "") ?? null;
}

let r2Client: S3Client | null = null;

function getR2Client() {
  if (r2Client) {
    return r2Client;
  }

  const config = getR2Config();

  r2Client = new S3Client({
    region: "auto",
    endpoint: `https://${config.accountId}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: config.accessKeyId,
      secretAccessKey: config.secretAccessKey,
    },
  });

  return r2Client;
}

export async function createR2UploadUrl({
  objectKey,
  contentType,
}: {
  objectKey: string;
  contentType: string;
}) {
  const client = getR2Client();
  const { bucketName } = getR2Config();

  const command = new PutObjectCommand({
    Bucket: bucketName,
    Key: objectKey,
    ContentType: contentType,
  });

  return getSignedUrl(client, command, { expiresIn: uploadUrlExpiresInSeconds });
}

export async function createR2ResumeDownloadUrl({
  resumeKey,
  fileName,
}: {
  resumeKey: string;
  fileName?: string;
}) {
  const client = getR2Client();
  const { bucketName } = getR2Config();

  const command = new GetObjectCommand({
    Bucket: bucketName,
    Key: resumeKey,
    ResponseContentDisposition: fileName ? `inline; filename="${fileName}"` : undefined,
  });

  return getSignedUrl(client, command, { expiresIn: downloadUrlExpiresInSeconds });
}

export async function r2ObjectExists(objectKey: string) {
  const client = getR2Client();
  const { bucketName } = getR2Config();

  try {
    await client.send(
      new HeadObjectCommand({
        Bucket: bucketName,
        Key: objectKey,
      }),
    );
    return true;
  } catch {
    return false;
  }
}

export function getPublicAssetUrl(objectKey: string) {
  const baseUrl = getPublicAssetBaseUrl();
  if (!baseUrl) {
    return null;
  }

  return `${baseUrl}/${objectKey}`;
}
