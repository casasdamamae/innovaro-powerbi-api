import { dbLeitura } from "../config/database.js";
import { LOJAS } from "../repositories/lojasConfig.js";
import type { PaginaVendedores, Vendedor } from "../types/index.js";

const LIMITE_PADRAO = 20;
const LIMITE_MAXIMO = 200;

interface LinhaCatalogo {
  codigo_vendedor: number;
  codigo_loja: number;
  nome_vendedor: string | null;
}

interface RegistroVendedor {
  codigo_vendedor: number;
  nomesPorLoja: Map<number, string>;
}

export interface FiltroCatalogoVendedores {
  loja?: string;
  pagina?: number;
  limite?: number;
}

let catalogo = new Map<number, RegistroVendedor>();
let cargaSeq = 0;

function consultarLinhas(): Promise<LinhaCatalogo[]> {
  return new Promise((resolve, reject) => {
    dbLeitura.all(
      `
      SELECT
        codigo_vendedor,
        codigo_loja,
        MAX(nome_vendedor) AS nome_vendedor
      FROM vendas
      GROUP BY
        codigo_vendedor,
        codigo_loja
      `,
      [],
      (err, rows: LinhaCatalogo[]) => {
        if (err) return reject(err);
        resolve(rows || []);
      }
    );
  });
}

function montarCatalogo(linhas: LinhaCatalogo[]): Map<number, RegistroVendedor> {
  const novo = new Map<number, RegistroVendedor>();

  for (const linha of linhas) {
    const codigo = Number(linha.codigo_vendedor);
    const codigoLoja = Number(linha.codigo_loja);
    const nome = linha.nome_vendedor || "";

    let registro = novo.get(codigo);
    if (!registro) {
      registro = { codigo_vendedor: codigo, nomesPorLoja: new Map() };
      novo.set(codigo, registro);
    }

    const nomeAtual = registro.nomesPorLoja.get(codigoLoja);
    if (nomeAtual === undefined || nome > nomeAtual) {
      registro.nomesPorLoja.set(codigoLoja, nome);
    }
  }

  return novo;
}

export async function recarregarCatalogo(): Promise<void> {
  const seq = ++cargaSeq;
  const linhas = await consultarLinhas();

  if (seq !== cargaSeq) {
    return;
  }

  catalogo = montarCatalogo(linhas);
  console.log(`Catálogo de vendedores: ${catalogo.size} vendedores.`);
}

function codigosDaLoja(loja: string | undefined): Set<number> | null {
  if (!loja || loja === "TODAS") {
    return null;
  }

  const codigos = LOJAS[loja as keyof typeof LOJAS];
  if (!codigos || codigos.length === 0) {
    return null;
  }

  return new Set(codigos);
}

function projetar(
  registro: RegistroVendedor,
  codigos: Set<number> | null
): Vendedor | null {
  const lojas: number[] = [];
  let nome = "";

  for (const [codigoLoja, nomeLoja] of registro.nomesPorLoja) {
    if (codigos && !codigos.has(codigoLoja)) {
      continue;
    }

    lojas.push(codigoLoja);
    if (nomeLoja > nome) {
      nome = nomeLoja;
    }
  }

  if (lojas.length === 0) {
    return null;
  }

  lojas.sort((a, b) => a - b);

  return {
    codigo_vendedor: registro.codigo_vendedor,
    nome_vendedor: nome,
    lojas,
  };
}

function normalizarPagina(pagina: number | undefined): number {
  if (pagina == null || !Number.isFinite(pagina)) {
    return 1;
  }

  return Math.max(1, Math.floor(pagina));
}

function normalizarLimite(limite: number | undefined): number {
  if (limite == null || !Number.isFinite(limite) || limite < 1) {
    return LIMITE_PADRAO;
  }

  return Math.min(LIMITE_MAXIMO, Math.floor(limite));
}

export function listarVendedoresCatalogo(
  filtro: FiltroCatalogoVendedores = {}
): PaginaVendedores {
  const pagina = normalizarPagina(filtro.pagina);
  const limite = normalizarLimite(filtro.limite);
  const codigos = codigosDaLoja(filtro.loja);

  const filtrados: Vendedor[] = [];
  for (const registro of catalogo.values()) {
    const vendedor = projetar(registro, codigos);
    if (vendedor) {
      filtrados.push(vendedor);
    }
  }

  filtrados.sort((a, b) => {
    const porNome = a.nome_vendedor.localeCompare(b.nome_vendedor, "pt-BR");
    if (porNome !== 0) {
      return porNome;
    }
    return a.codigo_vendedor - b.codigo_vendedor;
  });

  const total = filtrados.length;
  const totalPaginas = total === 0 ? 0 : Math.ceil(total / limite);
  const inicio = (pagina - 1) * limite;

  return {
    dados: filtrados.slice(inicio, inicio + limite),
    pagina,
    limite,
    total,
    totalPaginas,
  };
}
