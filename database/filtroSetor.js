export function montarFiltroSetor(setor) {

    if (!setor || setor === "TODOS") {

        return {

            sql: "",
            params: []

        };

    }

    return {

        sql: " AND codigo_subgrupo = ? ",

        params: [setor]

    };

}
