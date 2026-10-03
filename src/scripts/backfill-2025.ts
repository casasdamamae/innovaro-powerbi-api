import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";
import { listarDias } from "./lib/datas.js";
import { buscarVendasDia, ErpErro, InterrompidoErro } from "./lib/erp-client.js";
import {
  abrirBanco,
  configurarBanco,
  criarTabelaProgresso,
  diaConcluido,
  fecharBanco,
  gravarDia,
} from "./lib/vendas-repo.js";
import type sqlite3 from "sqlite3";

const MAX_TENTATIVAS = 3;
const LOCK_PATH = "/tmp/backfill.lock";

interface Opcoes {
  inicio: string;
  fim: string;
  dryRun: boolean;
  forcar: boolean;
  timeoutMs: number;
  pausaMs: number;
}

function exigirEnv(nome: string): string {
  const valor = process.env[nome];
  if (!valor) {
    throw new Error(`Variável de ambiente obrigatória ausente: ${nome}`);
  }
  return valor;
}

function uso(): string {
  return "Uso: node dist/scripts/backfill-2025.js [--inicio=YYYY-MM-DD] [--fim=YYYY-MM-DD] [--dry-run] [--forcar] [--timeout-min=N] [--pausa-ms=N]";
}

function lerOpcoes(argv: string[]): Opcoes {
  const opcoes: Opcoes = {
    inicio: "2025-01-01",
    fim: "2026-05-03",
    dryRun: false,
    forcar: false,
    timeoutMs: 10 * 60 * 1000,
    pausaMs: 500,
  };

  for (const arg of argv) {
    if (arg === "--dry-run") {
      opcoes.dryRun = true;
      continue;
    }
    if (arg === "--forcar") {
      opcoes.forcar = true;
      continue;
    }

    const [chave, valor] = arg.split("=", 2);
    if (!chave.startsWith("--") || valor === undefined || valor === "") {
      throw new Error(uso());
    }

    if (chave === "--inicio") {
      opcoes.inicio = valor;
    } else if (chave === "--fim") {
      opcoes.fim = valor;
    } else if (chave === "--timeout-min") {
      const minutos = Number(valor);
      if (!Number.isFinite(minutos) || minutos <= 0) {
        throw new Error("--timeout-min deve ser um número maior que zero.");
      }
      opcoes.timeoutMs = minutos * 60 * 1000;
    } else if (chave === "--pausa-ms") {
      const pausa = Number(valor);
      if (!Number.isInteger(pausa) || pausa < 0) {
        throw new Error("--pausa-ms deve ser um inteiro maior ou igual a zero.");
      }
      opcoes.pausaMs = pausa;
    } else {
      throw new Error(uso());
    }
  }

  return opcoes;
}

function carimbo(): string {
  return new Date().toISOString().replace(/\.\d{3}Z$/, "Z");
}

function log(nivel: "OK" | "RETRY" | "SKIP" | "DRY" | "ERRO", dia: string, detalhe: string): void {
  const tag = {
    OK: "[OK]   ",
    RETRY: "[RETRY]",
    SKIP: "[SKIP] ",
    DRY: "[DRY]  ",
    ERRO: "[ERRO] ",
  }[nivel];

  console.log(`${carimbo()} ${tag} ${dia}  ${detalhe}`);
}

function mensagemErro(erro: unknown): string {
  if (erro instanceof ErpErro) return erro.message;
  if (erro instanceof Error) return erro.message.slice(0, 200);
  return "erro desconhecido";
}

function comandoDoPid(pid: number): string | null {
  try {
    return fs.readFileSync(`/proc/${pid}/cmdline`, "utf8").replace(/\0/g, " ");
  } catch {
    return null;
  }
}

function adquirirLock(): void {
  if (fs.existsSync(LOCK_PATH)) {
    const pid = Number(fs.readFileSync(LOCK_PATH, "utf8").trim());
    const comando = Number.isInteger(pid) && pid > 0 ? comandoDoPid(pid) : null;

    if (comando?.includes("backfill-2025")) {
      throw new Error(`Outra instância em execução (PID ${pid}).`);
    }

    fs.unlinkSync(LOCK_PATH);
  }

  fs.writeFileSync(LOCK_PATH, String(process.pid));
}

function liberarLock(): void {
  try {
    if (!fs.existsSync(LOCK_PATH)) return;
    if (fs.readFileSync(LOCK_PATH, "utf8").trim() !== String(process.pid)) return;
    fs.unlinkSync(LOCK_PATH);
  } catch {
    // O lock deixa de importar quando o processo termina.
  }
}

function esperar(ms: number, sinal: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    if (sinal.aborted) {
      reject(new InterrompidoErro());
      return;
    }

    const timer = setTimeout(() => {
      sinal.removeEventListener("abort", aoAbortar);
      resolve();
    }, ms);

    const aoAbortar = () => {
      clearTimeout(timer);
      reject(new InterrompidoErro());
    };

    sinal.addEventListener("abort", aoAbortar, { once: true });
  });
}

function caminhoBancoPadrao(): string {
  const aqui = path.dirname(fileURLToPath(import.meta.url));
  return path.resolve(aqui, "../../database/banco.db");
}

async function main(): Promise<void> {
  dotenv.config();

  const opcoes = lerOpcoes(process.argv.slice(2));
  const dias = listarDias(opcoes.inicio, opcoes.fim);
  const baseUrl = exigirEnv("BASE_URL");
  const token = exigirEnv("TOKEN");
  const caminhoBanco = process.env.DB_PATH || caminhoBancoPadrao();

  if (!fs.existsSync(caminhoBanco)) {
    throw new Error(`Banco não encontrado: ${caminhoBanco}`);
  }

  adquirirLock();

  const abortar = new AbortController();
  const aoSinal = () => abortar.abort();
  process.on("SIGINT", aoSinal);
  process.on("SIGTERM", aoSinal);

  let db: sqlite3.Database | null = null;
  const inicioMs = Date.now();
  let diasOk = 0;
  let diasPulados = 0;
  let totalRegistros = 0;
  let falhaRegistrada = false;

  try {
    db = await abrirBanco(caminhoBanco);
    await configurarBanco(db);

    if (!opcoes.dryRun) {
      await criarTabelaProgresso(db);
    }

    console.log(
      `${carimbo()} Backfill ${opcoes.inicio} .. ${opcoes.fim} (${dias.length} dias)${opcoes.dryRun ? " dry-run" : ""}`
    );

    for (let i = 0; i < dias.length; i++) {
      if (abortar.signal.aborted) {
        throw new InterrompidoErro();
      }

      const dia = dias[i];

      if (!opcoes.forcar && (await diaConcluido(db, dia))) {
        log("SKIP", dia, "já concluído");
        diasPulados += 1;
        continue;
      }

      let gravou = false;

      for (let tentativa = 1; tentativa <= MAX_TENTATIVAS; tentativa++) {
        const t0 = Date.now();

        try {
          const vendas = await buscarVendasDia(
            baseUrl,
            token,
            dia,
            opcoes.timeoutMs,
            abortar.signal
          );
          const segundos = ((Date.now() - t0) / 1000).toFixed(1);

          if (!opcoes.dryRun) {
            await gravarDia(db, dia, vendas);
          }

          log(
            opcoes.dryRun ? "DRY" : "OK",
            dia,
            `${vendas.length} registros  (${segundos}s)`
          );
          diasOk += 1;
          totalRegistros += vendas.length;
          gravou = true;
          break;
        } catch (erro) {
          if (erro instanceof InterrompidoErro || abortar.signal.aborted) {
            throw new InterrompidoErro();
          }

          const detalhe = mensagemErro(erro);

          if (tentativa === MAX_TENTATIVAS) {
            log("ERRO", dia, detalhe);
            falhaRegistrada = true;
            throw erro;
          }

          log("RETRY", dia, `tentativa ${tentativa}/${MAX_TENTATIVAS}: ${detalhe}`);
          const espera =
            erro instanceof ErpErro && erro.esperaMs !== undefined
              ? erro.esperaMs
              : 5000 * tentativa;
          await esperar(espera, abortar.signal);
        }
      }

      if (gravou && opcoes.pausaMs > 0 && i < dias.length - 1) {
        await esperar(opcoes.pausaMs, abortar.signal);
      }
    }

    const totalS = ((Date.now() - inicioMs) / 1000).toFixed(1);
    console.log(
      `${carimbo()} Resumo: ${diasOk} dias OK, ${diasPulados} pulados, ${totalRegistros} registros, ${totalS}s${opcoes.dryRun ? " (dry-run, nada gravado)" : ""}`
    );
  } catch (erro) {
    if (erro instanceof InterrompidoErro || abortar.signal.aborted) {
      console.log(`${carimbo()} Interrompido. Retome executando o script de novo.`);
      process.exitCode = 130;
      return;
    }

    if (!falhaRegistrada) {
      console.error(mensagemErro(erro));
    }
    process.exitCode = 1;
  } finally {
    process.off("SIGINT", aoSinal);
    process.off("SIGTERM", aoSinal);

    try {
      if (db) {
        await fecharBanco(db);
      }
    } finally {
      liberarLock();
    }
  }
}

main().catch((erro: unknown) => {
  console.error(mensagemErro(erro));
  liberarLock();
  process.exitCode = 1;
});
