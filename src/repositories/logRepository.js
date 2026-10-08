import db from "../config/database.js";

export function salvarLog(data, registros, tempo, status, mensagem = "") {

    return new Promise((resolve, reject) => {

        db.run(

            `
            INSERT INTO log_sincronizacao(

                data_hora,
                data_sincronizada,
                registros,
                tempo,
                status,
                mensagem

            )

            VALUES(?,?,?,?,?,?)
            `,

            [

                new Date().toISOString(),

                data,

                registros,

                tempo,

                status,

                mensagem

            ],

            function(err){

                if(err)
                    return reject(err);

                resolve();

            }

        );

    });

}

export function diaJaSincronizado(data) {

    return new Promise((resolve, reject) => {

        db.get(

            `
            SELECT 1 AS ok
            FROM log_sincronizacao
            WHERE data_sincronizada = ?
              AND status = 'OK'
            LIMIT 1
            `,

            [data],

            (err, row) => {

                if (err)
                    return reject(err);

                resolve(Boolean(row));

            }

        );

    });

}