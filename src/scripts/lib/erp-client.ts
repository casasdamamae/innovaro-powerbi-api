import type { Venda } from "../../types/index.js";
import { formatarDataErp } from "./datas.js";

const MAX_MENSAGEM = 200;

export class ErpErro extends Error {
  readonly status?: number;
  readonly esperaMs?: number;

  constructor(message: string, status?: number, esperaMs?: number) {
    super(message.slice(0, MAX_MENSAGEM));
    this.name = "ErpErro";
    this.status = status;
    this.esperaMs = esperaMs;
  }
}

export class InterrompidoErro extends Error {
  constructor() {
    super("interrompido");
    this.name = "InterrompidoErro";
  }
}

function esperaRetryAfter(header: string | null): number | undefined {
  if (!header) return undefined;

  const segundos = Number(header);
  if (Number.isFinite(segundos)) {
    return Math.max(0, segundos * 1000);
  }

  const quando = Date.parse(header);
  if (Number.isNaN(quando)) return undefined;

  return Math.max(0, quando - Date.now());
}

function sinalComTimeout(
  timeoutMs: number,
  externo: AbortSignal
): { signal: AbortSignal; estourouTempo: () => boolean; cancelar: () => void } {
  const controller = new AbortController();
  let timeout = false;

  const timer = setTimeout(() => {
    timeout = true;
    controller.abort();
  }, timeoutMs);

  const aoAbortar = () => controller.abort();

  if (externo.aborted) {
    controller.abort();
  } else {
    externo.addEventListener("abort", aoAbortar);
  }

  return {
    signal: controller.signal,
    estourouTempo: () => timeout && !externo.aborted,
    cancelar: () => {
      clearTimeout(timer);
      externo.removeEventListener("abort", aoAbortar);
    },
  };
}

export async function buscarVendasDia(
  baseUrl: string,
  token: string,
  diaIso: string,
  timeoutMs: number,
  sinalExterno: AbortSignal
): Promise<Venda[]> {
  if (sinalExterno.aborted) {
    throw new InterrompidoErro();
  }

  const diaErp = formatarDataErp(diaIso);
  const base = baseUrl.replace(/\/+$/, "");
  const url = `${base}/vendas?ini=${diaErp}&fim=${diaErp}`;
  const controle = sinalComTimeout(timeoutMs, sinalExterno);

  try {
    const response = await fetch(url, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/json",
      },
      signal: controle.signal,
    });

    if (response.status === 429) {
      throw new ErpErro(
        "HTTP 429",
        429,
        esperaRetryAfter(response.headers.get("retry-after"))
      );
    }

    if (!response.ok) {
      throw new ErpErro(`HTTP ${response.status}`, response.status);
    }

    const texto = await response.text();
    let corpo: unknown;

    try {
      corpo = texto === "" ? [] : JSON.parse(texto);
    } catch {
      throw new ErpErro("JSON inválido");
    }

    if (!Array.isArray(corpo)) {
      throw new ErpErro("resposta não é uma lista");
    }

    return corpo as Venda[];
  } catch (erro) {
    if (erro instanceof ErpErro || erro instanceof InterrompidoErro) {
      throw erro;
    }

    if (sinalExterno.aborted) {
      throw new InterrompidoErro();
    }

    if (controle.estourouTempo()) {
      throw new ErpErro("timeout");
    }

    throw new ErpErro("falha de rede");
  } finally {
    controle.cancelar();
  }
}
