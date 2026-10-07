import db from "../config/database.js";

export function obterStatus() {

    return new Promise((resolve, reject) => {

        const sql = `

            SELECT

                COUNT(*) AS registros,

                COUNT(DISTINCT codigo_venda) AS pedidos,

                COUNT(DISTINCT codigo_loja) AS lojas,

                COUNT(DISTINCT codigo_produto) AS produtos,

                COUNT(DISTINCT codigo_vendedor) AS vendedores,

                COUNT(DISTINCT codigo_fornecedor) AS fornecedores,

                MAX(data_venda) AS ultima_data

            FROM vendas

        `;

        db.get(sql, [], (err, row) => {

            if (err)
                return reject(err);

            resolve(row);

        });

    });

}