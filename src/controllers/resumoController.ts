import type { Request, Response } from "express";
import {
  obterResumoCompleto,
  listarFiltroLojas,
  listarFiltroFornecedores,
  listarFiltroSetores,
} from "../services/resumoService.js";

function mensagem(erro: unknown): string {
  return erro instanceof Error ? erro.message : "Erro interno";
}

function asString(value: unknown): string | undefined {
  if (typeof value === "string") return value;
  if (Array.isArray(value) && typeof value[0] === "string") return value[0];
  return undefined;
}

export async function obterResumo(req: Request, res: Response): Promise<void> {
  try {
    if (!req.usuario) {
      res.status(401).json({ sucesso: false, erro: "Não autenticado." });
      return;
    }

    const resultado = await obterResumoCompleto(
      {
        inicio: asString(req.query.inicio),
        fim: asString(req.query.fim),
        loja: asString(req.query.loja),
        fornecedor: asString(req.query.fornecedor),
        setor: asString(req.query.setor),
      },
      req.usuario
    );

    res.json(resultado);
  } catch (erro) {
    console.error(erro);
    res.status(500).json({ sucesso: false, erro: mensagem(erro) });
  }
}

export async function lojas(_req: Request, res: Response): Promise<void> {
  try {
    res.json(await listarFiltroLojas());
  } catch (erro) {
    res.status(500).json({ erro: mensagem(erro) });
  }
}

export async function fornecedores(_req: Request, res: Response): Promise<void> {
  try {
    res.json(await listarFiltroFornecedores());
  } catch (erro) {
    res.status(500).json({ erro: mensagem(erro) });
  }
}

export async function setores(_req: Request, res: Response): Promise<void> {
  try {
    res.json(await listarFiltroSetores());
  } catch (erro) {
    res.status(500).json({ erro: mensagem(erro) });
  }
}
