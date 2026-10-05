import { dbLeitura as db } from "../config/database.js";

function diasNoMes(ano, mes) {

    return new Date(ano, mes, 0).getDate();

}

function calcularDiasUteis(ano, mes, abreSabado, abreDomingo, feriados) {

    const totalDias = diasNoMes(ano, mes);

    let dias = 0;

    for (let d = 1; d <= totalDias; d++) {

        const data = new Date(ano, mes - 1, d);

        const semana = data.getDay();

        if (semana === 0 && !abreDomingo)
            continue;

        if (semana === 6 && !abreSabado)
            continue;

        dias++;

    }

    dias -= Number(feriados || 0);

    if (dias < 0)
        dias = 0;

    return dias;

}

function calcularDiasDecorridos(ano, mes, abreSabado, abreDomingo, feriados) {

    const hoje = new Date();

    let ultimoDia;

    if (

        hoje.getFullYear() === ano &&

        hoje.getMonth() + 1 === mes

    ) {

        ultimoDia = hoje.getDate();

    }

    else {

        ultimoDia = diasNoMes(ano, mes);

    }

    let dias = 0;

    for (let d = 1; d <= ultimoDia; d++) {

        const data = new Date(ano, mes - 1, d);

        const semana = data.getDay();

        if (semana === 0 && !abreDomingo)
            continue;

        if (semana === 6 && !abreSabado)
            continue;

        dias++;

    }

    dias -= Number(feriados || 0);

    if (dias < 0)
        dias = 0;

    return dias;

}

function calcularMeta(meta) {

    const diasUteis = calcularDiasUteis(

        meta.ano,

        meta.mes,

        meta.abre_sabado,

        meta.abre_domingo,

        meta.feriados

    );

    const diasDecorridos = calcularDiasDecorridos(

        meta.ano,

        meta.mes,

        meta.abre_sabado,

        meta.abre_domingo,

        meta.feriados

    );

    const metaDiaria =

        diasUteis > 0

            ? meta.meta_mensal / diasUteis

            : 0;

    return {

        ...meta,

        dias_uteis: diasUteis,

        dias_decorridos: diasDecorridos,

        meta_diaria: metaDiaria

    };

}

function buscarMetas(ano, mes) {

    return new Promise((resolve, reject) => {

        db.all(

            `

            SELECT

                loja,

                ano,

                mes,

                meta_mensal,

                abre_sabado,

                abre_domingo,

                feriados

            FROM metas

            WHERE

                ano = ?

                AND mes = ?

            ORDER BY loja

            `,

            [

                ano,

                mes

            ],

            (err, rows) => {

                if (err)
                    return reject(err);

                resolve(

                    rows.map(meta => ({

                        ...meta,

                        meta_mensal: Number(meta.meta_mensal),

                        abre_sabado: Number(meta.abre_sabado),

                        abre_domingo: Number(meta.abre_domingo),

                        feriados: Number(meta.feriados)

                    }))

                );

            }

        );

    });

}

export async function obterMetaDashboard(inicio, fim, loja) {

    const data = new Date(inicio);

    const ano = data.getFullYear();

    const mes = data.getMonth() + 1;

    const metas = await buscarMetas(ano, mes);

    if (!metas.length) {

        return {

            meta_mensal: 0,

            meta_diaria: 0,

            dias_uteis: 0,

            dias_decorridos: 0,

            meta_esperada: 0,

            faturamento: 0,

            atingimento: 0,

            faltante: 0,

            necessario_por_dia: 0

        };

    }

    // Continua na próxima parte...

        let resultado;

    // =====================================================
    // TODAS AS LOJAS
    // =====================================================

    if (loja === "TODAS") {

        resultado = {

            meta_mensal: 0,

            meta_diaria: 0,

            dias_uteis: 0,

            dias_decorridos: 0

        };

        for (const meta of metas) {

            const calculada = calcularMeta(meta);

            resultado.meta_mensal += calculada.meta_mensal;

            resultado.meta_diaria += calculada.meta_diaria;

            resultado.dias_uteis = Math.max(
                resultado.dias_uteis,
                calculada.dias_uteis
            );

            resultado.dias_decorridos = Math.max(
                resultado.dias_decorridos,
                calculada.dias_decorridos
            );

        }

    }

    // =====================================================
    // UMA LOJA
    // =====================================================

    else {

        const meta = metas.find(

            m => m.loja === loja

        );

        if (!meta) {

            return {

                meta_mensal: 0,

                meta_diaria: 0,

                dias_uteis: 0,

                dias_decorridos: 0,

                meta_esperada: 0,

                faturamento: 0,

                atingimento: 0,

                faltante: 0,

                necessario_por_dia: 0

            };

        }

        resultado = calcularMeta(meta);

    }

    // Continua na parte 4...

        resultado.meta_mensal = Number(resultado.meta_mensal.toFixed(2));

    resultado.meta_diaria = Number(resultado.meta_diaria.toFixed(2));

    resultado.meta_esperada = Number(

        (

            resultado.meta_diaria *

            resultado.dias_decorridos

        ).toFixed(2)

    );

    resultado.faturamento = 0;

    resultado.atingimento = 0;

    resultado.faltante = resultado.meta_mensal;

    resultado.necessario_por_dia = 0;

    return resultado;

}