import {
  agregarPeriodo,
  listarLinhasComparativo,
  type AgregadoFornecedor,
  type AgregadoGrupo,
  type AgregadoProduto,
  type AgregadoSecao,
  type AgregadosPeriodo,
} from "../repositories/comparativoRepository.js";
import type {
  ComparativoResponse,
  DesvioComparativo,
  DesvioFornecedor,
  DesvioGrupo,
  DesvioLoja,
  DesvioProduto,
  DesvioSecao,
  JwtPayload,
  MetricasPeriodo,
  ModoComparativo,
} from "../types/index.js";

const FUSO = "America/Sao_Paulo";
const DIAS_MESMO_DIA_SEMANA = 364;

const METRICAS_ZERADAS: MetricasPeriodo = {
  faturamento: 0,
  quantidade: 0,
  pedidos: 0,
  ticket_medio: 0,
};

export class ComparativoInvalido extends Error {
  constructor(mensagem: string) {
    super(mensagem);
    this.name = "ComparativoInvalido";
  }
}

export function hojeSaoPaulo(agora = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: FUSO,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(agora);
}

function dataCalendario(iso: string): { y: number; m: number; d: number } | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  if (!match) return null;

  const y = Number(match[1]);
  const m = Number(match[2]);
  const d = Number(match[3]);
  const data = new Date(Date.UTC(y, m - 1, d));

  if (
    data.getUTCFullYear() !== y ||
    data.getUTCMonth() !== m - 1 ||
    data.getUTCDate() !== d
  ) {
    return null;
  }

  return { y, m, d };
}

export function somarDias(iso: string, dias: number): string {
  const partes = dataCalendario(iso);
  if (!partes) {
    throw new ComparativoInvalido("Datas devem estar no formato YYYY-MM-DD.");
  }

  const data = new Date(Date.UTC(partes.y, partes.m - 1, partes.d));
  data.setUTCDate(data.getUTCDate() + dias);
  return data.toISOString().slice(0, 10);
}

function inicioDoMes(iso: string): string {
  const partes = dataCalendario(iso);
  if (!partes) {
    throw new ComparativoInvalido("Datas devem estar no formato YYYY-MM-DD.");
  }

  return `${partes.y}-${String(partes.m).padStart(2, "0")}-01`;
}

function listarDias(inicio: string, fim: string): string[] {
  const dias: string[] = [];
  let cursor = inicio;

  while (cursor <= fim) {
    dias.push(cursor);
    cursor = somarDias(cursor, 1);
  }

  return dias;
}

function resolverLoja(queryLoja: string | undefined, usuario: JwtPayload): string {
  let loja = queryLoja || "TODAS";

  if (usuario.nivel !== "ADMIN") {
    if (usuario.loja && usuario.loja !== "TODAS") {
      loja = usuario.loja;
    } else {
      loja = queryLoja || "TODAS";
    }
  }

  return loja;
}

export function resolverPeriodo(
  modo: string | undefined,
  inicioQuery: string | undefined,
  fimQuery: string | undefined,
  hoje = hojeSaoPaulo()
): { modo: ModoComparativo; inicio: string; fim: string } {
  if (modo !== "dia" && modo !== "acumulado") {
    throw new ComparativoInvalido("Informe modo=dia ou modo=acumulado.");
  }

  if (modo === "dia") {
    return { modo, inicio: hoje, fim: hoje };
  }

  let inicio: string;
  let fim: string;

  if (!inicioQuery && !fimQuery) {
    inicio = inicioDoMes(hoje);
    fim = hoje;
  } else if (inicioQuery && !fimQuery) {
    inicio = inicioQuery;
    fim = inicioQuery;
  } else if (!inicioQuery && fimQuery) {
    inicio = fimQuery;
    fim = fimQuery;
  } else {
    inicio = inicioQuery as string;
    fim = fimQuery as string;
  }

  if (!dataCalendario(inicio) || !dataCalendario(fim)) {
    throw new ComparativoInvalido("Datas devem estar no formato YYYY-MM-DD.");
  }

  const anoVigente = hoje.slice(0, 4);

  if (inicio.slice(0, 4) !== anoVigente || fim.slice(0, 4) !== anoVigente) {
    throw new ComparativoInvalido("O intervalo deve estar no ano vigente.");
  }

  if (inicio > fim) {
    throw new ComparativoInvalido("A data inicial não pode ser maior que a final.");
  }

  if (fim > hoje) {
    throw new ComparativoInvalido("A data final não pode ser futura.");
  }

  return { modo, inicio, fim };
}

function numero(valor: unknown): number {
  const n = Number(valor ?? 0);
  return Number.isFinite(n) ? n : 0;
}

function metricas(origem?: Partial<MetricasPeriodo> | null): MetricasPeriodo {
  if (!origem) return { ...METRICAS_ZERADAS };

  return {
    faturamento: numero(origem.faturamento),
    quantidade: numero(origem.quantidade),
    pedidos: numero(origem.pedidos),
    ticket_medio: numero(origem.ticket_medio),
  };
}

function percentual(vigente: number, anterior: number): number | null {
  if (anterior === 0) return null;
  return Number((((vigente - anterior) / anterior) * 100).toFixed(2));
}

function desvio(
  vigente: MetricasPeriodo,
  anterior: MetricasPeriodo
): DesvioComparativo {
  return {
    vigente,
    anterior,
    percentual: {
      faturamento: percentual(vigente.faturamento, anterior.faturamento),
      quantidade: percentual(vigente.quantidade, anterior.quantidade),
      pedidos: percentual(vigente.pedidos, anterior.pedidos),
      ticket_medio: percentual(vigente.ticket_medio, anterior.ticket_medio),
    },
  };
}

function texto(valor: unknown): string {
  return valor == null ? "" : String(valor);
}

function parearLojas(vigente: AgregadosPeriodo, anterior: AgregadosPeriodo): DesvioLoja[] {
  const mapaVigente = new Map(
    vigente.por_loja.map((item) => [texto(item.loja), metricas(item)])
  );
  const mapaAnterior = new Map(
    anterior.por_loja.map((item) => [texto(item.loja), metricas(item)])
  );
  const nomes = new Set([...mapaVigente.keys(), ...mapaAnterior.keys()]);

  // #region agent log
  fetch("http://127.0.0.1:7309/ingest/575c6c50-3882-403b-b545-8aa6d2cf06b7", {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-Debug-Session-Id": "ddd25e" },
    body: JSON.stringify({
      sessionId: "ddd25e",
      hypothesisId: "C",
      location: "comparativoService.ts:parearLojas",
      message: "nomes pareados no desvio por loja",
      data: {
        vigentes: [...mapaVigente.keys()],
        anteriores: [...mapaAnterior.keys()],
      },
      timestamp: Date.now(),
    }),
  }).catch(() => {});
  // #endregion

  return [...nomes]
    .map((loja) => ({
      loja,
      ...desvio(
        mapaVigente.get(loja) ?? { ...METRICAS_ZERADAS },
        mapaAnterior.get(loja) ?? { ...METRICAS_ZERADAS }
      ),
    }))
    .sort((a, b) => b.vigente.faturamento - a.vigente.faturamento);
}

function parearDias(inicio: string, fim: string, vigente: AgregadosPeriodo, anterior: AgregadosPeriodo) {
  const mapaVigente = new Map(
    vigente.por_dia.map((item) => [item.data_venda, metricas(item)])
  );
  const mapaAnterior = new Map(
    anterior.por_dia.map((item) => [item.data_venda, metricas(item)])
  );

  return listarDias(inicio, fim).map((dataVigente) => {
    const dataAnterior = somarDias(dataVigente, -DIAS_MESMO_DIA_SEMANA);

    return {
      data_vigente: dataVigente,
      data_anterior: dataAnterior,
      ...desvio(
        mapaVigente.get(dataVigente) ?? { ...METRICAS_ZERADAS },
        mapaAnterior.get(dataAnterior) ?? { ...METRICAS_ZERADAS }
      ),
    };
  });
}

function parearHoras(vigente: AgregadosPeriodo, anterior: AgregadosPeriodo) {
  const mapaVigente = new Map(
    vigente.por_hora.map((item) => [numero(item.hora), metricas(item)])
  );
  const mapaAnterior = new Map(
    anterior.por_hora.map((item) => [numero(item.hora), metricas(item)])
  );
  const horas = [...new Set([...mapaVigente.keys(), ...mapaAnterior.keys()])].sort(
    (a, b) => a - b
  );

  return horas.map((hora) => ({
    hora,
    ...desvio(
      mapaVigente.get(hora) ?? { ...METRICAS_ZERADAS },
      mapaAnterior.get(hora) ?? { ...METRICAS_ZERADAS }
    ),
  }));
}

function parearCodigoNome<T extends MetricasPeriodo>(
  vigentes: T[],
  anteriores: T[],
  codigoDe: (item: T) => number,
  nomeDe: (item: T) => string
): Array<{ codigo: number; nome: string } & DesvioComparativo> {
  const mapaVigente = new Map(vigentes.map((item) => [codigoDe(item), item]));
  const mapaAnterior = new Map(anteriores.map((item) => [codigoDe(item), item]));
  const codigos = new Set([...mapaVigente.keys(), ...mapaAnterior.keys()]);

  return [...codigos]
    .map((codigo) => {
      const itemVigente = mapaVigente.get(codigo);
      const itemAnterior = mapaAnterior.get(codigo);
      const nome = itemVigente
        ? nomeDe(itemVigente)
        : itemAnterior
          ? nomeDe(itemAnterior)
          : "";

      return {
        codigo,
        nome,
        ...desvio(metricas(itemVigente), metricas(itemAnterior)),
      };
    })
    .sort((a, b) => b.vigente.faturamento - a.vigente.faturamento);
}

function parearGrupos(vigente: AgregadosPeriodo, anterior: AgregadosPeriodo): DesvioGrupo[] {
  return parearCodigoNome(
    vigente.por_grupo,
    anterior.por_grupo,
    (item: AgregadoGrupo) => numero(item.codigo_grupo),
    (item: AgregadoGrupo) => texto(item.nome_grupo)
  ).map(({ codigo, nome, ...resto }) => ({
    codigo_grupo: codigo,
    nome_grupo: nome,
    ...resto,
  }));
}

function parearSecoes(vigente: AgregadosPeriodo, anterior: AgregadosPeriodo): DesvioSecao[] {
  return parearCodigoNome(
    vigente.por_secao,
    anterior.por_secao,
    (item: AgregadoSecao) => numero(item.codigo_secao),
    (item: AgregadoSecao) => texto(item.nome_secao)
  ).map(({ codigo, nome, ...resto }) => ({
    codigo_secao: codigo,
    nome_secao: nome,
    ...resto,
  }));
}

function parearFornecedores(
  vigente: AgregadosPeriodo,
  anterior: AgregadosPeriodo
): DesvioFornecedor[] {
  return parearCodigoNome(
    vigente.por_fornecedor,
    anterior.por_fornecedor,
    (item: AgregadoFornecedor) => numero(item.codigo_fornecedor),
    (item: AgregadoFornecedor) => texto(item.nome_fornecedor)
  ).map(({ codigo, nome, ...resto }) => ({
    codigo_fornecedor: codigo,
    nome_fornecedor: nome,
    ...resto,
  }));
}

function parearProdutos(
  vigente: AgregadosPeriodo,
  anterior: AgregadosPeriodo
): DesvioProduto[] {
  return parearCodigoNome(
    vigente.por_produto,
    anterior.por_produto,
    (item: AgregadoProduto) => numero(item.codigo_produto),
    (item: AgregadoProduto) => texto(item.nome_produto)
  ).map(({ codigo, nome, ...resto }) => ({
    codigo_produto: codigo,
    nome_produto: nome,
    ...resto,
  }));
}

export async function montarComparativo(
  entrada: {
    modo?: string;
    inicio?: string;
    fim?: string;
    loja?: string;
  },
  usuario: JwtPayload
): Promise<ComparativoResponse> {
  const periodo = resolverPeriodo(entrada.modo, entrada.inicio, entrada.fim);
  const loja = resolverLoja(entrada.loja, usuario);
  const inicioAnterior = somarDias(periodo.inicio, -DIAS_MESMO_DIA_SEMANA);
  const fimAnterior = somarDias(periodo.fim, -DIAS_MESMO_DIA_SEMANA);

  const [linhasVigente, linhasAnterior, agregadoVigente, agregadoAnterior] =
    await Promise.all([
      listarLinhasComparativo(periodo.inicio, periodo.fim, loja),
      listarLinhasComparativo(inicioAnterior, fimAnterior, loja),
      agregarPeriodo(periodo.inicio, periodo.fim, loja),
      agregarPeriodo(inicioAnterior, fimAnterior, loja),
    ]);

  return {
    sucesso: true,
    modo: periodo.modo,
    periodo: {
      vigente: { inicio: periodo.inicio, fim: periodo.fim },
      anterior: { inicio: inicioAnterior, fim: fimAnterior },
    },
    vigente: linhasVigente,
    anterior: linhasAnterior,
    desvios: {
      total: desvio(metricas(agregadoVigente.total), metricas(agregadoAnterior.total)),
      por_loja: parearLojas(agregadoVigente, agregadoAnterior),
      por_dia: parearDias(periodo.inicio, periodo.fim, agregadoVigente, agregadoAnterior),
      por_hora: parearHoras(agregadoVigente, agregadoAnterior),
      por_grupo: parearGrupos(agregadoVigente, agregadoAnterior),
      por_secao: parearSecoes(agregadoVigente, agregadoAnterior),
      por_fornecedor: parearFornecedores(agregadoVigente, agregadoAnterior),
      por_produto: parearProdutos(agregadoVigente, agregadoAnterior),
    },
  };
}
