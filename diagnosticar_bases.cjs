const fs = require("fs");
const path = require("path");
const XLSX = require("xlsx");

const pasta = process.env.MATINAL_DATA_DIR ||
  "I:\\Meu Drive\\Dados Matinal";

if (!fs.existsSync(pasta)) {
  console.error("Pasta não encontrada:", pasta);
  process.exit(1);
}

const arquivos = fs.readdirSync(pasta)
  .filter(nome => /\.(xlsx|xlsm|xls)$/i.test(nome));

console.log("\n=== DIAGNÓSTICO DAS BASES MATINAL ===");
console.log("Pasta:", pasta);
console.log("Arquivos Excel:", arquivos.length);

for (const arquivo of arquivos) {
  console.log("\nARQUIVO:", arquivo);

  try {
    const wb = XLSX.readFile(path.join(pasta, arquivo), {
      bookSheets: true
    });

    for (const aba of wb.SheetNames) {
      console.log("  ABA:", aba);
    }
  } catch (erro) {
    console.log("  ERRO:", erro.message);
  }
}
