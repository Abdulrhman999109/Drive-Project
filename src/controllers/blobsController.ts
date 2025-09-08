import type { Request, Response } from "express";
import { BlobsService } from "../services/blobsService.js";
import asyncHandler from "express-async-handler";

export const BlobsController = {
  create: asyncHandler(async (req: Request, res: Response) => {
    const { id, data, backend } = req.body || {};

    if (!id || typeof id !== "string") {
      res.status(400).json({ success: false, message: "id is required (string)" });
      return;
    }
    if (!data || typeof data !== "string") {
      res.status(400).json({ success: false, message: "data (base64 string) is required" });
      return;
    }
    const chosenBackend = (backend as any) || "db";
    const out = await BlobsService.createBlob({
      id,
      dataBase64: data,
      backend: chosenBackend,
    });
    res.status(201).json({ success: true, data: out });
    return;
  }),

  

  get: asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    if (!id) {
      res.status(400).json({ success: false, message: "id param is required" });
      return;
    }
    const out = await BlobsService.get(id);
    res.json({ success: true, data: out });
  }),
};
