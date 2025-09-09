import { sign } from "./sign.js";
import crypto from "crypto";

const S3 = {
  endpoint: process.env.S3_ENDPOINT || "localhost:9000",
  region:   process.env.S3_REGION   || "us-east-1",
  bucket:   process.env.S3_BUCKET   || "",
  access:   process.env.S3_ACCESS_KEY || "",
  secret:   process.env.S3_SECRET_KEY || "",
  pathStyle: (process.env.S3_PATH_STYLE || "true").toLowerCase() === "true",
  useHttps:  (process.env.S3_USE_HTTPS  || "false").toLowerCase() === "true",
} as const;

const sha256Hex = (d: string | Buffer) =>
  crypto.createHash("sha256").update(d).digest("hex");

function buildUrl(key: string) {
  const sch = S3.useHttps ? "https" : "http";
  return S3.pathStyle
    ? `${sch}://${S3.endpoint}/${encodeURI(S3.bucket)}/${encodeURI(key)}`
    : `${sch}://${S3.bucket}.${S3.endpoint}/${encodeURI(key)}`;
}

export async function s3Put(key: string, body: Buffer) {
  if (!S3.bucket || !S3.access || !S3.secret) {
    const e: any = new Error("S3 is not configured"); e.StatusCode = 500; throw e;
  }
  const url = buildUrl(key);
  const payloadHash = sha256Hex(body);

  const { amzDate, authorization } = sign({
    method: "PUT", url, region: S3.region,
    accessKey: S3.access, secretKey: S3.secret, payloadHash
  });

  const bodyUint8 = body instanceof Uint8Array ? body : new Uint8Array(body);

  const res = await fetch(url, {
    method: "PUT",
    headers: {
      "x-amz-content-sha256": payloadHash,
      "x-amz-date": amzDate,
      "content-type": "application/octet-stream",
      "authorization": authorization,
    },
    body: bodyUint8, 
  } as RequestInit); 

  if (!res.ok) {
    const t = await res.text().catch(()=> "");
    const e: any = new Error(`S3 PUT failed: ${res.status} ${res.statusText} ${t}`);
    e.StatusCode = 502; throw e;
  }
}

export async function s3Get(key: string): Promise<Buffer> {
  const url = buildUrl(key);
  const payloadHash = sha256Hex(""); 

  const { amzDate, authorization } = sign({
    method: "GET", url, region: S3.region,
    accessKey: S3.access, secretKey: S3.secret, payloadHash
  });

  const res = await fetch(url, {
    method: "GET",
    headers: {
      "x-amz-content-sha256": payloadHash,
      "x-amz-date": amzDate,
      "authorization": authorization,
    },
  } as RequestInit);

  if (!res.ok) {
    const t = await res.text().catch(()=> "");
    const err: any = new Error(`S3 GET failed: ${res.status} ${res.statusText} ${t}`);
    err.StatusCode = res.status === 404 ? 404 : 502; 
    throw err;
  }
  const arr = await res.arrayBuffer();
  return Buffer.from(arr);
}
