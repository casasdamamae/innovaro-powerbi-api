import db from "../config/database.js";

export function listarMetas(ano, mes) {

    return new Promise((resolve, reject) => {

        db.all(

            `
            SELECT *
            FROM metas
            WHERE ano = ?
              AND mes = ?
            ORDER BY loja
            `,

            [ano, mes],

            (err, rows) => {

                if (err)
                    return reject(err);

                resolve(rows);

            }

        );

    });

}

export function salvarMeta(meta) {

    return new Promise((resolve, reject) => {

        db.run(

            `
            INSERT INTO metas (

                loja,
                ano,
                mes,
                meta_mensal,
                abre_sabado,
                abre_domingo,
                feriados

            )

            VALUES (?,?,?,?,?,?,?)

            ON CONFLICT(loja,ano,mes)

            DO UPDATE SET

                meta_mensal = excluded.meta_mensal,
                abre_sabado = excluded.abre_sabado,
                abre_domingo = excluded.abre_domingo,
                feriados = excluded.feriados
            `,

            [

                meta.loja,
                meta.ano,
                meta.mes,
                meta.meta_mensal,
                meta.abre_sabado,
                meta.abre_domingo,
                meta.feriados

            ],

            function (err) {

                if (err)
                    return reject(err);

                resolve();

            }

        );

    });

}

export function salvarMetas(metas) {

    return new Promise((resolve, reject) => {

        db.serialize(() => {

            db.run("BEGIN TRANSACTION");

            const stmt = db.prepare(`

                INSERT INTO metas (

                    loja,
                    ano,
                    mes,
                    meta_mensal,
                    abre_sabado,
                    abre_domingo,
                    feriados

                )

                VALUES (?,?,?,?,?,?,?)

                ON CONFLICT(loja,ano,mes)

                DO UPDATE SET

                    meta_mensal = excluded.meta_mensal,
                    abre_sabado = excluded.abre_sabado,
                    abre_domingo = excluded.abre_domingo,
                    feriados = excluded.feriados

            `);

            for (const meta of metas) {

                stmt.run([

                    meta.loja,
                    meta.ano,
                    meta.mes,
                    meta.meta_mensal,
                    meta.abre_sabado,
                    meta.abre_domingo,
                    meta.feriados

                ]);

            }

            stmt.finalize((err) => {

                if (err)
                    return reject(err);

                db.run("COMMIT", (err) => {

                    if (err)
                        return reject(err);

                    resolve();

                });

            });

        });

    });

}