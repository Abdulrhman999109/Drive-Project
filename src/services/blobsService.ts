import { writeFile, mkdir, stat } from "fs/promises";
import path from "path";
import { prisma } from "../config/prisma.js";
import { STORAGE_DIR } from "../config/storage.js";

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
    const err: any = new Error("Invalid Base64 payload (empty)");
    err.StatusCode = 400;
    throw err;
  }
  const s = normalizeBase64(b64);
  if (!/^[A-Za-z0-9+/]*={0,2}$/.test(s)) {
    const err: any = new Error("Invalid Base64 payload (illegal chars)");
    err.StatusCode = 400;
    throw err;
  }
  if (s.length % 4 !== 0) {
    const err: any = new Error("Invalid Base64 payload (bad padding length)");
    err.StatusCode = 400;
    throw err;
  }
  const buf = Buffer.from(s, "base64");
  if (buf.length === 0) {
    const err: any = new Error("Invalid Base64 payload (decoded empty)");
    err.StatusCode = 400;
    throw err;
  }
  if (buf.toString("base64") !== s) {
    const err: any = new Error("Invalid Base64 payload (roundtrip mismatch)");
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
    if (!["db", "local"].includes(backend)) {
      const err: any = new Error("Unsupported backend");
      err.StatusCode = 400;
      throw err;
    }

    const buffer = strictDecodeBase64OrThrow(dataBase64);
    const size = buffer.length;

    await prisma.$transaction(async (tx) => {
      const exists = await tx.metaBlob.findUnique({ where: { id } });
      if (exists) {
        const err: any = new Error("id already exists");
        err.StatusCode = 400;
        throw err;
      }

      if (backend === "db") {
        await tx.dataBlob.create({ data: { id, data: buffer } });
        await tx.metaBlob.create({ data: { id, backend, size } });
        return;
      }

      try {
        await mkdir(STORAGE_DIR, { recursive: true });

        const fullPath = path.resolve(STORAGE_DIR, id);
        await writeFile(fullPath, buffer, { flag: "wx" });

        const st = await stat(fullPath);
        if (st.size !== size) {
          const err: any = new Error("Written file size mismatch");
          err.StatusCode = 500;
          throw err;
        }
      } catch (e) {
        const err: any = new Error(
          `Failed to write to local storage: ${(e as Error).message}`
        );
        err.StatusCode = 500;
        throw err;
      }
      await tx.metaBlob.create({ data: { id, backend, size } });
    });

    return { id, size, backend };
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
