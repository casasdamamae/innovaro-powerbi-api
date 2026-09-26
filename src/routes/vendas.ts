import { Router } from "express";
import { auth } from "../middlewares/auth.js";
import * as data from "../controllers/dataController.js";

const router = Router();

router.get("/", auth, data.listarVendas);

export default router;
