import axios from "axios";
import { env } from "../config/env.js";
import type { Venda } from "../types/index.js";

function formatarData(data: string): string {
  const [ano, mes, dia] = data.split("-");
  return `${dia}-${mes}-${ano}`;
}

export interface ResultadoInnovaro {
  sucesso: boolean;
  vendas: Venda[];
  registros: number;
  tempo: number;
  mensagem: string;
  status?: number;
}

export async function buscarVendas(data: string): Promise<ResultadoInnovaro> {
  const dataFormatada = formatarData(data);
  const url = `${env.baseUrl}/vendas?ini=${dataFormatada}&fim=${dataFormatada}`;

  console.log("CONSULTANDO API INNOVARO — Data:", dataFormatada);

  const inicio = Date.now();

  try {
    const response = await axios.get(url, {
      headers: {
        Authorization: `Bearer ${env.token}`,
        Accept: "application/json",
      },
      timeout: 120000,
    });

    const tempo = Number(((Date.now() - inicio) / 1000).toFixed(1));
    const vendas = (response.data || []) as Venda[];

    console.log(`✅ API respondeu em ${tempo}s — ${vendas.length} registros`);

    return {
      sucesso: true,
      vendas,
      registros: vendas.length,
      tempo,
      mensagem: "OK",
    };
  } catch (erro: unknown) {
    const tempo = Number(((Date.now() - inicio) / 1000).toFixed(1));
    const ax = erro as {
      code?: string;
      message?: string;
      response?: { status: number; data: unknown };
    };

    if (ax.code === "ECONNABORTED") {
      return {
        sucesso: false,
        vendas: [],
        registros: 0,
        tempo,
        status: 408,
        mensagem: "Timeout ao consultar Innovaro",
      };
    }

    if (ax.response) {
      return {
        sucesso: false,
        vendas: [],
        registros: 0,
        tempo,
        status: ax.response.status,
        mensagem: JSON.stringify(ax.response.data),
      };
    }

    return {
      sucesso: false,
      vendas: [],
      registros: 0,
      tempo,
      status: 0,
      mensagem: ax.message || "Erro desconhecido",
    };
  }
}
