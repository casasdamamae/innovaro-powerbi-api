import db from "../config/database.js";
import { montarFiltroLoja } from "./filtroLoja.js";
import { montarFiltroFornecedor } from "./filtroFornecedor.js";
import { montarFiltroSetor } from "./filtroSetor.js";

export function obterLojas(inicio, fim, loja, fornecedor, setor) {

    return new Promise((resolve, reject) => {

        const filtro = montarFiltroLoja(loja);
        const filtroFornecedor = montarFiltroFornecedor(fornecedor);
        const filtroSetor = montarFiltroSetor(setor);

        const sql = `

            SELECT

                loja,

                ROUND(SUM(faturamento),2) AS faturamento,

                COUNT(DISTINCT numero_venda) AS pedidos,

                SUM(itens) AS itens,

                ROUND(
                    SUM(faturamento) /
                    COUNT(DISTINCT numero_venda),
                    2
                ) AS ticket_medio

            FROM (

                SELECT

                    numero_venda,

                    quantidade AS itens,

                    (total_item - desconto) AS faturamento,

                    CASE

                        WHEN codigo_loja IN (3558610,3558618)
                            THEN 'Casa da Mamãe São Bernardo'

                        WHEN codigo_loja IN (3813423,3813415,3813426)
                            THEN 'Casa da Mamãe Mauá'

                        WHEN codigo_loja IN (3813431,19901698)
                            THEN 'Casa da Mamãe Santo André'

                        WHEN codigo_loja IN (3558633,3558624)
                            THEN 'Casa da Mamãe Taboão'

                        WHEN codigo_loja = 2176059
                            THEN 'Casa da Mamãe São Mateus'

                        WHEN codigo_loja = 24829
                            THEN 'Melhor das Casas São Mateus'

                        WHEN codigo_loja IN (298836522,13521846)
                            THEN 'Melhor das Casas Madureira'

                        WHEN codigo_loja IN (13576467,21242094)
                            THEN 'Melhor das Casas Santa Cruz'

                        WHEN codigo_loja = 68722033
                            THEN 'Melhor das Casas Bonsucesso'

                        WHEN codigo_loja = 49127607
                            THEN 'Melhor das Casas Carioca'

                        WHEN codigo_loja = 302403545
                            THEN 'Melhor das Casas Mesquita'

                        WHEN codigo_loja = 22786775
                            THEN 'Melhor das Casas Nilópolis'

                        ELSE nome_loja

                    END AS loja

                FROM vendas

                WHERE data_venda BETWEEN ? AND ?

                ${filtro.sql}
                ${filtroFornecedor.sql}
                ${filtroSetor.sql}

            )

            GROUP BY loja

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

export function listarLojas() {

    return Promise.resolve([

        { id: "TODAS", nome: "Todas as Lojas" },
        { id: "SAO_BERNARDO", nome: "Casa da Mamãe São Bernardo" },
        { id: "MAUA", nome: "Casa da Mamãe Mauá" },
        { id: "SANTO_ANDRE", nome: "Casa da Mamãe Santo André" },
        { id: "TABOAO", nome: "Casa da Mamãe Taboão" },
        { id: "SAO_MATEUS_CDM", nome: "Casa da Mamãe São Mateus" },
        { id: "SAO_MATEUS_MDC", nome: "Melhor das Casas São Mateus" },
        { id: "MADUREIRA", nome: "Melhor das Casas Madureira" },
        { id: "SANTA_CRUZ", nome: "Melhor das Casas Santa Cruz" },
        { id: "BONSUCESSO", nome: "Melhor das Casas Bonsucesso" },
        { id: "CARIOCA", nome: "Melhor das Casas Carioca" },
        { id: "MESQUITA", nome: "Melhor das Casas Mesquita" },
        { id: "NILOPOLIS", nome: "Melhor das Casas Nilópolis" }

    ]);

}