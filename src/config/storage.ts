import { mkdir } from "fs/promises";
import 'dotenv/config'

export const STORAGE_DIR = process.env.STORAGE_DIR || "./test";

export async function ensureStorageDir() {
  await mkdir(STORAGE_DIR, { recursive: true });
}
