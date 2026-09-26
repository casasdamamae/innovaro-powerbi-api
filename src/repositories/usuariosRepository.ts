import db from "../config/database.js";
import bcrypt from "bcryptjs";
import type { Usuario, UsuarioPublico } from "../types/index.js";

const NIVEIS_VALIDOS = new Set(["ADMIN", "CONSULTA"]);
const SENHA_MINIMA = 6;

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

export function listarUsuarios(): Promise<UsuarioPublico[]> {
  return new Promise((resolve, reject) => {
    db.all(
      `
      SELECT id, usuario, nivel, loja, ativo
      FROM usuarios
      ORDER BY usuario
      `,
      [],
      (err, rows: UsuarioPublico[]) => {
        if (err) return reject(err);
        resolve(rows || []);
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

export function alterarStatus(id: number | string, ativo: number): Promise<number> {
  return new Promise((resolve, reject) => {
    db.run(
      `UPDATE usuarios SET ativo = ? WHERE id = ?`,
      [ativo, id],
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
