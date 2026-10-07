import db from "../config/database.js";
import { montarFiltroLoja } from "./filtroLoja.js";
import { montarFiltroFornecedor } from "./filtroFornecedor.js";
import { montarFiltroSetor } from "./filtroSetor.js";

export function obterDashboard(inicio, fim, loja, fornecedor, setor) {

    return new Promise((resolve, reject) => {

        const filtro = montarFiltroLoja(loja);
        const filtroFornecedor = montarFiltroFornecedor(fornecedor);
        const filtroSetor = montarFiltroSetor(setor);

        // Período anterior
        const dataInicio = new Date(inicio);
        const dataFim = new Date(fim);

        const dias = Math.floor(
            (dataFim - dataInicio) / (1000 * 60 * 60 * 24)
        ) + 1;

        const inicioAnterior = new Date(dataInicio);
        inicioAnterior.setDate(inicioAnterior.getDate() - dias);

        const fimAnterior = new Date(dataFim);
        fimAnterior.setDate(fimAnterior.getDate() - dias);

        const formatar = (d) => d.toISOString().split("T")[0];

        const sqlAtual = `

            SELECT

                COUNT(DISTINCT numero_venda) AS pedidos,

                ROUND(SUM(quantidade),2) AS itens,

                ROUND(SUM(total_item - desconto),2) AS faturamento,

                ROUND(
                    SUM(total_item - desconto) /
                    COUNT(DISTINCT numero_venda),
                    2
                ) AS ticket_medio,

                ROUND(SUM(desconto),2) AS desconto_total,

                ROUND(MAX(total_item - desconto),2) AS maior_venda

            FROM vendas

            WHERE data_venda BETWEEN ? AND ?
            ${filtro.sql}
            ${filtroFornecedor.sql}
            ${filtroSetor.sql}

        `;

        const sqlAnterior = `

            SELECT

                ROUND(SUM(total_item - desconto),2) AS faturamento

            FROM vendas

            WHERE data_venda BETWEEN ? AND ?
            ${filtro.sql}
            ${filtroFornecedor.sql}
            ${filtroSetor.sql}

        `;

        db.get(

            sqlAtual,

            [inicio, fim, 
                ...filtro.params,
                ...filtroFornecedor.params,
                ...filtroSetor.params],

            (err, atual) => {

                if (err)
                    return reject(err);

                db.get(

                    sqlAnterior,

                    [
                        formatar(inicioAnterior),
                        formatar(fimAnterior),
                        ...filtro.params,
                        ...filtroFornecedor.params,
                        ...filtroSetor.params
                    ],

                    (err2, anterior) => {

                        if (err2)
                            return reject(err2);

                        const atualFat = Number(atual.faturamento || 0);
                        const anteriorFat = Number(anterior.faturamento || 0);

                        let crescimento = 0;

                        if (anteriorFat > 0) {

                            crescimento = (
                                ((atualFat - anteriorFat) / anteriorFat) * 100
                            );

                        }

                        atual.crescimento_faturamento = Number(
                            crescimento.toFixed(2)
                        );

                        atual.faturamento_anterior = anteriorFat;

                        resolve(atual);

                    }

                );

            }

        );

    });

}