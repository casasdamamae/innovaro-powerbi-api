import db from "../config/database.js";
import bcrypt from "bcryptjs";
import type { Usuario, UsuarioPublico, PaginaUsuarios, AtualizarUsuarioInput } from "../types/index.js";

const NIVEIS_VALIDOS = new Set(["ADMIN", "CONSULTA"]);
const SENHA_MINIMA = 6;
const LIMITE_PAGINA = 15;

export function buscarUsuario(usuario: string): Promise<Usuario | undefined> {
  return new Promise((resolve, reject) => {
    db.get(
      `
      SELECT id, usuario, senha, nivel, loja, ativo
      FROM usuarios
      WHERE usuario = ?
      `,
      [usuario],
      (err, row: Usuario | undefined) => {
        if (err) return reject(err);
        resolve(row);
      }
    );
  });
}

export function listarUsuarios(pagina: number): Promise<PaginaUsuarios> {
  const paginaNorm = Math.max(1, Math.floor(pagina) || 1);
  const offset = (paginaNorm - 1) * LIMITE_PAGINA;

  return new Promise((resolve, reject) => {
    db.get(
      `SELECT COUNT(*) AS total FROM usuarios`,
      [],
      (countErr, countRow: { total: number } | undefined) => {
        if (countErr) return reject(countErr);

        const total = Number(countRow?.total || 0);
        const totalPaginas = total === 0 ? 0 : Math.ceil(total / LIMITE_PAGINA);

        db.all(
          `
          SELECT id, usuario, nivel, loja, ativo
          FROM usuarios
          ORDER BY usuario
          LIMIT ? OFFSET ?
          `,
          [LIMITE_PAGINA, offset],
          (err, rows: UsuarioPublico[]) => {
            if (err) return reject(err);

            resolve({
              dados: rows || [],
              pagina: paginaNorm,
              limite: LIMITE_PAGINA,
              total,
              totalPaginas,
            });
          }
        );
      }
    );
  });
}

export async function criarUsuario(
  usuario: string,
  senha: string,
  nivel = "CONSULTA",
  loja = "TODAS"
): Promise<number> {
  if (!usuario || typeof usuario !== "string" || usuario.trim().length < 3) {
    throw new Error("Usuário deve ter pelo menos 3 caracteres.");
  }

  if (!senha || senha.length < SENHA_MINIMA) {
    throw new Error(`Senha deve ter pelo menos ${SENHA_MINIMA} caracteres.`);
  }

  if (!NIVEIS_VALIDOS.has(nivel)) {
    throw new Error("Nível inválido. Use ADMIN ou CONSULTA.");
  }

  if (!loja || typeof loja !== "string") {
    throw new Error("Loja inválida.");
  }

  const hash = await bcrypt.hash(senha, 10);

  return new Promise((resolve, reject) => {
    db.run(
      `
      INSERT INTO usuarios (usuario, senha, nivel, loja)
      VALUES (?,?,?,?)
      `,
      [usuario.trim(), hash, nivel, loja],
      function (this: { lastID: number }, err: Error | null) {
        if (err) return reject(err);
        resolve(this.lastID);
      }
    );
  });
}

export async function alterarSenha(id: number | string, senha: string): Promise<number> {
  if (!senha || senha.length < SENHA_MINIMA) {
    throw new Error(`Senha deve ter pelo menos ${SENHA_MINIMA} caracteres.`);
  }

  const hash = await bcrypt.hash(senha, 10);

  return new Promise((resolve, reject) => {
    db.run(
      `UPDATE usuarios SET senha = ? WHERE id = ?`,
      [hash, id],
      function (this: { changes: number }, err: Error | null) {
        if (err) return reject(err);
        resolve(this.changes);
      }
    );
  });
}

export async function atualizarUsuario(
  id: number | string,
  campos: AtualizarUsuarioInput
): Promise<number> {
  const sets: string[] = [];
  const params: unknown[] = [];

  if (campos.ativo !== undefined) {
    if (campos.ativo !== 0 && campos.ativo !== 1) {
      throw new Error("Ativo inválido. Use 0 ou 1.");
    }
    sets.push("ativo = ?");
    params.push(campos.ativo);
  }

  if (campos.senha !== undefined) {
    if (!campos.senha || campos.senha.length < SENHA_MINIMA) {
      throw new Error(`Senha deve ter pelo menos ${SENHA_MINIMA} caracteres.`);
    }
    const hash = await bcrypt.hash(campos.senha, 10);
    sets.push("senha = ?");
    params.push(hash);
  }

  if (campos.loja !== undefined) {
    if (!campos.loja || typeof campos.loja !== "string" || !campos.loja.trim()) {
      throw new Error("Loja inválida.");
    }
    sets.push("loja = ?");
    params.push(campos.loja.trim());
  }

  if (campos.nivel !== undefined) {
    if (!NIVEIS_VALIDOS.has(campos.nivel)) {
      throw new Error("Nível inválido. Use ADMIN ou CONSULTA.");
    }
    sets.push("nivel = ?");
    params.push(campos.nivel);
  }

  if (sets.length === 0) {
    throw new Error("Informe ao menos um campo para atualizar.");
  }

  params.push(id);

  return new Promise((resolve, reject) => {
    db.run(
      `UPDATE usuarios SET ${sets.join(", ")} WHERE id = ?`,
      params,
      function (this: { changes: number }, err: Error | null) {
        if (err) return reject(err);
        resolve(this.changes);
      }
    );
  });
}

export function excluirUsuario(id: number | string): Promise<number> {
  return new Promise((resolve, reject) => {
    db.run(
      `DELETE FROM usuarios WHERE id = ?`,
      [id],
      function (this: { changes: number }, err: Error | null) {
        if (err) return reject(err);
        resolve(this.changes);
      }
    );
  });
}

export async function verificarSenha(senhaPlain: string, senhaArmazenada: string): Promise<boolean> {
  if (senhaArmazenada.startsWith("$2a$") || senhaArmazenada.startsWith("$2b$")) {
    return bcrypt.compare(senhaPlain, senhaArmazenada);
  }

  // Migração lazy: senha ainda em texto puro
  return senhaPlain === senhaArmazenada;
}

export async function migrarSenhaSeNecessario(
  id: number,
  senhaPlain: string,
  senhaArmazenada: string
): Promise<void> {
  if (senhaArmazenada.startsWith("$2a$") || senhaArmazenada.startsWith("$2b$")) {
    return;
  }

  if (senhaPlain === senhaArmazenada) {
    await alterarSenha(id, senhaPlain);
  }
}
