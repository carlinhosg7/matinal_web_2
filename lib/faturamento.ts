import {abrirDrive} from './drive-source';
import fs from "node:fs";
import path from "node:path";
import * as XLSX from "xlsx";

export type Registro = Record<string, unknown>;

const PASTA =
  process.env.MATINAL_DATA_DIR ||
  "I:\\Meu Drive\\Dados Matinal";

const ARQUIVO =
  "INDICADORES COMERCIAIS POR  FATURAMENTO.xlsx";

export async function carregarFaturamento() {
  const wb = await abrirDrive(ARQUIVO);

  const ws = wb.Sheets["MES"];

  if (!ws) {
    throw new Error("A aba MES não foi encontrada.");
  }

  const linhas = XLSX.utils.sheet_to_json<unknown[]>(ws, {
    header: 1,
    defval: null,
    blankrows: false,
  });

  const indiceCabecalho = linhas.findIndex(
    (linha) =>
      Array.isArray(linha) &&
      linha.includes("Codigo Representante") &&
      linha.includes("Vlr Venda")
  );

  if (indiceCabecalho < 0) {
    throw new Error("Cabeçalho do faturamento não encontrado.");
  }

  const cabecalho = linhas[indiceCabecalho].map(
    (valor) => String(valor ?? "").trim()
  );

  const registros: Registro[] = [];

  for (const linha of linhas.slice(indiceCabecalho + 1)) {
    if (!Array.isArray(linha)) continue;

    const codigo = String(linha[0] ?? "").trim();

    if (!/^\d+$/.test(codigo)) continue;

    const registro: Registro = {};

    cabecalho.forEach((coluna, indice) => {
      if (coluna) {
        registro[coluna] = linha[indice] ?? null;
      }
    });

    registros.push(registro);
  }

  return registros;
}
