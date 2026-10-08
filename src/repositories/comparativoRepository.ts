import db from "../config/database.js";
import { montarFiltroLoja } from "./filtroLoja.js";
import { LOJAS } from "./lojasConfig.js";
import type { MetricasPeriodo, VendaComparativo } from "../types/index.js";

const NOMES_LOJA: Record<string, string> = {
  SAO_BERNARDO: "Casa da Mamãe São Bernardo",
  MAUA: "Casa da Mamãe Mauá",
  SANTO_ANDRE: "Casa da Mamãe Santo André",
  TABOAO: "Casa da Mamãe Taboão",
  SAO_MATEUS_CDM: "Casa da Mamãe São Mateus",
  SAO_MATEUS_MDC: "Melhor das Casas São Mateus",
  MADUREIRA: "Melhor das Casas Madureira",
  SANTA_CRUZ: "Melhor das Casas Santa Cruz",
  BONSUCESSO: "Melhor das Casas Bonsucesso",
  CARIOCA: "Melhor das Casas Carioca",
  MESQUITA: "Melhor das Casas Mesquita",
  NILOPOLIS: "Melhor das Casas Nilópolis",
};

const METRICAS = `
  ROUND(COALESCE(SUM(total_item - desconto), 0), 2) AS faturamento,
  ROUND(COALESCE(SUM(quantidade), 0), 2) AS quantidade,
  COUNT(DISTINCT numero_venda) AS pedidos,
  ROUND(
    CASE
      WHEN COUNT(DISTINCT numero_venda) = 0 THEN 0
      ELSE COALESCE(SUM(total_item - desconto), 0) * 1.0 / COUNT(DISTINCT numero_venda)
    END,
    2
  ) AS ticket_medio
`;

export interface AgregadoLoja extends MetricasPeriodo {
  loja: string;
}

export interface AgregadoDia extends MetricasPeriodo {
  data_venda: string;
}

export interface AgregadoHora extends MetricasPeriodo {
  hora: number;
}

export interface AgregadoSubgrupo extends MetricasPeriodo {
  codigo_subgrupo: number;
  nome_subgrupo: string;
}

export interface AgregadoSecao extends MetricasPeriodo {
  codigo_secao: number;
  nome_secao: string;
}

export interface AgregadoFornecedor extends MetricasPeriodo {
  codigo_fornecedor: number;
  nome_fornecedor: string;
}

export interface AgregadoProduto extends MetricasPeriodo {
  codigo_produto: number;
  nome_produto: string;
}

export interface AgregadosPeriodo {
  total: MetricasPeriodo;
  por_loja: AgregadoLoja[];
  por_dia: AgregadoDia[];
  por_hora: AgregadoHora[];
  por_subgrupo: AgregadoSubgrupo[];
  por_secao: AgregadoSecao[];
  por_fornecedor: AgregadoFornecedor[];
  por_produto: AgregadoProduto[];
}

function sqlLojaComercial(): string {
  const ramos: string[] = [];
  const lojas = LOJAS as Record<string, number[]>;

  for (const [id, codigos] of Object.entries(lojas)) {
    if (!codigos.length) continue;

    const nome = NOMES_LOJA[id];
    if (!nome) continue;

    const lista = codigos.join(",");
    const condicao =
      codigos.length === 1
        ? `codigo_loja = ${lista}`
        : `codigo_loja IN (${lista})`;

    ramos.push(`WHEN ${condicao} THEN '${nome.replace(/'/g, "''")}'`);
  }

  return `CASE ${ramos.join(" ")} ELSE nome_loja END`;
}

function consulta(inicio: string, fim: string, loja: string) {
  const filtro = montarFiltroLoja(loja) as {
    sql: string;
    params: Array<string | number>;
  };

  return {
    where: `WHERE data_venda BETWEEN ? AND ?${filtro.sql}`,
    params: [inicio, fim, ...filtro.params],
  };
}

function all<T>(sql: string, params: Array<string | number>): Promise<T[]> {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
      if (err) {
        reject(err);
        return;
      }
      resolve((rows ?? []) as T[]);
    });
  });
}

function get<T>(sql: string, params: Array<string | number>): Promise<T | undefined> {
  return new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => {
      if (err) {
        reject(err);
        return;
      }
      resolve(row as T | undefined);
    });
  });
}

export function listarLinhasComparativo(
  inicio: string,
  fim: string,
  loja: string
): Promise<VendaComparativo[]> {
  const { where, params } = consulta(inicio, fim, loja);

  const sql = `
    SELECT
      codigo_venda,
      codigo_produto,
      data_venda,
      hora_venda,
      numero_venda,
      codigo_loja,
      nome_loja,
      codigo_checkout,
      codigo_fornecedor,
      nome_fornecedor,
      codigo_grupo,
      nome_grupo,
      codigo_subgrupo,
      nome_subgrupo,
      codigo_secao,
      nome_secao,
      nome_produto,
      quantidade,
      unitario,
      desconto,
      acrescimo,
      impostos,
      custo_item,
      custo_total,
      total_item
    FROM vendas
    ${where}
    ORDER BY data_venda, hora_venda, codigo_venda, codigo_produto
  `;

  return all<VendaComparativo>(sql, params);
}

export async function agregarPeriodo(
  inicio: string,
  fim: string,
  loja: string
): Promise<AgregadosPeriodo> {
  const { where, params } = consulta(inicio, fim, loja);
  const lojaSql = sqlLojaComercial();

  const [total, porLoja, porDia, porHora, porSubgrupo, porSecao, porFornecedor, porProduto] =
    await Promise.all([
      get<MetricasPeriodo>(`SELECT ${METRICAS} FROM vendas ${where}`, params),
      all<AgregadoLoja>(
        `
          SELECT
            loja,
            ${METRICAS}
          FROM (
            SELECT
              numero_venda,
              quantidade,
              total_item,
              desconto,
              ${lojaSql} AS loja
            FROM vendas
            ${where}
          )
          GROUP BY loja
        `,
        params
      ),
      all<AgregadoDia>(
        `
          SELECT
            data_venda,
            ${METRICAS}
          FROM vendas
          ${where}
          GROUP BY data_venda
        `,
        params
      ),
      all<AgregadoHora>(
        `
          SELECT
            hora_venda AS hora,
            ${METRICAS}
          FROM vendas
          ${where}
          GROUP BY hora_venda
        `,
        params
      ),
      all<AgregadoSubgrupo>(
        `
          SELECT
            codigo_subgrupo,
            MAX(nome_subgrupo) AS nome_subgrupo,
            ${METRICAS}
          FROM vendas
          ${where}
          GROUP BY codigo_subgrupo
        `,
        params
      ),
      all<AgregadoSecao>(
        `
          SELECT
            codigo_secao,
            MAX(nome_secao) AS nome_secao,
            ${METRICAS}
          FROM vendas
          ${where}
          GROUP BY codigo_secao
        `,
        params
      ),
      all<AgregadoFornecedor>(
        `
          SELECT
            codigo_fornecedor,
            MAX(nome_fornecedor) AS nome_fornecedor,
            ${METRICAS}
          FROM vendas
          ${where}
          GROUP BY codigo_fornecedor
        `,
        params
      ),
      all<AgregadoProduto>(
        `
          SELECT
            codigo_produto,
            MAX(nome_produto) AS nome_produto,
            ${METRICAS}
          FROM vendas
          ${where}
          GROUP BY codigo_produto
        `,
        params
      ),
    ]);

  return {
    total: total ?? {
      faturamento: 0,
      quantidade: 0,
      pedidos: 0,
      ticket_medio: 0,
    },
    por_loja: porLoja,
    por_dia: porDia,
    por_hora: porHora,
    por_subgrupo: porSubgrupo,
    por_secao: porSecao,
    por_fornecedor: porFornecedor,
    por_produto: porProduto,
  };
}
