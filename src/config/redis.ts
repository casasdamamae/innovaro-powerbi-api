import { createClient, type RedisClientType } from "redis";
import { env } from "./env.js";

const redis: RedisClientType = createClient({
  url: env.redisUrl,
});

redis.on("error", (err) => {
  console.error("❌ Erro Redis:", err.message);
});

redis.on("connect", () => {
  console.log("✅ Redis conectado");
});

export async function connectRedis(): Promise<void> {
  if (redis.isOpen) {
    return;
  }

  try {
    await redis.connect();
  } catch (erro) {
    const mensagem = erro instanceof Error ? erro.message : String(erro);
    throw new Error(`Falha ao conectar no Redis: ${mensagem}`);
  }
}

export default redis;
