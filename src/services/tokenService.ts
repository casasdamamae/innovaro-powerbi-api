import jwt from "jsonwebtoken";
import crypto from "crypto";
import { env } from "../config/env.js";
import type { JwtPayload } from "../types/index.js";

export function gerarAccessToken(usuario: JwtPayload): string {
  return jwt.sign(usuario, env.jwtSecret, {
    expiresIn: "15m",
  });
}

export function gerarRefreshToken(): string {
  return crypto.randomUUID();
}

export function verificarAccessToken(token: string): JwtPayload {
  return jwt.verify(token, env.jwtSecret) as JwtPayload;
}
