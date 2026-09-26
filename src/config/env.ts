import dotenv from "dotenv";
import type { EnvConfig } from "../types/index.js";

dotenv.config();

function required(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Variável de ambiente obrigatória ausente: ${name}`);
  }
  return value;
}

function parseCorsOrigin(raw: string | undefined): string | string[] {
  if (!raw || raw.trim() === "" || raw.trim() === "*") {
    return "*";
  }
  const parts = raw.split(",").map((s) => s.trim()).filter(Boolean);
  return parts.length === 1 ? parts[0] : parts;
}

export const env: EnvConfig = {
  port: Number(process.env.PORT || 3000),
  jwtSecret: required("JWT_SECRET"),
  baseUrl: required("BASE_URL"),
  token: required("TOKEN"),
  redisUrl: required("REDIS_URL"),
  dbPath: process.env.DB_PATH,
  corsOrigin: parseCorsOrigin(process.env.CORS_ORIGIN),
  adminPassword: process.env.ADMIN_PASSWORD || "admin123",
};

export default env;
