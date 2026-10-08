import { env } from "./config/env.js";
import { connectRedis } from "./config/redis.js";
import { criarTabelas } from "./config/schema.js";
import { recarregarCatalogo } from "./catalogo/vendedoresCatalogo.js";
import { sincronizar } from "./services/sincronizador.js";
import { diaJaSincronizado } from "./repositories/logRepository.js";
import app from "./app.js";

const SYNC_INTERVAL_MS = 10 * 60 * 1000;
const SYNC_INITIAL_DELAY_MS = 30 * 1000;
const MINUTO_MS = 60 * 1000;
const FUSO = "America/Sao_Paulo";
const HORA_SYNC_ANO_ANTERIOR = 6;
const DIAS_ANO_ANTERIOR = 364;

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

function hojeSaoPaulo(agora = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: FUSO,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(agora);
}

function horaSaoPaulo(agora = new Date()): number {
  const hora = new Intl.DateTimeFormat("en-US", {
    timeZone: FUSO,
    hour: "2-digit",
    hourCycle: "h23",
  })
    .formatToParts(agora)
    .find((parte) => parte.type === "hour")?.value;

  return Number(hora);
}

function somarDias(iso: string, dias: number): string {
  const [ano, mes, dia] = iso.split("-").map(Number);
  const data = new Date(Date.UTC(ano, mes - 1, dia));
  data.setUTCDate(data.getUTCDate() + dias);
  return data.toISOString().slice(0, 10);
}

function diaComparavel(agora = new Date()): string {
  return somarDias(hojeSaoPaulo(agora), -DIAS_ANO_ANTERIOR);
}

async function sincronizarAnoAnteriorSeDevido(agora = new Date()): Promise<void> {
  if (horaSaoPaulo(agora) < HORA_SYNC_ANO_ANTERIOR) return;

  const dia = diaComparavel(agora);
  if (await diaJaSincronizado(dia)) return;

  if (sincronizando) {
    console.log("⏳ Sync do ano anterior adiada: sincronização em andamento.");
    return;
  }

  sincronizando = true;

  try {
    console.log("");
    console.log("======================================");
    console.log(`🔄 SINCRONIZAÇÃO DO DIA COMPARÁVEL ${dia}`);
    console.log("======================================");

    await sincronizar(dia);
    console.log("✅ Sincronização do ano anterior concluída.");
  } catch (erro) {
    console.error("❌ Erro na sync do ano anterior:", erro);
  } finally {
    sincronizando = false;
  }
}

async function loopAnoAnterior(): Promise<void> {
  while (true) {
    try {
      await sincronizarAnoAnteriorSeDevido();
    } catch (erro) {
      console.error("❌ Erro ao verificar sync do ano anterior:", erro);
    }

    await new Promise((resolve) => setTimeout(resolve, MINUTO_MS));
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
    void loopAnoAnterior();
  });
}

bootstrap().catch((erro) => {
  console.error("Falha ao iniciar a API:", erro);
  process.exit(1);
});
