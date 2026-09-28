import { buscarVendas } from "./innovaro.js";
import { substituirVendasDoDia } from "../repositories/vendasRepository.js";
import { salvarLog } from "../repositories/logRepository.js";
import { recarregarCatalogo } from "../catalogo/vendedoresCatalogo.js";

export async function sincronizar(data: string | null = null): Promise<void> {
  const dia = data || new Date().toISOString().split("T")[0];

  console.log("");
  console.log("======================================");
  console.log("SINCRONIZANDO VENDAS");
  console.log("======================================");
  console.log(`Data: ${dia}`);

  const resultado = await buscarVendas(dia);

  if (!resultado.sucesso) {
    await salvarLog(
      dia,
      0,
      resultado.tempo || 0,
      "ERRO",
      resultado.mensagem || "Falha ao consultar API"
    );

    console.log("❌ Falha ao consultar a API.");
    console.log(resultado.mensagem);
    return;
  }

  if (!resultado.vendas || resultado.vendas.length === 0) {
    await salvarLog(
      dia,
      0,
      resultado.tempo || 0,
      "ERRO",
      "API retornou zero registros"
    );

    console.log("⚠ API retornou zero registros. Nenhum dado foi removido.");
    return;
  }

  console.log(`Recebidos ${resultado.registros} registros`);
  console.log("Substituindo vendas do dia (transação)...");

  await substituirVendasDoDia(dia, resultado.vendas);
  await recarregarCatalogo();

  await salvarLog(dia, resultado.registros, resultado.tempo, "OK", "");

  console.log("======================================");
  console.log("SINCRONIZAÇÃO CONCLUÍDA");
  console.log(`Tempo: ${resultado.tempo}s | Registros: ${resultado.registros}`);
  console.log("======================================");
}
