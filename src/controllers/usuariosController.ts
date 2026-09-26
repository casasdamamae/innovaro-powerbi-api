import type { Request, Response } from "express";
import {
  listarUsuarios,
  criarUsuario,
} from "../repositories/usuariosRepository.js";
import {
  atualizarUsuarioComRegras,
  excluirUsuarioComRegras,
  UsuariosServiceError,
} from "../services/usuariosService.js";
import type { AtualizarUsuarioInput } from "../types/index.js";

function mensagem(erro: unknown): string {
  return erro instanceof Error ? erro.message : "Erro interno";
}

function asString(value: unknown): string | undefined {
  if (typeof value === "string") return value;
  if (Array.isArray(value) && typeof value[0] === "string") return value[0];
  return undefined;
}

function isValidationError(msg: string): boolean {
  return (
    msg.includes("inválid") ||
    msg.includes("deve ter") ||
    msg.includes("Informe ao menos") ||
    msg.includes("Informe a nova")
  );
}

export async function listar(req: Request, res: Response): Promise<void> {
  try {
    const pagina = Math.max(1, Number(asString(req.query.pagina)) || 1);
    const resultado = await listarUsuarios(pagina);
    res.json(resultado);
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
    const status = isValidationError(msg) ? 400 : 500;
    res.status(status).json({ erro: msg });
  }
}

export async function atualizar(req: Request, res: Response): Promise<void> {
  try {
    if (!req.usuario) {
      res.status(401).json({ erro: "Não autenticado." });
      return;
    }

    const body = req.body as AtualizarUsuarioInput;
    const campos: AtualizarUsuarioInput = {};

    if (body.ativo !== undefined) campos.ativo = Number(body.ativo);
    if (body.senha !== undefined) campos.senha = body.senha;
    if (body.loja !== undefined) campos.loja = body.loja;
    if (body.nivel !== undefined) campos.nivel = body.nivel;

    const changes = await atualizarUsuarioComRegras(
      req.usuario,
      req.params.id as string,
      campos
    );

    if (changes === 0) {
      res.status(404).json({ erro: "Usuário não encontrado." });
      return;
    }

    res.json({ sucesso: true });
  } catch (erro) {
    if (erro instanceof UsuariosServiceError) {
      res.status(erro.status).json({ erro: erro.message });
      return;
    }

    const msg = mensagem(erro);
    const status = isValidationError(msg) ? 400 : 500;
    res.status(status).json({ erro: msg });
  }
}

export async function excluir(req: Request, res: Response): Promise<void> {
  try {
    if (!req.usuario) {
      res.status(401).json({ erro: "Não autenticado." });
      return;
    }

    const changes = await excluirUsuarioComRegras(
      req.usuario,
      req.params.id as string
    );

    if (changes === 0) {
      res.status(404).json({ erro: "Usuário não encontrado." });
      return;
    }

    res.json({ sucesso: true });
  } catch (erro) {
    if (erro instanceof UsuariosServiceError) {
      res.status(erro.status).json({ erro: erro.message });
      return;
    }

    res.status(500).json({ erro: mensagem(erro) });
  }
}
