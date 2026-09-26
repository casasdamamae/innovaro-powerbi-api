import { Router } from "express";
import * as data from "../controllers/dataController.js";

const router = Router();

// Health check público (sem JWT)
router.get("/", data.status);

export default router;
