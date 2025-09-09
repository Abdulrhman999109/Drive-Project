import { describe, it, expect, vi } from "vitest";
import request from "supertest";
import app from "../../app.js";
import { issueJwt } from "../../lib/jwt.js";

process.env.ENV = "test";
process.env.JWT_SECRET = process.env.JWT_SECRET || "abdulrhmanbalubaid123";

const metaStore = new Map<string, { id: string; backend: string; size: number; createdAt: Date }>();
const dataStore = new Map<string, Buffer>();

vi.mock("../../config/prisma.js", () => {
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



const token = issueJwt({ id: "tester" }, 300);

describe("Blobs (DB) — ultra simple", () => {
  it("create -> get -> duplicate", async () => {
    const id = "hello.txt";
    const dataB64 = Buffer.from("Hello Blobs").toString("base64");

    const create = await request(app)
      .post("/v1/blobs")
      .set("Authorization", `Bearer ${token}`)
      .send({ id, data: dataB64, backend: "db" });

    expect(create.status).toBe(201);
    expect(create.body.success).toBe(true);
    expect(create.body.data).toMatchObject({ id, backend: "db" });

    
    const get = await request(app)
      .get(`/v1/blobs/${encodeURIComponent(id)}`)
      .set("Authorization", `Bearer ${token}`);

    expect(get.status).toBe(200);
    expect(get.body.success).toBe(true);
    expect(get.body.data.id).toBe(id);
    expect(get.body.data.data).toBe(dataB64);

    const dup = await request(app)
      .post("/v1/blobs")
      .set("Authorization", `Bearer ${token}`)
      .send({ id, data: dataB64, backend: "db" });

    expect(dup.status).toBe(400);
  });
});
