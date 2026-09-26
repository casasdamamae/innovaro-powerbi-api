import db from "../config/database.js";

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

function valoresVenda(venda) {
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

export function salvarVendas(vendas) {
  return new Promise((resolve, reject) => {
    db.serialize(() => {
      db.run("BEGIN TRANSACTION");

      const stmt = db.prepare(INSERT_SQL);

      for (const venda of vendas) {
        stmt.run(valoresVenda(venda));
      }

      stmt.finalize((err) => {
        if (err) {
          return db.run("ROLLBACK", () => reject(err));
        }

        db.run("COMMIT", (commitErr) => {
          if (commitErr) {
            return reject(commitErr);
          }
          resolve();
        });
      });
    });
  });
}

export function apagarDia(data) {
  return new Promise((resolve, reject) => {
    db.run(
      "DELETE FROM vendas WHERE data_venda = ?",
      [data],
      function (err) {
        if (err) {
          return reject(err);
        }
        console.log(`🗑 ${this.changes} registros removidos do dia ${data}`);
        resolve();
      }
    );
  });
}

/**
 * Apaga o dia e grava as novas vendas na mesma transaction.
 * Se o insert falhar, o delete é revertido (ROLLBACK).
 */
export function substituirVendasDoDia(data, vendas) {
  return new Promise((resolve, reject) => {
    db.serialize(() => {
      db.run("BEGIN TRANSACTION", (beginErr) => {
        if (beginErr) {
          return reject(beginErr);
        }

        db.run(
          "DELETE FROM vendas WHERE data_venda = ?",
          [data],
          function (deleteErr) {
            if (deleteErr) {
              return db.run("ROLLBACK", () => reject(deleteErr));
            }

            const stmt = db.prepare(INSERT_SQL);
            let failed = false;

            for (const venda of vendas) {
              stmt.run(valoresVenda(venda), (runErr) => {
                if (runErr && !failed) {
                  failed = true;
                }
              });
            }

            stmt.finalize((finalizeErr) => {
              if (finalizeErr || failed) {
                return db.run("ROLLBACK", () =>
                  reject(finalizeErr || new Error("Falha ao inserir vendas"))
                );
              }

              db.run("COMMIT", (commitErr) => {
                if (commitErr) {
                  return reject(commitErr);
                }
                resolve();
              });
            });
          }
        );
      });
    });
  });
}

export function contarVendas() {
  return new Promise((resolve, reject) => {
    db.get("SELECT COUNT(*) AS total FROM vendas", [], (err, row) => {
      if (err) {
        return reject(err);
      }
      resolve(row.total);
    });
  });
}

export function consultarVendas(filtros = {}) {
  return new Promise((resolve, reject) => {
    let sql = `
      SELECT *
      FROM vendas
      WHERE 1 = 1
    `;

    const parametros = [];

    if (filtros.data) {
      sql += " AND data_venda = ?";
      parametros.push(filtros.data);
    }

    if (filtros.loja) {
      sql += " AND codigo_loja = ?";
      parametros.push(filtros.loja);
    }

    if (filtros.vendedor) {
      sql += " AND codigo_vendedor = ?";
      parametros.push(filtros.vendedor);
    }

    if (filtros.produto) {
      sql += " AND codigo_produto = ?";
      parametros.push(filtros.produto);
    }

    if (filtros.fornecedor) {
      sql += " AND codigo_fornecedor = ?";
      parametros.push(filtros.fornecedor);
    }

    if (filtros.secao) {
      sql += " AND nome_secao = ?";
      parametros.push(filtros.secao);
    }

    sql += `
      ORDER BY
        data_venda DESC,
        hora_venda DESC,
        codigo_venda DESC
    `;

    if (filtros.limite) {
      const limite = Number(filtros.limite);
      const pagina = Number(filtros.pagina || 1);
      sql += " LIMIT ? OFFSET ?";
      parametros.push(limite, (pagina - 1) * limite);
    }

    db.all(sql, parametros, (err, rows) => {
      if (err) {
        return reject(err);
      }
      resolve(rows);
    });
  });
}
