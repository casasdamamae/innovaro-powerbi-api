import { Router } from "express";
import { auth } from "../middlewares/auth.js";
import * as comparativoController from "../controllers/comparativoController.js";

const router = Router();

router.get("/", auth, comparativoController.obterComparativo);

export default router;
