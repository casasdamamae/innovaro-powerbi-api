import { sincronizar } from "./services/sincronizador.js";
import { connectRedis } from "./config/redis.js";
import { criarTabelas } from "./config/schema.js";

async function main(): Promise<void> {
  // Redis/schema não são estritamente necessários para sync, mas env valida no import
  await connectRedis().catch(() => {
    console.log("⚠ Redis indisponível — sync continua sem refresh tokens.");
  });
  criarTabelas();

  const data = process.argv[2] || null;

  try {
    await sincronizar(data);
  } catch (erro) {
    console.error(erro);
    process.exit(1);
  } finally {
    process.exit(0);
  }
}

void main();
