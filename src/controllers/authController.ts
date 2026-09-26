import type { Request, Response } from "express";
import * as authService from "../services/authService.js";

function erroStatus(erro: unknown): number {
  return (erro as { status?: number }).status || 500;
}

function mensagem(erro: unknown): string {
  return erro instanceof Error ? erro.message : "Erro interno";
}

export async function login(req: Request, res: Response): Promise<void> {
  try {
    const { usuario, senha } = req.body as {
      usuario?: string;
      senha?: string;
    };
    const resultado = await authService.login(usuario || "", senha || "");
    res.json(resultado);
  } catch (erro) {
    res.status(erroStatus(erro)).json({
      sucesso: false,
      mensagem: mensagem(erro),
    });
  }
}

export async function refresh(req: Request, res: Response): Promise<void> {
  try {
    const { refreshToken } = req.body as { refreshToken?: string };
    const resultado = await authService.refresh(refreshToken || "");
    res.json(resultado);
  } catch (erro) {
    res.status(erroStatus(erro)).json({
      sucesso: false,
      mensagem: mensagem(erro),
    });
  }
}
