import { Client } from "basic-ftp";
import { Readable, Writable } from "stream";

const FTP = {
  host: process.env.FTP_HOST || "127.0.0.1",
  port: Number(process.env.FTP_PORT || 2121),
  user: process.env.FTP_USER || "dev",
  pass: process.env.FTP_PASS || "devpass",
  secure: (process.env.FTP_SECURE || "false").toLowerCase() === "true",
  baseDir: process.env.FTP_BASE_DIR || "/", 
} as const;

async function withClient<T>(fn: (c: Client) => Promise<T>): Promise<T> {
  const c = new Client();
  try {
    await c.access({
      host: FTP.host,
      port: FTP.port,
      user: FTP.user,
      password: FTP.pass,
      secure: FTP.secure,
      secureOptions: { rejectUnauthorized: false }, 
    });
    await c.ensureDir(FTP.baseDir);
    await c.cd(FTP.baseDir);
    return await fn(c);
  } finally {
    c.close();
  }
}

export async function ftpPut(id: string, data: Buffer): Promise<void> {
  return withClient(async (c) => {
    const rel = id.replace(/^\/+/, ""); 
    const slash = rel.lastIndexOf("/");
    if (slash !== -1) {
      await c.ensureDir(rel.slice(0, slash)); 
    }
    await c.uploadFrom(Readable.from(data), rel);
  });
}

export async function ftpGet(id: string): Promise<Buffer> {
  return withClient(async (c) => {
    const rel = id.replace(/^\/+/, "");
    const chunks: Buffer[] = [];
    const sink = new Writable({
      write(chunk, _enc, cb) {
        chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
        cb();
      },
    });
    await c.downloadTo(sink, rel);
    return Buffer.concat(chunks);
  });
}
