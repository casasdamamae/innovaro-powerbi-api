export type NivelUsuario = "ADMIN" | "CONSULTA";

export interface JwtPayload {
  id: number;
  usuario: string;
  nivel: NivelUsuario | string;
  loja: string;
}

export interface Usuario {
  id: number;
  usuario: string;
  senha: string;
  nivel: string;
  loja: string;
  ativo: number;
}

export interface UsuarioPublico {
  id: number;
  usuario: string;
  nivel: string;
  loja: string;
  ativo: number;
}

export interface PaginaUsuarios {
  dados: UsuarioPublico[];
  pagina: number;
  limite: number;
  total: number;
  totalPaginas: number;
}

export interface Vendedor {
  codigo_vendedor: number;
  nome_vendedor: string;
  lojas: number[];
}

export interface PaginaVendedores {
  dados: Vendedor[];
  pagina: number;
  limite: number;
  total: number;
  totalPaginas: number;
}

export interface AtualizarUsuarioInput {
  ativo?: number;
  senha?: string;
  loja?: string;
  nivel?: string;
}

export interface Venda {
  codigo_venda: number;
  codigo_produto: number;
  data_venda: string;
  hora_venda: number;
  numero_venda: string;
  codigo_loja: number;
  nome_loja: string;
  codigo_checkout: string;
  codigo_vendedor: number;
  nome_vendedor: string;
  codigo_supervisor: number;
  nome_supervisor: string;
  codigo_fornecedor: number;
  nome_fornecedor: string;
  codigo_grupo: number;
  nome_grupo: string;
  codigo_subgrupo: number;
  nome_subgrupo: string;
  codigo_secao: number;
  nome_secao: string;
  nome_produto: string;
  cfop: string;
  quantidade: number;
  unitario: number;
  desconto: number;
  acrescimo: number;
  impostos: number;
  custo_item: number;
  custo_total: number;
  total_item: number;
  chave_cfe: string;
}

export interface VendaComparativo {
  codigo_venda: number;
  codigo_produto: number;
  data_venda: string;
  hora_venda: number;
  numero_venda: string;
  codigo_loja: number;
  nome_loja: string;
  codigo_checkout: string;
  codigo_fornecedor: number;
  nome_fornecedor: string;
  codigo_grupo: number;
  nome_grupo: string;
  codigo_subgrupo: number;
  nome_subgrupo: string;
  codigo_secao: number;
  nome_secao: string;
  nome_produto: string;
  quantidade: number;
  unitario: number;
  desconto: number;
  acrescimo: number;
  impostos: number;
  custo_item: number;
  custo_total: number;
  total_item: number;
}

export interface MetricasPeriodo {
  faturamento: number;
  quantidade: number;
  pedidos: number;
  ticket_medio: number;
}

export interface PercentuaisComparativo {
  faturamento: number | null;
  quantidade: number | null;
  pedidos: number | null;
  ticket_medio: number | null;
}

export interface DesvioComparativo {
  vigente: MetricasPeriodo;
  anterior: MetricasPeriodo;
  percentual: PercentuaisComparativo;
}

export interface DesvioLoja extends DesvioComparativo {
  loja: string;
}

export interface DesvioDia extends DesvioComparativo {
  data_vigente: string;
  data_anterior: string;
}

export interface DesvioHora extends DesvioComparativo {
  hora: number;
}

export interface DesvioGrupo extends DesvioComparativo {
  codigo_grupo: number;
  nome_grupo: string;
}

export interface DesvioSecao extends DesvioComparativo {
  codigo_secao: number;
  nome_secao: string;
}

export interface DesvioFornecedor extends DesvioComparativo {
  codigo_fornecedor: number;
  nome_fornecedor: string;
}

export interface DesvioProduto extends DesvioComparativo {
  codigo_produto: number;
  nome_produto: string;
}

export interface DesviosComparativo {
  total: DesvioComparativo;
  por_loja: DesvioLoja[];
  por_dia: DesvioDia[];
  por_hora: DesvioHora[];
  por_grupo: DesvioGrupo[];
  por_secao: DesvioSecao[];
  por_fornecedor: DesvioFornecedor[];
  por_produto: DesvioProduto[];
}

export interface PeriodoComparativo {
  inicio: string;
  fim: string;
}

export type ModoComparativo = "dia" | "acumulado";

export interface ComparativoResponse {
  sucesso: true;
  modo: ModoComparativo;
  periodo: {
    vigente: PeriodoComparativo;
    anterior: PeriodoComparativo;
  };
  vigente: VendaComparativo[];
  anterior: VendaComparativo[];
  desvios: DesviosComparativo;
}

export interface EnvConfig {
  port: number;
  jwtSecret: string;
  baseUrl: string;
  token: string;
  redisUrl: string;
  dbPath?: string;
  corsOrigin: string | string[];
  adminPassword: string;
}
