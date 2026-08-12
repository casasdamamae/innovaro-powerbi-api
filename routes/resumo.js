import express from "express";

import { obterDashboard } from "../database/dashboardRepository.js";
import { obterVendasHora } from "../database/horaRepository.js";
import { obterLojas, listarLojas } from "../database/lojasRepository.js";
import { obterSetores, listarSetores } from "../database/setoresRepository.js";
import { obterVendedores } from "../database/vendedoresRepository.js";
import { obterProdutos } from "../database/produtosRepository.js";
import {
    obterFornecedores,
    listarFornecedores
} from "../database/fornecedoresRepository.js";
import { obterStatus } from "../database/statusRepository.js";
import { obterCnpjs } from "../database/cnpjRepository.js";
import { obterProdutosQuantidade } from "../database/produtosQuantidadeRepository.js";
import { obterMetaDashboard } from "../database/metaDashboardRepository.js";
import { listarMetasVendedores } from "../database/metasVendedoresRepository.js";

import auth from "../middleware/auth.js";

const router = express.Router();

router.get("/", auth, async (req, res) => {

    try {

        const hoje = new Date().toISOString().slice(0, 10);

        const inicio = req.query.inicio || hoje;
        const fim = req.query.fim || hoje;
        const data = new Date(inicio);

const ano = data.getFullYear();

const mes = data.getMonth() + 1;

const inicioMes = `${ano}-${String(mes).padStart(2, "0")}-01`;

let fimMeta = fim;

const hojeData = new Date();

if (

    hojeData.getFullYear() === ano &&

    hojeData.getMonth() + 1 === mes

) {

    fimMeta = hojeData.toISOString().slice(0,10);

}
        let loja = req.query.loja || "TODAS";
        const fornecedor = req.query.fornecedor || "TODOS";
        const setor = req.query.setor || "TODOS";

        if (req.usuario.nivel !== "ADMIN") {

    // Se o usuário consulta tem uma loja específica
    if (req.usuario.loja && req.usuario.loja !== "TODAS") {
        // Filtro não funciona → força a loja do usuário
        loja = req.usuario.loja;
    }

    // Se o usuário consulta pode ver todas as lojas
    else {
        // Filtro funciona → usa o valor enviado pelo front-end
        loja = req.query.loja || "TODAS";
    }
}



        const [

            dashboard,
            metaDashboard,
            horas,
            lojas,
            cnpjs,
            setores,
            vendedores,
            produtos,
            produtosQuantidade,
            fornecedores,
            status

        ] = await Promise.all([


            obterDashboard(inicio, fim, loja, fornecedor, setor),
            obterMetaDashboard(

               inicio,
               fim,
               loja

            ),
            obterVendasHora(inicio, fim, loja, fornecedor, setor),
            obterLojas(inicio, fim, loja, fornecedor, setor),
            obterCnpjs(inicio, fim, loja, fornecedor),
            obterSetores(inicio, fim, loja, fornecedor, setor),
            obterVendedores(inicio, fim, loja, fornecedor, setor),
            obterProdutos(inicio, fim, loja, fornecedor, setor),
            obterProdutosQuantidade(inicio, fim, loja, fornecedor, setor),
            obterFornecedores(inicio, fim, loja, fornecedor, setor),
            obterStatus()

        ]);

        const dashboardMeta = await obterDashboard(

    inicioMes,

    fimMeta,

    loja,

    fornecedor,

    setor

);

console.log({
    ano,
    mes,
    loja
});

const metasVendedores = await listarMetasVendedores(

    ano,

    mes,

    loja

);

console.log("METAS:", metasVendedores);

const vendedoresComMeta = vendedores.map((vendedor) => {

    const meta = metasVendedores.find(

        m => Number(m.codigo_vendedor) === Number(vendedor.codigo_vendedor)

    );

    const valorMeta = Number(meta?.meta || 0);

    const percentual =

        valorMeta > 0

            ? Number(

                (

                    Number(vendedor.faturamento) * 100 /

                    valorMeta

                ).toFixed(2)

            )

            : 0;

    return {

        ...vendedor,

        meta: valorMeta,

        percentual_meta: percentual

    };

});

        const faturamento = Number(

    dashboardMeta.faturamento || 0

);

metaDashboard.faturamento = faturamento;

metaDashboard.atingimento =

    metaDashboard.meta_mensal > 0

        ? Number(

            (

                faturamento * 100 /

                metaDashboard.meta_mensal

            ).toFixed(2)

        )

        : 0;

metaDashboard.faltante = Number(

    Math.max(

        0,

        metaDashboard.meta_mensal - faturamento

    ).toFixed(2)

);

const diasRestantes = Math.max(

    1,

    metaDashboard.dias_uteis -

    metaDashboard.dias_decorridos

);

metaDashboard.necessario_por_dia = Number(

    (

        metaDashboard.faltante /

        diasRestantes

    ).toFixed(2)

);

// =====================================================
// STATUS DA META
// =====================================================

if (metaDashboard.atingimento >= 100) {

    metaDashboard.status = "ACIMA_META";

} else if (metaDashboard.meta_esperada > 0 &&
           metaDashboard.faturamento >= metaDashboard.meta_esperada) {

    metaDashboard.status = "NO_RITMO";

} else {

    metaDashboard.status = "ABAIXO_META";

}


        res.json({

            sucesso: true,

            atualizado: new Date(),

            periodo: {
                inicio,
                fim
            },

            dashboard,
            metaDashboard,
            horas,
            lojas,
            cnpjs,
            setores,
            vendedores: vendedoresComMeta,
            produtos,
            produtosQuantidade,
            fornecedores,
            status

        });

    } catch (erro) {

        console.error(erro);

        res.status(500).json({

            sucesso: false,
            erro: erro.message

        });

    }

});

router.get("/lojas", auth, async (req, res) => {

    try {

        const lojas = await listarLojas();

        res.json(lojas);

    } catch (erro) {

        res.status(500).json({

            erro: erro.message

        });

    }

});

router.get("/fornecedores", auth, async (req, res) => {

    try {

        const fornecedores = await listarFornecedores();

        res.json(fornecedores);

    } catch (erro) {

        res.status(500).json({

            erro: erro.message

        });

    }

});

router.get("/setores", auth, async (req, res) => {

    try {

        const setores = await listarSetores();

        res.json(setores);

    } catch (erro) {

        res.status(500).json({

            erro: erro.message

        });

    }

});

export default router;