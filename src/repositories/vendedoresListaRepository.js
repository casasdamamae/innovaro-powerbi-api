import db from "../config/database.js";
import { montarFiltroLoja } from "./filtroLoja.js";

export function listarVendedores(loja) {

    return new Promise((resolve, reject) => {

        const filtro = montarFiltroLoja(loja);

        db.all(

            `

            SELECT

                codigo_vendedor,

                MAX(nome_vendedor) AS nome_vendedor

            FROM vendas

            WHERE 1=1

            ${filtro.sql}

            GROUP BY

                codigo_vendedor

            ORDER BY

                nome_vendedor

            `,

            [

                ...filtro.params

            ],

            (err, rows) => {

                if (err)
                    return reject(err);

                resolve(rows);

            }

        );

    });

}