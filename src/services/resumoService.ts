import {
  obterDashboard,
} from "../repositories/dashboardRepository.js";
import { obterVendasHora } from "../repositories/horaRepository.js";
import { obterLojas, listarLojas } from "../repositories/lojasRepository.js";
import { obterSetores, listarSetores } from "../repositories/setoresRepository.js";
import { obterVendedores } from "../repositories/vendedoresRepository.js";
import { obterProdutos } from "../repositories/produtosRepository.js";
import {
  obterFornecedores,
  listarFornecedores,
} from "../repositories/fornecedoresRepository.js";
import { obterCnpjs } from "../repositories/cnpjRepository.js";
import { obterProdutosQuantidade } from "../repositories/produtosQuantidadeRepository.js";
import { obterMetaDashboard } from "../repositories/metaDashboardRepository.js";
import { listarMetasVendedores } from "../repositories/metasVendedoresRepository.js";
import type { JwtPayload } from "../types/index.js";

export interface ResumoFiltros {
  inicio?: string;
  fim?: string;
  loja?: string;
  fornecedor?: string;
  setor?: string;
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

export async function obterResumoCompleto(
  filtros: ResumoFiltros,
  usuario: JwtPayload
) {
  const hoje = new Date().toISOString().slice(0, 10);
  const inicio = filtros.inicio || hoje;
  const fim = filtros.fim || hoje;
  const data = new Date(inicio);
  const ano = data.getFullYear();
  const mes = data.getMonth() + 1;
  const inicioMes = `${ano}-${String(mes).padStart(2, "0")}-01`;

  let fimMeta = fim;
  const hojeData = new Date();

  if (hojeData.getFullYear() === ano && hojeData.getMonth() + 1 === mes) {
    fimMeta = hojeData.toISOString().slice(0, 10);
  }

  const loja = resolverLoja(filtros.loja, usuario);
  const fornecedor = filtros.fornecedor || "TODOS";
  const setor = filtros.setor || "TODOS";

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
  ] = await Promise.all([
    obterDashboard(inicio, fim, loja, fornecedor, setor),
    obterMetaDashboard(inicio, fim, loja),
    obterVendasHora(inicio, fim, loja, fornecedor, setor),
    obterLojas(inicio, fim, loja, fornecedor, setor),
    obterCnpjs(inicio, fim),
    obterSetores(inicio, fim, loja, fornecedor, setor),
    obterVendedores(inicio, fim, loja, fornecedor, setor),
    obterProdutos(inicio, fim, loja, fornecedor, setor),
    obterProdutosQuantidade(inicio, fim, loja, fornecedor, setor),
    obterFornecedores(inicio, fim, loja, fornecedor, setor),
  ]);

  const dashboardMeta = await obterDashboard(
    inicioMes,
    fimMeta,
    loja,
    fornecedor,
    setor
  );

  const metasVendedores = await listarMetasVendedores(ano, mes, loja);

  const vendedoresComMeta = (vendedores as Array<Record<string, unknown>>).map(
    (vendedor) => {
      const meta = (metasVendedores as Array<Record<string, unknown>>).find(
        (m) => Number(m.codigo_vendedor) === Number(vendedor.codigo_vendedor)
      );

      const valorMeta = Number(meta?.meta || 0);
      const percentual =
        valorMeta > 0
          ? Number(
              ((Number(vendedor.faturamento) * 100) / valorMeta).toFixed(2)
            )
          : 0;

      return {
        ...vendedor,
        meta: valorMeta,
        percentual_meta: percentual,
      };
    }
  );

  const md = metaDashboard as Record<string, number> & { status?: string };
  const faturamento = Number(
    (dashboardMeta as { faturamento?: number }).faturamento || 0
  );

  md.faturamento = faturamento;
  md.atingimento =
    md.meta_mensal > 0
      ? Number(((faturamento * 100) / md.meta_mensal).toFixed(2))
      : 0;
  md.faltante = Number(Math.max(0, md.meta_mensal - faturamento).toFixed(2));

  const diasRestantes = Math.max(1, md.dias_uteis - md.dias_decorridos);
  md.necessario_por_dia = Number((md.faltante / diasRestantes).toFixed(2));

  if (md.atingimento >= 100) {
    md.status = "ACIMA_META";
  } else if (md.meta_esperada > 0 && md.faturamento >= md.meta_esperada) {
    md.status = "NO_RITMO";
  } else {
    md.status = "ABAIXO_META";
  }

  return {
    sucesso: true,
    atualizado: new Date(),
    periodo: { inicio, fim },
    dashboard,
    metaDashboard: md,
    horas,
    lojas,
    cnpjs,
    setores,
    vendedores: vendedoresComMeta,
    produtos,
    produtosQuantidade,
    fornecedores,
    status: null,
  };
}

export async function listarFiltroLojas() {
  return listarLojas();
}

export async function listarFiltroFornecedores() {
  return listarFornecedores();
}

export async function listarFiltroSetores() {
  return listarSetores();
}
