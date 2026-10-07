import db from "../config/database.js";
import { montarFiltroLoja } from "./filtroLoja.js";
import { montarFiltroFornecedor } from "./filtroFornecedor.js";
import { montarFiltroSetor } from "./filtroSetor.js";

export function obterFornecedores(inicio, fim, loja, fornecedor, setor) {

    return new Promise((resolve, reject) => {

        const filtro = montarFiltroLoja(loja);
        const filtroFornecedor = montarFiltroFornecedor(fornecedor);
        const filtroSetor = montarFiltroSetor(setor);

        const sql = `

            SELECT

                codigo_fornecedor,

                nome_fornecedor,

                ROUND(SUM(total_item - desconto),2) AS faturamento,

                COUNT(DISTINCT numero_venda) AS pedidos,

                SUM(quantidade) AS itens,

                COUNT(DISTINCT codigo_produto) AS produtos,

                ROUND(
                    SUM(total_item - desconto) /
                    COUNT(DISTINCT numero_venda),
                    2
                ) AS ticket_medio

            FROM vendas

            WHERE data_venda BETWEEN ? AND ?

            ${filtro.sql}
            ${filtroFornecedor.sql}
            ${filtroSetor.sql}

            GROUP BY codigo_fornecedor, nome_fornecedor

            ORDER BY faturamento DESC

        `;

        db.all(

            sql,

            [

                inicio,
                fim,
                ...filtro.params,
                ...filtroFornecedor.params,
                ...filtroSetor.params

            ],

            (err, rows) => {

                if (err)
                    return reject(err);

                resolve(rows);

            }

        );

    });

}

export function listarFornecedores() {

    return new Promise((resolve, reject) => {

        db.all(

            `

            SELECT DISTINCT

                codigo_fornecedor AS id,

                nome_fornecedor AS nome

            FROM vendas

            WHERE nome_fornecedor IS NOT NULL

            ORDER BY nome_fornecedor

            `,

            [],

            (err, rows) => {

                if (err)
                    return reject(err);

                resolve([

                    {

                        id: "TODOS",
                        nome: "Todos os fornecedores"

                    },

                    ...rows

                ]);

            }

        );

    });

}