import { dbLeitura as db } from "../config/database.js";
import { montarFiltroLoja } from "./filtroLoja.js";
import { montarFiltroFornecedor } from "./filtroFornecedor.js";
import { montarFiltroSetor } from "./filtroSetor.js";

export function obterProdutos(inicio, fim, loja, fornecedor, setor) {

    return new Promise((resolve, reject) => {

        const filtro = montarFiltroLoja(loja);
        const filtroFornecedor = montarFiltroFornecedor(fornecedor);
        const filtroSetor = montarFiltroSetor(setor);

        const sql = `

            SELECT

                codigo_produto,

                nome_produto,

                nome_secao,

                nome_grupo,

                nome_subgrupo,

                ROUND(SUM(quantidade),2) AS quantidade,

                ROUND(SUM(total_item - desconto),2) AS faturamento,

                COUNT(DISTINCT numero_venda) AS pedidos,

                ROUND(AVG(unitario),2) AS preco_medio

            FROM vendas

            WHERE data_venda BETWEEN ? AND ?

            ${filtro.sql}
            ${filtroFornecedor.sql}
            ${filtroSetor.sql}

            GROUP BY codigo_produto, nome_produto

            ORDER BY faturamento DESC

            LIMIT 50

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