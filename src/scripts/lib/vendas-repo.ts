import sqlite3 from "sqlite3";
import type { Venda } from "../../types/index.js";

const INSERT_SQL = `
  INSERT OR IGNORE INTO vendas (
    codigo_venda, codigo_produto, data_venda, hora_venda, numero_venda,
    codigo_loja, nome_loja, codigo_checkout, codigo_vendedor, nome_vendedor,
    codigo_supervisor, nome_supervisor, codigo_fornecedor, nome_fornecedor,
    codigo_grupo, nome_grupo, codigo_subgrupo, nome_subgrupo,
    codigo_secao, nome_secao, nome_produto, cfop, quantidade, unitario,
    desconto, acrescimo, impostos, custo_item, custo_total, total_item, chave_cfe
  ) VALUES (
    ?, ?, ?, ?, ?, ?, ?, ?, ?, ?,
    ?, ?, ?, ?, ?, ?, ?, ?, ?, ?,
    ?, ?, ?, ?, ?, ?, ?, ?, ?, ?,
    ?
  )
`;

function valoresVenda(venda: Venda): unknown[] {
  return [
    venda.codigo_venda,
    venda.codigo_produto,
    venda.data_venda,
    venda.hora_venda,
    venda.numero_venda,
    venda.codigo_loja,
    venda.nome_loja,
    venda.codigo_checkout,
    venda.codigo_vendedor,
    venda.nome_vendedor,
    venda.codigo_supervisor,
    venda.nome_supervisor,
    venda.codigo_fornecedor,
    venda.nome_fornecedor,
    venda.codigo_grupo,
    venda.nome_grupo,
    venda.codigo_subgrupo,
    venda.nome_subgrupo,
    venda.codigo_secao,
    venda.nome_secao,
    venda.nome_produto,
    venda.cfop,
    venda.quantidade,
    venda.unitario,
    venda.desconto,
    venda.acrescimo,
    venda.impostos,
    venda.custo_item,
    venda.custo_total,
    venda.total_item,
    venda.chave_cfe,
  ];
}

function run(
  db: sqlite3.Database,
  sql: string,
  params: unknown[] = []
): Promise<void> {
  return new Promise((resolve, reject) => {
    db.run(sql, params, (err) => {
      if (err) return reject(err);
      resolve();
    });
  });
}

function get<T>(
  db: sqlite3.Database,
  sql: string,
  params: unknown[] = []
): Promise<T | undefined> {
  return new Promise((resolve, reject) => {
    db.get(sql, params, (err, row: T | undefined) => {
      if (err) return reject(err);
      resolve(row);
    });
  });
}

async function rollback(db: sqlite3.Database): Promise<void> {
  try {
    await run(db, "ROLLBACK");
  } catch {
    // A transação já foi encerrada.
  }
}

export function abrirBanco(caminho: string): Promise<sqlite3.Database> {
  return new Promise((resolve, reject) => {
    const db = new sqlite3.Database(
      caminho,
      sqlite3.OPEN_READWRITE,
      (err) => {
        if (err) return reject(err);
        resolve(db);
      }
    );
  });
}

export function fecharBanco(db: sqlite3.Database): Promise<void> {
  return new Promise((resolve, reject) => {
    db.close((err) => {
      if (err) return reject(err);
      resolve();
    });
  });
}

export async function configurarBanco(db: sqlite3.Database): Promise<void> {
  await run(db, "PRAGMA journal_mode = WAL");
  await run(db, "PRAGMA busy_timeout = 30000");
}

export async function criarTabelaProgresso(db: sqlite3.Database): Promise<void> {
  await run(
    db,
    `
    CREATE TABLE IF NOT EXISTS backfill_progresso (
      dia          TEXT PRIMARY KEY,
      registros    INTEGER NOT NULL DEFAULT 0,
      concluido_em TEXT DEFAULT CURRENT_TIMESTAMP
    )
    `
  );
}

export async function diaConcluido(
  db: sqlite3.Database,
  dia: string
): Promise<boolean> {
  const tabela = await get<{ name: string }>(
    db,
    `
    SELECT name
    FROM sqlite_master
    WHERE type = 'table' AND name = 'backfill_progresso'
    `
  );

  if (!tabela) return false;

  const linha = await get<{ dia: string }>(
    db,
    "SELECT dia FROM backfill_progresso WHERE dia = ?",
    [dia]
  );

  return Boolean(linha);
}

function inserirVendas(db: sqlite3.Database, vendas: Venda[]): Promise<void> {
  if (vendas.length === 0) return Promise.resolve();

  return new Promise((resolve, reject) => {
    const stmt = db.prepare(INSERT_SQL);
    let failed: Error | null = null;

    for (const venda of vendas) {
      stmt.run(valoresVenda(venda), (runErr) => {
        if (runErr && !failed) failed = runErr;
      });
    }

    stmt.finalize((finalizeErr) => {
      if (finalizeErr || failed) {
        reject(finalizeErr || failed);
        return;
      }
      resolve();
    });
  });
}

export async function gravarDia(
  db: sqlite3.Database,
  dia: string,
  vendas: Venda[]
): Promise<void> {
  try {
    await run(db, "BEGIN TRANSACTION");
    await run(db, "DELETE FROM vendas WHERE data_venda = ?", [dia]);
    await inserirVendas(db, vendas);
    await run(
      db,
      "INSERT OR REPLACE INTO backfill_progresso (dia, registros) VALUES (?, ?)",
      [dia, vendas.length]
    );
    await run(db, "COMMIT");
  } catch (erro) {
    await rollback(db);
    throw erro;
  }
}
