import db from "../config/database.js";

/*
==========================================
DASHBOARD
==========================================
*/

export function obterDashboard() {

    return new Promise((resolve, reject) => {

        db.get(`

            SELECT

                COUNT(DISTINCT codigo_venda) pedidos,

                COUNT(*) itens,

                ROUND(SUM(total_item),2) faturamento,

                ROUND(

                    SUM(total_item) /
                    COUNT(DISTINCT codigo_venda),

                    2

                ) ticket_medio

            FROM vw_vendas

        `,

        [],

        (err,row)=>{

            if(err)
                return reject(err);

            resolve(row);

        });

    });

}

/*
==========================================
VENDAS POR HORA
==========================================
*/

export function obterHoras(){

    return new Promise((resolve,reject)=>{

        db.all(`

            SELECT

                hora_venda,

                ROUND(SUM(total_item),2) faturamento,

                COUNT(DISTINCT codigo_venda) pedidos,

                SUM(quantidade) itens

            FROM vw_vendas

            GROUP BY hora_venda

            ORDER BY hora_venda

        `,

        [],

        (err,rows)=>{

            if(err)
                return reject(err);

            resolve(rows);

        });

    });

}