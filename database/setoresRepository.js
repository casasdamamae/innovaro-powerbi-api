import db from "./database.js";
import { montarFiltroLoja } from "./filtroLoja.js";
import { montarFiltroFornecedor } from "./filtroFornecedor.js";
import { montarFiltroSetor } from "./filtroSetor.js";

export function obterSetores(inicio, fim, loja, fornecedor, setor) {

    return new Promise((resolve, reject) => {

        const filtro = montarFiltroLoja(loja);
        const filtroFornecedor = montarFiltroFornecedor(fornecedor);
        const filtroSetor = montarFiltroSetor(setor);

        const sql = `

            SELECT

                codigo_subgrupo,

                nome_subgrupo,

                ROUND(SUM(total_item - desconto),2) AS faturamento,

                ROUND(

                    SUM(total_item - desconto) * 100.0 /

                    SUM(SUM(total_item - desconto)) OVER (),

                    2

                ) AS percentual,

                COUNT(DISTINCT numero_venda) AS pedidos,

                ROUND(SUM(quantidade),2) AS itens,

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

            GROUP BY codigo_subgrupo, nome_subgrupo

            ORDER BY faturamento DESC

            LIMIT 15

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

export function listarSetores() {

    return new Promise((resolve, reject) => {

        db.all(

            `

            SELECT DISTINCT

                codigo_subgrupo AS id,

                nome_subgrupo AS nome

            FROM vendas

            WHERE nome_subgrupo IS NOT NULL

            ORDER BY nome_subgrupo

            `,

            [],

            (err, rows) => {

                if (err)
                    return reject(err);

                resolve([

                    {

                        id: "TODOS",
                        nome: "Todos os setores"

                    },

                    ...rows

                ]);

            }

        );

    });

}