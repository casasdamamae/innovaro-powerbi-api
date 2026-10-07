import type { Request, Response } from "express";
import {
  ComparativoInvalido,
  montarComparativo,
} from "../services/comparativoService.js";

function mensagem(erro: unknown): string {
  return erro instanceof Error ? erro.message : "Erro interno";
}

function asString(value: unknown): string | undefined {
  if (typeof value === "string") return value;
  if (Array.isArray(value) && typeof value[0] === "string") return value[0];
  return undefined;
}

export async function obterComparativo(req: Request, res: Response): Promise<void> {
  try {
    if (!req.usuario) {
      res.status(401).json({ sucesso: false, erro: "Não autenticado." });
      return;
    }

    const resultado = await montarComparativo(
      {
        modo: asString(req.query.modo),
        loja: asString(req.query.loja),
      },
      req.usuario
    );

    res.json(resultado);
  } catch (erro) {
    if (erro instanceof ComparativoInvalido) {
      res.status(400).json({ sucesso: false, erro: erro.message });
      return;
    }

    res.status(500).json({ sucesso: false, erro: mensagem(erro) });
  }
}
