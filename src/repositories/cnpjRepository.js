import { dbLeitura as db } from "../config/database.js";

export function obterCnpjs(inicio, fim) {

    return new Promise((resolve, reject) => {

        const sql = `

            SELECT

                codigo_loja,

                nome_loja,

                ROUND(SUM(total_item - desconto),2) AS faturamento,

                COUNT(DISTINCT numero_venda) AS pedidos,

                SUM(quantidade) AS itens,

                ROUND(

                    SUM(total_item - desconto) /

                    COUNT(DISTINCT numero_venda),

                    2

                ) AS ticket_medio

            FROM vendas

            WHERE data_venda BETWEEN ? AND ?

            GROUP BY

                codigo_loja,
                nome_loja

            ORDER BY faturamento DESC

        `;

        db.all(sql, [inicio, fim], (err, rows) => {

            if (err)
                return reject(err);

            resolve(rows);

        });

    });

}