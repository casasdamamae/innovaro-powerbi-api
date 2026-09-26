import {
  buscarUsuario,
  verificarSenha,
  migrarSenhaSeNecessario,
} from "../repositories/usuariosRepository.js";
import { gerarAccessToken, gerarRefreshToken } from "./tokenService.js";
import redis from "../config/redis.js";
import type { JwtPayload } from "../types/index.js";

const REFRESH_TTL_SECONDS = 60 * 60 * 24 * 7;

export async function login(usuario: string, senha: string) {
  if (!usuario || !senha) {
    const error = new Error("Informe usuário e senha.") as Error & {
      status: number;
    };
    error.status = 400;
    throw error;
  }

  const dados = await buscarUsuario(usuario);

  if (!dados) {
    const error = new Error("Usuário ou senha inválidos.") as Error & {
      status: number;
    };
    error.status = 401;
    throw error;
  }

  if (dados.ativo !== 1) {
    const error = new Error("Usuário desativado.") as Error & { status: number };
    error.status = 403;
    throw error;
  }

  const senhaOk = await verificarSenha(senha, dados.senha);

  if (!senhaOk) {
    const error = new Error("Usuário ou senha inválidos.") as Error & {
      status: number;
    };
    error.status = 401;
    throw error;
  }

  await migrarSenhaSeNecessario(dados.id, senha, dados.senha);

  const payload: JwtPayload = {
    id: dados.id,
    usuario: dados.usuario,
    nivel: dados.nivel,
    loja: dados.loja,
  };

  const accessToken = gerarAccessToken(payload);
  const refreshToken = gerarRefreshToken();

  await redis.set(`refresh:${refreshToken}`, JSON.stringify(payload), {
    EX: REFRESH_TTL_SECONDS,
  });

  return {
    sucesso: true,
    accessToken,
    refreshToken,
    usuario: payload,
  };
}

export async function refresh(refreshToken: string) {
  if (!refreshToken) {
    const error = new Error("Refresh Token não informado.") as Error & {
      status: number;
    };
    error.status = 400;
    throw error;
  }

  const dados = await redis.get(`refresh:${refreshToken}`);

  if (!dados) {
    const error = new Error("Refresh Token inválido ou expirado.") as Error & {
      status: number;
    };
    error.status = 401;
    throw error;
  }

  const usuario = JSON.parse(dados) as JwtPayload;

  // Rotação: invalida o refresh usado e emite um novo
  await redis.del(`refresh:${refreshToken}`);

  const novoRefresh = gerarRefreshToken();
  await redis.set(`refresh:${novoRefresh}`, JSON.stringify(usuario), {
    EX: REFRESH_TTL_SECONDS,
  });

  const accessToken = gerarAccessToken(usuario);

  return {
    sucesso: true,
    accessToken,
    refreshToken: novoRefresh,
  };
}
