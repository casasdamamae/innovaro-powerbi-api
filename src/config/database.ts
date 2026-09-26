import sqlite3 from "sqlite3";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import { env } from "./env.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const bancoOriginal = path.resolve(__dirname, "../../database/banco.db");

const caminhoBanco = env.dbPath ? env.dbPath : bancoOriginal;

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

  db.serialize(() => {
    db.run("PRAGMA journal_mode = WAL;");
    db.run("PRAGMA synchronous = NORMAL;");
    db.run("PRAGMA temp_store = MEMORY;");
    db.run("PRAGMA cache_size = -50000;");
    db.run("PRAGMA mmap_size = 268435456;");
    db.run("PRAGMA busy_timeout = 30000;");
    db.run("PRAGMA foreign_keys = ON;");
    db.run("PRAGMA optimize;");
  });

  console.log("🚀 SQLite otimizado.");
});

export default db;
