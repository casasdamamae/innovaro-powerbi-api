import { LOJAS } from "./lojasConfig.js";

export function montarFiltroLoja(loja) {

    if (!loja || loja === "TODAS") {

        return {
            sql: "",
            params: []
        };

    }

    const codigos = LOJAS[loja];

    if (!codigos) {

        return {
            sql: "",
            params: []
        };

    }

    return {

        sql: ` AND codigo_loja IN (${codigos.map(() => "?").join(",")}) `,

        params: codigos

    };

}