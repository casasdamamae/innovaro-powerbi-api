const DIA_MS = 24 * 60 * 60 * 1000;

export function interpretarData(valor: string): Date {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(valor);
  if (!match) {
    throw new Error(`Data inválida: ${valor}. Use YYYY-MM-DD.`);
  }

  const ano = Number(match[1]);
  const mes = Number(match[2]);
  const dia = Number(match[3]);
  const data = new Date(Date.UTC(ano, mes - 1, dia));

  if (
    data.getUTCFullYear() !== ano ||
    data.getUTCMonth() !== mes - 1 ||
    data.getUTCDate() !== dia
  ) {
    throw new Error(`Data inválida: ${valor}. Use YYYY-MM-DD.`);
  }

  return data;
}

export function listarDias(inicio: string, fim: string): string[] {
  const ini = interpretarData(inicio);
  const end = interpretarData(fim);

  if (ini.getTime() > end.getTime()) {
    throw new Error("inicio deve ser menor ou igual a fim.");
  }

  const dias: string[] = [];
  for (let t = ini.getTime(); t <= end.getTime(); t += DIA_MS) {
    dias.push(new Date(t).toISOString().slice(0, 10));
  }

  return dias;
}

export function formatarDataErp(iso: string): string {
  const [ano, mes, dia] = iso.split("-");
  return `${dia}-${mes}-${ano}`;
}
