import { Router } from "express";
import { auth } from "../middlewares/auth.js";
import * as data from "../controllers/dataController.js";

const router = Router();

router.get("/", auth, data.getMetas);
router.post("/", auth, data.postMeta);
router.post("/salvar", auth, data.postMetas);

export default router;
