import { Router } from "express";
import { auth } from "../middlewares/auth.js";
import * as resumoController from "../controllers/resumoController.js";

const router = Router();

router.get("/", auth, resumoController.obterResumo);
router.get("/lojas", auth, resumoController.lojas);
router.get("/fornecedores", auth, resumoController.fornecedores);
router.get("/setores", auth, resumoController.setores);

export default router;
