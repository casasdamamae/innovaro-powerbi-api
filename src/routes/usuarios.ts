import { Router } from "express";
import { auth, requireAdmin } from "../middlewares/auth.js";
import * as usuariosController from "../controllers/usuariosController.js";

const router = Router();

router.use(auth, requireAdmin);

router.get("/", usuariosController.listar);
router.post("/", usuariosController.criar);
router.put("/:id/senha", usuariosController.mudarSenha);
router.put("/:id/status", usuariosController.mudarStatus);
router.delete("/:id", usuariosController.excluir);

export default router;
