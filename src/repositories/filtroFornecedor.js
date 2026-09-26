export function montarFiltroFornecedor(fornecedor) {

    if (!fornecedor || fornecedor === "TODOS") {

        return {

            sql: "",
            params: []

        };

    }

    return {

        sql: " AND codigo_fornecedor = ? ",

        params: [fornecedor]

    };

}