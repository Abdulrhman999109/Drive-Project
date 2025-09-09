import crypto from "crypto";

export type SigInput = {
  method: "PUT" | "GET";
  url: string;            
  region: string;         
  accessKey: string;
  secretKey: string;
  payloadHash: string;    
  amzDate?: string;      
};

const sha256Hex = (d: string | Buffer) =>
  crypto.createHash("sha256").update(d).digest("hex");
const hmac = (k: Buffer | string, d: string) =>
  crypto.createHmac("sha256", k).update(d).digest();

function isoBasicNow() {
  const d = new Date();
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getUTCFullYear()}${p(d.getUTCMonth()+1)}${p(d.getUTCDate())}T${p(d.getUTCHours())}${p(d.getUTCMinutes())}${p(d.getUTCSeconds())}Z`;
}
const shortDate = (z: string) => z.slice(0, 8);

export function sign(input: SigInput) {
  const amzDate = input.amzDate ?? isoBasicNow();
  const u = new URL(input.url);

  const signedHeaders = "host;x-amz-content-sha256;x-amz-date";
  const canonicalHeaders =
    `host:${u.host}\n` +
    `x-amz-content-sha256:${input.payloadHash}\n` +
    `x-amz-date:${amzDate}\n`;

  const canonicalRequest =
    `${input.method}\n${u.pathname}\n${u.searchParams.toString()}\n` +
    `${canonicalHeaders}\n${signedHeaders}\n${input.payloadHash}`;

  const scope = `${shortDate(amzDate)}/${input.region}/s3/aws4_request`;
  const stringToSign =
    `AWS4-HMAC-SHA256\n${amzDate}\n${scope}\n${sha256Hex(canonicalRequest)}`;

  const kDate = hmac("AWS4" + input.secretKey, shortDate(amzDate));
  const kRegion = hmac(kDate, input.region);
  const kService = hmac(kRegion, "s3");
  const kSigning = hmac(kService, "aws4_request");

  const signature = crypto.createHmac("sha256", kSigning)
    .update(stringToSign).digest("hex");
  const authorization =
    `AWS4-HMAC-SHA256 Credential=${input.accessKey}/${scope}, SignedHeaders=${signedHeaders}, Signature=${signature}`;

  return { amzDate, authorization };
}
