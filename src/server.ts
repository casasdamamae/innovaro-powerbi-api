import { env } from "./config/env.js";
import { connectRedis } from "./config/redis.js";
import { criarTabelas } from "./config/schema.js";
import { recarregarCatalogo } from "./catalogo/vendedoresCatalogo.js";
import { sincronizar } from "./services/sincronizador.js";
import app from "./app.js";

const SYNC_INTERVAL_MS = 10 * 60 * 1000;
const SYNC_INITIAL_DELAY_MS = 30 * 1000;

let sincronizando = false;

async function executarSincronizacao(): Promise<void> {
  if (sincronizando) {
    console.log("⏳ Sincronização já em andamento.");
    return;
  }

  sincronizando = true;

  try {
    console.log("");
    console.log("======================================");
    console.log("🔄 SINCRONIZAÇÃO AUTOMÁTICA");
    console.log("======================================");

    await sincronizar();
    console.log("✅ Sincronização concluída.");
  } catch (erro) {
    console.error("❌ Erro:", erro);
  } finally {
    sincronizando = false;
  }
}

async function loopSincronizacao(): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, SYNC_INITIAL_DELAY_MS));

  while (true) {
    await executarSincronizacao();

    console.log("");
    console.log("⏰ Próxima sincronização em 10 minutos...");
    console.log("");

    await new Promise((resolve) => setTimeout(resolve, SYNC_INTERVAL_MS));
  }
}

async function bootstrap(): Promise<void> {
  await connectRedis();
  criarTabelas();
  await recarregarCatalogo();

  app.listen(env.port, () => {
    console.log("");
    console.log("======================================");
    console.log("🚀 Servidor iniciado");
    console.log(`🌐 Porta: ${env.port}`);
    console.log(`🏠 http://localhost:${env.port}`);
    console.log(`📊 http://localhost:${env.port}/resumo`);
    console.log("======================================");
    console.log("");

    void loopSincronizacao();
  });
}

bootstrap().catch((erro) => {
  console.error("Falha ao iniciar a API:", erro);
  process.exit(1);
});
