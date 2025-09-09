import { afterAll, vi } from "vitest";
import { mkdtempSync, rmSync } from "fs";
import os from "os";
import path from "path";

process.env.JWT_SECRET = process.env.JWT_SECRET || "test-secret";
process.env.JWT_EXPIRES = "15m";

const tmpBase = mkdtempSync(path.join(os.tmpdir(), "blobs-"));
process.env.STORAGE_DIR = path.join(tmpBase, "storage");

const metaStore = new Map<string, { id: string; backend: string; size: number; createdAt: Date }>();
const dataStore = new Map<string, Buffer>();

vi.mock("../src/config/prisma.js", async () => {
  const prismaMock = {
    metaBlob: {
      findUnique: vi.fn(async ({ where: { id } }: any) => metaStore.get(id) || null),
      create: vi.fn(async ({ data }: any) => {
        const row = { ...data, createdAt: new Date() };
        metaStore.set(row.id, row);
        return row;
      }),
    },
    dataBlob: {
      findUnique: vi.fn(async ({ where: { id } }: any) => {
        const buf = dataStore.get(id);
        return buf ? { id, data: buf } : null;
      }),
      create: vi.fn(async ({ data }: any) => {
        dataStore.set(data.id, data.data);
        return data;
      }),
    },
    $transaction: vi.fn(async (fn: any) => fn(prismaMock)),
  };
  return { prisma: prismaMock as any };
});

afterAll(() => {
  rmSync(tmpBase, { recursive: true, force: true });
});
