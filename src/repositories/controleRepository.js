import db from "../config/database.js";

export function obterUltimaData() {

    return new Promise((resolve, reject) => {

        db.get(
            "SELECT ultima_data FROM controle WHERE id = 1",
            [],
            (err, row) => {

                if (err) return reject(err);

                resolve(row ? row.ultima_data : null);

            }

        );

    });

}

export function salvarUltimaData(data) {

    return new Promise((resolve, reject) => {

        db.run(

            `
            INSERT INTO controle(id, ultima_data)
            VALUES (1, ?)

            ON CONFLICT(id)
            DO UPDATE SET ultima_data = excluded.ultima_data
            `,

            [data],

            function(err){

                if(err) return reject(err);

                resolve();

            }

        );

    });

}