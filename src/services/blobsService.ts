import { readFile ,writeFile, mkdir, stat } from "fs/promises";
import path from "path";
import { prisma } from "../config/prisma.js";
import { STORAGE_DIR } from "../config/storage.js";
import { s3Get , s3Put } from "../lib/s3/client.js";
import { ftpGet , ftpPut } from "../lib/ftp/client.js";

export type BlobInput = {
  id: string;
  dataBase64: string;
  backend: "db" | "local" | "s3" | "ftp";
};

function normalizeBase64(input: string): string {
  const s = input.includes(",") ? input.slice(input.indexOf(",") + 1) : input;
  return s.replace(/-/g, "+").replace(/_/g, "/").replace(/\s+/g, "");
}

function strictDecodeBase64OrThrow(b64: string): Buffer {
  if (typeof b64 !== "string" || b64.length === 0) {
    const err: any = new Error("Invalid Base64 payload :empty");
    err.StatusCode = 400;
    throw err;
  }
  const s = normalizeBase64(b64);
  if (!/^[A-Za-z0-9+/]*={0,2}$/.test(s)) {
    const err: any = new Error("Invalid Base64 payload: illegal chars");
    err.StatusCode = 400;
    throw err;
  }
  if (s.length % 4 !== 0) {
    const err: any = new Error("Invalid Base64 payload :bad padding length");
    err.StatusCode = 400;
    throw err;
  }
  const buf = Buffer.from(s, "base64");
  if (buf.length === 0) {
    const err: any = new Error("Invalid Base64 payload :decoded empty");
    err.StatusCode = 400;
    throw err;
  }
  if (buf.toString("base64") !== s) {
    const err: any = new Error("Invalid Base64 payload :roundtrip mismatch");
    err.StatusCode = 400;
    throw err;
  }

  return buf;
}

export const BlobsService = {
  async createBlob({ id, dataBase64, backend }: BlobInput) {
    if (!id) {
      const err: any = new Error("id is required");
      err.StatusCode = 400;
      throw err;
    }
    if (!dataBase64) {
      const err: any = new Error("dataBase64 is required");
      err.StatusCode = 400;
      throw err;
    }
    if (!["db", "local" , "s3" , "ftp"].includes(backend)) {
      const err: any = new Error("unsupported backend");
      err.StatusCode = 400;
      throw err;
    }

    const buffer = strictDecodeBase64OrThrow(dataBase64);
    const size = buffer.length;

    const exists = await prisma.metaBlob.findUnique({ where: { id } });
    if (exists) {
      const err: any = new Error("id already exists");
      err.StatusCode = 400;
      throw err;
    }

    if (backend === "db") {
      await prisma.$transaction(async (tx) => {
        await tx.dataBlob.create({ data: { id, data: buffer } });
        await tx.metaBlob.create({ data: { id, backend, size } });
      });
      return { id, size, backend };
    }

    if (backend === "local") {
      try {
        const base = path.resolve(STORAGE_DIR);
        const fullPath = path.resolve(base, id);
        if (!fullPath.startsWith(base + path.sep)) {
          const err: any = new Error("Invalid id");
          err.StatusCode = 400;
          throw err;
        }
        await mkdir(path.dirname(fullPath), { recursive: true });
        await writeFile(fullPath, buffer, { flag: "wx" });
        const st = await stat(fullPath);
        if (st.size !== size) {
          const err: any = new Error("written file size mismatch");
          err.StatusCode = 500;
          throw err;
        }
      } catch (e) {
        const err: any = new Error(`failed to write to local storage: ${(e as Error).message}`);
        err.StatusCode = 500;
        throw err;
      }
      await prisma.metaBlob.create({ data: { id, backend, size } });
      return { id, size, backend };

    } else if (backend === "s3") {
      try {
        await s3Put(id, buffer);
      } catch (e) {
        const err: any = new Error(`failed to write to S3: ${(e as Error).message}`);
        err.StatusCode = 502;
        throw err;
      }
      await prisma.metaBlob.create({ data: { id, backend, size } });
      return { id, size, backend };

    } else if (backend === "ftp") {
      try {
        await ftpPut(id, buffer);
      } catch (e) {
        const err: any = new Error(`failed to write to FTP: ${(e as Error).message}`);
        err.StatusCode = 502;
        throw err;
      }
      await prisma.metaBlob.create({ data: { id, backend, size } });
      return { id, size, backend };
    }
  },


  async get(id: string) {
    if (!id) {
      const err: any = new Error("id is required");
      err.StatusCode = 400;
      throw err;
    }

    const meta = await prisma.metaBlob.findUnique({ where: { id } });
    if (!meta) {
      const err: any = new Error("Blob not found");
      err.StatusCode = 404;
      throw err;
    }

    let dataBase64: string | null = null;

    if (meta.backend === "db") {
      const row = await prisma.dataBlob.findUnique({ where: { id } });
      if (!row) {
        const err: any = new Error("Blob data not found");
        err.StatusCode = 404;
        throw err;
      }
      dataBase64 = Buffer.from(row.data).toString("base64");

    }else if (meta.backend === "local") {
    try {
      const base = path.resolve(STORAGE_DIR);
      const fullPath = path.resolve(base, id);
      if (!fullPath.startsWith(base + path.sep)) {
        const err: any = new Error("Invalid id");
        err.StatusCode = 400;
        throw err;
      }
      const buf = await readFile(fullPath);
      dataBase64 = buf.toString("base64");
    } catch (e) {
      const err: any = new Error(`failed to read local blob: ${(e as Error).message}`);
      err.StatusCode = 404;
      throw err;
    }

  } else if (meta.backend === "s3") {
    try {
      const buf = await s3Get(id);
      dataBase64 = buf.toString("base64");
    } catch (e) {
      const err: any = new Error(`failed to read from S3: ${(e as Error).message}`);
      err.StatusCode = 502;
      throw err;
    }

  } else if (meta.backend === "ftp") {
    try {
      const buf = await ftpGet(id);
      dataBase64 = buf.toString("base64");
    } catch (e) {
      const err: any = new Error(`failed to read from FTP: ${(e as Error).message}`);
      err.StatusCode = 502;
      throw err;
    }
  }

    return {
      id: meta.id,
      data: dataBase64,
      size: meta.size,
      created_at: meta.createdAt,
      backend: meta.backend,
    };
  },
};
