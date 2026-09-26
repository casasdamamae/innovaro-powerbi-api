import { Router } from "express";
import { auth, requireAdmin } from "../middlewares/auth.js";
import * as usuariosController from "../controllers/usuariosController.js";

const router = Router();

router.use(auth);

router.get("/", requireAdmin, usuariosController.listar);
router.post("/", requireAdmin, usuariosController.criar);
router.put("/:id", usuariosController.atualizar);
router.delete("/:id", requireAdmin, usuariosController.excluir);

export default router;
