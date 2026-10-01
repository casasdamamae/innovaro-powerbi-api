import type { Request, Response } from "express";
import { consultarVendas } from "../repositories/vendasRepository.js";
import { obterDashboard } from "../repositories/dashboardRepository.js";
import { obterVendasHora } from "../repositories/horaRepository.js";
import { obterLojas, listarLojas } from "../repositories/lojasRepository.js";
import { obterSetores } from "../repositories/setoresRepository.js";
import { obterProdutos } from "../repositories/produtosRepository.js";
import { obterFornecedores } from "../repositories/fornecedoresRepository.js";
import { listarVendedoresCatalogo } from "../catalogo/vendedoresCatalogo.js";
import { obterStatus } from "../repositories/statusRepository.js";
import {
  listarMetas,
  salvarMeta,
  salvarMetas,
} from "../repositories/metasRepository.js";
import {
  listarMetasVendedores,
  salvarMetaVendedor,
} from "../repositories/metasVendedoresRepository.js";

function mensagem(erro: unknown): string {
  return erro instanceof Error ? erro.message : "Erro interno";
}

function numeroNaoNegativo(valor: unknown) {
  const numero = Number(valor);
  return Number.isFinite(numero) && numero >= 0;
}

function validarPeriodoMeta(ano: unknown, mes: unknown): string | null {
  const anoNum = Number(ano);
  const mesNum = Number(mes);

  if (
    !Number.isInteger(anoNum) ||
    !Number.isInteger(mesNum) ||
    mesNum < 1 ||
    mesNum > 12
  ) {
    return "Ano e mês devem ser inteiros válidos.";
  }

  const hoje = new Date();
  const anoAtual = hoje.getFullYear();
  const mesAtual = hoje.getMonth() + 1;

  if (anoNum < anoAtual || (anoNum === anoAtual && mesNum < mesAtual)) {
    return "Não é permitido alterar metas de meses anteriores.";
  }

  return null;
}

function validarMetasMensais(metas: unknown): string | null {
  if (!Array.isArray(metas)) return "Dados de metas inválidos.";

  for (const item of metas) {
    const meta = item as {
      ano?: unknown;
      mes?: unknown;
      meta_mensal?: unknown;
      feriados?: unknown;
    };
    const periodo = validarPeriodoMeta(meta.ano, meta.mes);

    if (periodo) {
      return periodo;
    }

    const feriados = Number(meta.feriados);

    if (!numeroNaoNegativo(meta.meta_mensal)) {
      return "A meta mensal não pode ser negativa.";
    }

    if (!Number.isFinite(feriados) || feriados < 0 || !Number.isInteger(feriados)) {
      return "Feriados deve ser um inteiro maior ou igual a zero.";
    }
  }

  return null;
}

function validarMetasVendedores(metas: unknown): string | null {
  if (!Array.isArray(metas)) return "Dados de metas inválidos.";

  for (const item of metas) {
    const meta = item as { ano?: unknown; mes?: unknown; meta?: unknown };
    const periodo = validarPeriodoMeta(meta.ano, meta.mes);

    if (periodo) {
      return periodo;
    }

    if (!numeroNaoNegativo(meta.meta)) {
      return "A meta mensal não pode ser negativa.";
    }
  }

  return null;
}

function asString(value: unknown): string | undefined {
  if (typeof value === "string") return value;
  if (Array.isArray(value) && typeof value[0] === "string") return value[0];
  return undefined;
}

export async function listarVendas(req: Request, res: Response): Promise<void> {
  try {
    const filtros = {
      data: asString(req.query.data),
      loja: asString(req.query.loja),
      vendedor: asString(req.query.vendedor),
      produto: asString(req.query.produto),
      fornecedor: asString(req.query.fornecedor),
      secao: asString(req.query.secao),
      pagina: asString(req.query.pagina),
      limite: asString(req.query.limite),
    };

    const dados = await consultarVendas(filtros);

    res.json({
      sucesso: true,
      filtros,
      total: dados.length,
      dados,
    });
  } catch (erro) {
    res.status(500).json({ sucesso: false, erro: mensagem(erro) });
  }
}

export async function dashboard(_req: Request, res: Response): Promise<void> {
  try {
    const dados = await obterDashboard();
    res.status(200).json({ sucesso: true, dados });
  } catch (erro) {
    res.status(500).json({ sucesso: false, erro: mensagem(erro) });
  }
}

export async function vendasHora(_req: Request, res: Response): Promise<void> {
  try {
    const dados = await obterVendasHora();
    res.json({ sucesso: true, dados });
  } catch (erro) {
    res.status(500).json({ sucesso: false, erro: mensagem(erro) });
  }
}

export async function listarLojasDash(_req: Request, res: Response): Promise<void> {
  try {
    res.json(await listarLojas());
  } catch (erro) {
    res.status(500).json({ erro: mensagem(erro) });
  }
}

export async function rankingLojas(req: Request, res: Response): Promise<void> {
  try {
    const dados = await obterLojas(
      asString(req.query.inicio),
      asString(req.query.fim),
      asString(req.query.loja)
    );
    res.json(dados);
  } catch (erro) {
    res.status(500).json({ erro: mensagem(erro) });
  }
}

export async function setores(_req: Request, res: Response): Promise<void> {
  try {
    const dados = await obterSetores();
    res.json({ sucesso: true, dados });
  } catch (erro) {
    res.status(500).json({ sucesso: false, erro: mensagem(erro) });
  }
}

export async function produtos(_req: Request, res: Response): Promise<void> {
  try {
    const dados = await obterProdutos();
    res.json({ sucesso: true, dados });
  } catch (erro) {
    res.status(500).json({ sucesso: false, erro: mensagem(erro) });
  }
}

export async function fornecedores(_req: Request, res: Response): Promise<void> {
  try {
    const dados = await obterFornecedores();
    res.json({ sucesso: true, dados });
  } catch (erro) {
    res.status(500).json({ sucesso: false, erro: mensagem(erro) });
  }
}

export async function vendedores(req: Request, res: Response): Promise<void> {
  try {
    let loja = asString(req.query.loja) || "TODAS";

    if (req.usuario && req.usuario.nivel !== "ADMIN") {
      loja = req.usuario.loja;
    }

    const pagina = Number(asString(req.query.pagina));
    const limite = Number(asString(req.query.limite));

    res.json(
      listarVendedoresCatalogo({
        loja,
        pagina: Number.isFinite(pagina) ? pagina : undefined,
        limite: Number.isFinite(limite) ? limite : undefined,
      })
    );
  } catch (erro) {
    res.status(500).json({ erro: mensagem(erro) });
  }
}

export async function status(_req: Request, res: Response): Promise<void> {
  try {
    const dados = await obterStatus();
    res.json({
      sucesso: true,
      api: "ONLINE",
      horario: new Date(),
      dados,
    });
  } catch (erro) {
    res.status(500).json({ sucesso: false, erro: mensagem(erro) });
  }
}

export async function getMetas(req: Request, res: Response): Promise<void> {
  try {
    const hoje = new Date();
    const ano = Number(asString(req.query.ano) || hoje.getFullYear());
    const mes = Number(asString(req.query.mes) || hoje.getMonth() + 1);
    res.json(await listarMetas(ano, mes));
  } catch (erro) {
    res.status(500).json({ erro: mensagem(erro) });
  }
}

export async function postMeta(req: Request, res: Response): Promise<void> {
  try {
    const erroValidacao = validarMetasMensais([req.body]);

    if (erroValidacao) {
      res.status(400).json({ erro: erroValidacao });
      return;
    }

    await salvarMeta(req.body);
    res.json({ sucesso: true });
  } catch (erro) {
    res.status(500).json({ erro: mensagem(erro) });
  }
}

export async function postMetas(req: Request, res: Response): Promise<void> {
  try {
    const erroValidacao = validarMetasMensais(req.body);

    if (erroValidacao) {
      res.status(400).json({ erro: erroValidacao });
      return;
    }

    await salvarMetas(req.body);
    res.json({ sucesso: true });
  } catch (erro) {
    res.status(500).json({ erro: mensagem(erro) });
  }
}

export async function getMetasVendedores(
  req: Request,
  res: Response
): Promise<void> {
  try {
    const hoje = new Date();
    const ano = Number(asString(req.query.ano) || hoje.getFullYear());
    const mes = Number(asString(req.query.mes) || hoje.getMonth() + 1);
    const loja = asString(req.query.loja);

    if (!loja) {
      res.status(400).json({ erro: "Informe a loja." });
      return;
    }

    res.json(await listarMetasVendedores(ano, mes, loja));
  } catch (erro) {
    res.status(500).json({ erro: mensagem(erro) });
  }
}

export async function postMetasVendedores(
  req: Request,
  res: Response
): Promise<void> {
  try {
    const erroValidacao = validarMetasVendedores(req.body);

    if (erroValidacao) {
      res.status(400).json({ erro: erroValidacao });
      return;
    }

    const lista = req.body as unknown[];

    for (const meta of lista) {
      await salvarMetaVendedor(meta);
    }

    res.json({ sucesso: true });
  } catch (erro) {
    res.status(500).json({ erro: mensagem(erro) });
  }
}
