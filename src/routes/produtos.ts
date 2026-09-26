import { Router } from "express";
import { auth } from "../middlewares/auth.js";
import * as data from "../controllers/dataController.js";

const router = Router();

router.get("/", auth, data.produtos);

export default router;
