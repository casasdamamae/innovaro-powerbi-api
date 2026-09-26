import {
  atualizarUsuario,
  excluirUsuario,
} from "../repositories/usuariosRepository.js";
import type { AtualizarUsuarioInput, JwtPayload } from "../types/index.js";

export class UsuariosServiceError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

/**
 * Regras:
 * - Qualquer autenticado pode alterar apenas a própria senha.
 * - Só ADMIN pode alterar ativo, loja e nivel — e somente de outro usuário.
 * - Ninguém altera ativo/loja/nivel de si mesmo (evita se auto-bloquear).
 */
export async function atualizarUsuarioComRegras(
  ator: JwtPayload,
  idAlvo: number | string,
  campos: AtualizarUsuarioInput
): Promise<number> {
  const alvoId = Number(idAlvo);
  const ehProprioUsuario = Number(ator.id) === alvoId;
  const ehAdmin = ator.nivel === "ADMIN";

  const temCampoRestrito =
    campos.ativo !== undefined ||
    campos.loja !== undefined ||
    campos.nivel !== undefined;

  const temSenha = campos.senha !== undefined;

  if (Object.keys(campos).length === 0) {
    throw new UsuariosServiceError(
      "Informe ao menos um campo para atualizar (ativo, senha, loja, nivel).",
      400
    );
  }

  if (ehProprioUsuario) {
    if (temCampoRestrito) {
      throw new UsuariosServiceError(
        "Você só pode alterar a própria senha. Visibilidade, nível e status não podem ser alterados por você.",
        403
      );
    }

    if (!temSenha) {
      throw new UsuariosServiceError(
        "Informe a nova senha.",
        400
      );
    }

    return atualizarUsuario(alvoId, { senha: campos.senha });
  }

  // Atualizando outro usuário
  if (!ehAdmin) {
    throw new UsuariosServiceError(
      "Acesso restrito a administradores.",
      403
    );
  }

  return atualizarUsuario(alvoId, campos);
}

/**
 * Regras:
 * - ADMIN pode excluir outros usuários.
 * - Ninguém pode excluir a si próprio.
 */
export async function excluirUsuarioComRegras(
  ator: JwtPayload,
  idAlvo: number | string
): Promise<number> {
  const alvoId = Number(idAlvo);

  if (Number(ator.id) === alvoId) {
    throw new UsuariosServiceError(
      "Você não pode excluir a si próprio.",
      403
    );
  }

  return excluirUsuario(alvoId);
}
