import db, { dbLeitura } from "../config/database.js";

// =====================================================
// LISTAR METAS
// =====================================================

export function listarMetasVendedores(ano, mes, loja) {

    return new Promise((resolve, reject) => {

        let sql = `

            SELECT

                codigo_loja,

                codigo_vendedor,

                meta

            FROM metas_vendedores

            WHERE

                ano = ?

                AND mes = ?

        `;

        const params = [

            ano,
            mes

        ];

        if (loja !== "TODAS") {

            sql += `

                AND codigo_loja = ?

            `;

            params.push(loja);

        }

        dbLeitura.all(

            sql,

            params,

            (err, rows) => {

                if (err)
                    return reject(err);

                resolve(rows);

            }

        );

    });

}

// =====================================================
// SALVAR
// =====================================================

export function salvarMetaVendedor(meta) {

    return new Promise((resolve, reject) => {

        db.run(

            `

            INSERT INTO metas_vendedores(

                ano,

                mes,

                codigo_loja,

                codigo_vendedor,

                nome_vendedor,

                meta

            )

            VALUES(?,?,?,?,?,?)

            ON CONFLICT(

                ano,

                mes,

                codigo_loja,

                codigo_vendedor

            )

            DO UPDATE SET

                nome_vendedor=excluded.nome_vendedor,

                meta=excluded.meta

            `,

            [

                meta.ano,

                meta.mes,

                meta.codigo_loja,

                meta.codigo_vendedor,

                meta.nome_vendedor,

                meta.meta

            ],

            function(err){

                if(err)
                    return reject(err);

                resolve();

            }

        );

    });

}