import type { Request, Response, NextFunction } from "express";
import { verificarAccessToken } from "../services/tokenService.js";

export function auth(req: Request, res: Response, next: NextFunction): void {
  const header = req.headers.authorization;

  if (!header) {
    res.status(401).json({
      sucesso: false,
      mensagem: "Token não informado.",
    });
    return;
  }

  const token = header.replace("Bearer ", "");

  try {
    req.usuario = verificarAccessToken(token);
    next();
  } catch {
    res.status(401).json({
      sucesso: false,
      mensagem: "Token inválido.",
    });
  }
}

export function requireAdmin(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  if (!req.usuario || req.usuario.nivel !== "ADMIN") {
    res.status(403).json({
      sucesso: false,
      mensagem: "Acesso restrito a administradores.",
    });
    return;
  }
  next();
}
