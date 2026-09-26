import type { Request, Response } from "express";
import {
  listarUsuarios,
  criarUsuario,
  alterarSenha,
  alterarStatus,
  excluirUsuario,
} from "../repositories/usuariosRepository.js";

function mensagem(erro: unknown): string {
  return erro instanceof Error ? erro.message : "Erro interno";
}

export async function listar(_req: Request, res: Response): Promise<void> {
  try {
    const usuarios = await listarUsuarios();
    res.json(usuarios);
  } catch (erro) {
    res.status(500).json({ erro: mensagem(erro) });
  }
}

export async function criar(req: Request, res: Response): Promise<void> {
  try {
    const { usuario, senha, nivel, loja } = req.body as {
      usuario?: string;
      senha?: string;
      nivel?: string;
      loja?: string;
    };

    const id = await criarUsuario(
      usuario || "",
      senha || "",
      nivel || "CONSULTA",
      loja || "TODAS"
    );

    res.json({ sucesso: true, id });
  } catch (erro) {
    const msg = mensagem(erro);
    const status =
      msg.includes("inválid") || msg.includes("deve ter") ? 400 : 500;
    res.status(status).json({ erro: msg });
  }
}

export async function mudarSenha(req: Request, res: Response): Promise<void> {
  try {
    const { senha } = req.body as { senha?: string };
    await alterarSenha(req.params.id as string, senha || "");
    res.json({ sucesso: true });
  } catch (erro) {
    const msg = mensagem(erro);
    const status = msg.includes("deve ter") ? 400 : 500;
    res.status(status).json({ erro: msg });
  }
}

export async function mudarStatus(req: Request, res: Response): Promise<void> {
  try {
    const { ativo } = req.body as { ativo?: number };
    await alterarStatus(req.params.id as string, Number(ativo));
    res.json({ sucesso: true });
  } catch (erro) {
    res.status(500).json({ erro: mensagem(erro) });
  }
}

export async function excluir(req: Request, res: Response): Promise<void> {
  try {
    await excluirUsuario(req.params.id as string);
    res.json({ sucesso: true });
  } catch (erro) {
    res.status(500).json({ erro: mensagem(erro) });
  }
}
