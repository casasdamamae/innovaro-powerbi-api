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
