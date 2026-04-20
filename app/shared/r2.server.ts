import {
  GetObjectCommand,
  HeadObjectCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { createServerFn } from "@tanstack/react-start";
import { zodValidator } from "@tanstack/zod-adapter";
import { z } from "zod";
import { serverEnv } from "./env.server";

const uploadUrlExpiresInSeconds = 60 * 5;
const downloadUrlExpiresInSeconds = 60 * 10;

const uploadUrlSchema = z.object({
  objectKey: z.string(),
  contentType: z.string(),
});

const downloadUrlSchema = z.object({
  resumeKey: z.string(),
  fileName: z.string().optional(),
});

function getR2Config() {
  return {
    accountId: serverEnv.R2_ACCOUNT_ID,
    bucketName: serverEnv.R2_BUCKET_NAME,
    accessKeyId: serverEnv.R2_ACCESS_KEY_ID,
    secretAccessKey: serverEnv.R2_SECRET_ACCESS_KEY,
  };
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

export const createR2UploadUrl = createServerFn({ method: "POST" })
  .inputValidator(zodValidator(uploadUrlSchema))
  .handler(async ({ data }) => {
    const client = getR2Client();
    const { bucketName } = getR2Config();

    const command = new PutObjectCommand({
      Bucket: bucketName,
      Key: data.objectKey,
      ContentType: data.contentType,
    });

    return getSignedUrl(client, command, { expiresIn: uploadUrlExpiresInSeconds });
  });

export const createR2ResumeDownloadUrl = createServerFn({ method: "POST" })
  .inputValidator(zodValidator(downloadUrlSchema))
  .handler(async ({ data }) => {
    const client = getR2Client();
    const { bucketName } = getR2Config();

    const command = new GetObjectCommand({
      Bucket: bucketName,
      Key: data.resumeKey,
      ResponseContentDisposition: data.fileName ? `inline; filename="${data.fileName}"` : undefined,
    });

    return getSignedUrl(client, command, { expiresIn: downloadUrlExpiresInSeconds });
  });

const objectExistsSchema = z.object({
  key: z.string(),
});

export const r2ObjectExists = createServerFn({ method: "POST" })
  .inputValidator(zodValidator(objectExistsSchema))
  .handler(async ({ data }) => {
    const client = getR2Client();
    const { bucketName } = getR2Config();

    try {
      await client.send(
        new HeadObjectCommand({
          Bucket: bucketName,
          Key: data.key,
        }),
      );
      return true;
    } catch {
      return false;
    }
  });
