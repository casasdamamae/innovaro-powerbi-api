import type { Request, Response } from "express";
import { consultarVendas } from "../repositories/vendasRepository.js";
import { obterDashboard } from "../repositories/dashboardRepository.js";
import { obterVendasHora } from "../repositories/horaRepository.js";
import { obterLojas, listarLojas } from "../repositories/lojasRepository.js";
import { obterSetores } from "../repositories/setoresRepository.js";
import { obterProdutos } from "../repositories/produtosRepository.js";
import { obterFornecedores } from "../repositories/fornecedoresRepository.js";
import { listarVendedores } from "../repositories/vendedoresRepository.js";
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

    const dados = await listarVendedores(loja);
    res.json(dados);
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
    await salvarMeta(req.body);
    res.json({ sucesso: true });
  } catch (erro) {
    res.status(500).json({ erro: mensagem(erro) });
  }
}

export async function postMetas(req: Request, res: Response): Promise<void> {
  try {
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
    const lista = req.body as unknown[];

    for (const meta of lista) {
      await salvarMetaVendedor(meta);
    }

    res.json({ sucesso: true });
  } catch (erro) {
    res.status(500).json({ erro: mensagem(erro) });
  }
}
