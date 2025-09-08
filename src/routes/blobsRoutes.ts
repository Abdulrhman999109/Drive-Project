import { Router } from "express";
import { BlobsController } from "../controllers/blobsController.js";

const router = Router();

router.post('/' ,BlobsController.create)

router.get('/:id',BlobsController.get)

export default router;