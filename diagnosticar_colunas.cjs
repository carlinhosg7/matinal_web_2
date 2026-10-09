const fs = require("fs");
const path = require("path");
const XLSX = require("xlsx");

const pasta = "I:\\Meu Drive\\Dados Matinal";

const fontes = [
  ["MATINAL.xlsx", ["FATURAMENTO", "FATURAMENTO CONTROLE MES"]],
  ["INDICADORES COMERCIAIS POR  FATURAMENTO.xlsx", ["MES", "ANO", "MES A MES"]],
  ["Venda por RepresentanteMarca.xlsx", ["VENDA POR REP. - DIA (D -1)"]],
  ["VEN_META_REP_MENSAL_TIPO_PEDIDO - Entrega Pedido - 01-07-2026 - MAIOR.xlsx",
    ["Mes Atual_MAIO_23", "Folha 1"]]
];

for (const [arquivo, abas] of fontes) {
  const caminho = path.join(pasta, arquivo);

  if (!fs.existsSync(caminho)) {
    console.log("ARQUIVO NAO ENCONTRADO:", arquivo);
    continue;
  }

  const wb = XLSX.readFile(caminho, { cellDates: true });

  for (const aba of abas) {
    const ws = wb.Sheets[aba];
    if (!ws) continue;

    const linhas = XLSX.utils.sheet_to_json(ws, {
      header: 1,
      defval: null,
      blankrows: false
    });

    console.log("\n==================================");
    console.log("ARQUIVO:", arquivo);
    console.log("ABA:", aba);
    console.log("TOTAL DE LINHAS:", linhas.length);
    console.log("PRIMEIRAS 5 LINHAS:");

    console.log(
      JSON.stringify(linhas.slice(0, 5), null, 2)
    );
  }
}
