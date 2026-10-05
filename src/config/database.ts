import sqlite3 from "sqlite3";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import { env } from "./env.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const bancoOriginal = path.resolve(__dirname, "../../database/banco.db");

export const caminhoBanco = env.dbPath ? env.dbPath : bancoOriginal;

if (env.dbPath) {
  const pasta = path.dirname(caminhoBanco);

  if (!fs.existsSync(pasta)) {
    fs.mkdirSync(pasta, { recursive: true });
  }

  // Copiar banco inicial somente se o destino não existir
  if (!fs.existsSync(caminhoBanco)) {
    console.log("📦 Copiando banco inicial...");

    if (fs.existsSync(bancoOriginal)) {
      fs.copyFileSync(bancoOriginal, caminhoBanco);
      console.log("✅ Banco copiado para o Persistent Disk.");
    } else {
      console.log("❌ Banco inicial não encontrado.");
    }
  } else {
    console.log("✅ Banco persistente encontrado.");
  }
}

console.log("📁 Banco:", caminhoBanco);

const db = new sqlite3.Database(caminhoBanco, (err) => {
  if (err) {
    console.error("Erro ao abrir banco:", err.message);
    return;
  }

  console.log("✅ Banco SQLite conectado.");
});

export let dbLeitura: sqlite3.Database;

function definirBusyTimeout(banco: sqlite3.Database, ms: number): void {
  (
    banco as sqlite3.Database & {
      configure(option: "busyTimeout", value: number): void;
    }
  ).configure("busyTimeout", ms);
}

function executar(banco: sqlite3.Database, sql: string): Promise<void> {
  return new Promise((resolve, reject) => {
    banco.run(sql, (err) => {
      if (err) reject(err);
      else resolve();
    });
  });
}

function consultarUm(
  banco: sqlite3.Database,
  sql: string
): Promise<Record<string, unknown>> {
  return new Promise((resolve, reject) => {
    banco.get(sql, (err, row: Record<string, unknown> | undefined) => {
      if (err) reject(err);
      else resolve(row || {});
    });
  });
}

function abrirLeitura(): Promise<sqlite3.Database> {
  return new Promise((resolve, reject) => {
    const leitura = new sqlite3.Database(caminhoBanco, (err) => {
      if (err) {
        reject(err);
        return;
      }

      definirBusyTimeout(leitura, 30000);
      leitura.run("PRAGMA query_only = ON", (pragmaErr) => {
        if (pragmaErr) reject(pragmaErr);
        else resolve(leitura);
      });
    });
  });
}

export async function prepararBanco(): Promise<void> {
  definirBusyTimeout(db, 30000);

  const modo = await consultarUm(db, "PRAGMA journal_mode = WAL");
  const journal = String(modo.journal_mode || "").toLowerCase();
  if (journal !== "wal") {
    throw new Error(`journal_mode ficou ${journal || "desconhecido"}, esperado wal`);
  }

  await executar(db, "PRAGMA synchronous = NORMAL");
  await executar(db, "PRAGMA temp_store = MEMORY");
  await executar(db, "PRAGMA cache_size = -50000");
  await executar(db, "PRAGMA mmap_size = 268435456");
  await executar(db, "PRAGMA busy_timeout = 30000");
  await executar(db, "PRAGMA foreign_keys = ON");

  dbLeitura = await abrirLeitura();
  console.log("✅ SQLite em WAL. Leitura separada da gravação.");
}

export default db;
