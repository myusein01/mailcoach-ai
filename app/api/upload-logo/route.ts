// app/api/upload-logo/route.ts
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";

// ✅ Nécessite: npm i @aws-sdk/client-s3
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";

function json(body: any, status = 200) {
  return NextResponse.json(body, { status });
}

function getExtFromMime(mime: string) {
  const m = (mime || "").toLowerCase();
  if (m === "image/png") return "png";
  if (m === "image/jpeg" || m === "image/jpg") return "jpg";
  if (m === "image/webp") return "webp";
  return null;
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  const email = session?.user?.email?.toLowerCase();
  if (!email) return json({ error: "unauthorized" }, 401);

  // ==== CONFIG STORAGE (S3 / Cloudflare R2) ====
  // Tu dois mettre ces variables dans .env.local et sur Vercel:
  // S3_ENDPOINT=https://<ACCOUNT_ID>.r2.cloudflarestorage.com   (si R2)
  // S3_REGION=auto                                             (si R2)
  // S3_ACCESS_KEY_ID=....
  // S3_SECRET_ACCESS_KEY=....
  // S3_BUCKET=mailcoach-ai (nom de ton bucket)
  // S3_PUBLIC_BASE_URL=https://<ton-cdn-ou-public-bucket>       (URL publique de lecture)
  const endpoint = process.env.S3_ENDPOINT;
  const region = process.env.S3_REGION || "auto";
  const accessKeyId = process.env.S3_ACCESS_KEY_ID;
  const secretAccessKey = process.env.S3_SECRET_ACCESS_KEY;
  const bucket = process.env.S3_BUCKET;
  const publicBaseUrl = process.env.S3_PUBLIC_BASE_URL;

  if (!endpoint || !accessKeyId || !secretAccessKey || !bucket || !publicBaseUrl) {
    return json(
      {
        error:
          "Storage non configuré. Ajoute S3_ENDPOINT, S3_ACCESS_KEY_ID, S3_SECRET_ACCESS_KEY, S3_BUCKET, S3_PUBLIC_BASE_URL.",
        missing: {
          S3_ENDPOINT: !endpoint,
          S3_ACCESS_KEY_ID: !accessKeyId,
          S3_SECRET_ACCESS_KEY: !secretAccessKey,
          S3_BUCKET: !bucket,
          S3_PUBLIC_BASE_URL: !publicBaseUrl,
        },
      },
      500
    );
  }

  const form = await req.formData().catch(() => null);
  if (!form) return json({ error: "invalid_formdata" }, 400);

  const file = form.get("file");
  if (!(file instanceof File)) return json({ error: "file_missing" }, 400);

  const ext = getExtFromMime(file.type);
  if (!ext) return json({ error: "format_not_supported" }, 400);

  const maxBytes = 2 * 1024 * 1024;
  if (file.size > maxBytes) return json({ error: "file_too_large_max_2mb" }, 400);

  const arrayBuffer = await file.arrayBuffer();
  const body = new Uint8Array(arrayBuffer);

  const safeEmail = email.replace(/[^a-z0-9@._-]/gi, "_");
  const key = `logos/${safeEmail}/${Date.now()}-${Math.random()
    .toString(16)
    .slice(2)}.${ext}`;

  const s3 = new S3Client({
    region,
    endpoint,
    credentials: { accessKeyId, secretAccessKey },
    forcePathStyle: true, // ✅ important pour R2
  });

  await s3.send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      Body: body,
      ContentType: file.type,
      CacheControl: "public, max-age=31536000, immutable",
    })
  );

  const url = `${publicBaseUrl.replace(/\/$/, "")}/${key}`;
  return json({ url }, 200);
}
