const fs = require("fs");
const path = require("path");
const XLSX = require("xlsx");

const pasta = "I:\\Meu Drive\\Dados Matinal";
const nome = "INDICADORES COMERCIAIS POR  FATURAMENTO.xlsx";
const arquivo = path.join(pasta, nome);

console.log("=== DIAGNOSTICO GOOGLE DRIVE ===");
console.log("Arquivo:", arquivo);
console.log("Existe:", fs.existsSync(arquivo));

try {
    const info = fs.statSync(arquivo);
    console.log("Tamanho:", info.size, "bytes");

    console.log("\nTESTE 1: Leitura pelo Windows/Node");
    const buffer = fs.readFileSync(arquivo);
    console.log("Leitura OK:", buffer.length, "bytes");

    console.log("\nTESTE 2: Leitura do Excel pela memoria");
    const wb = XLSX.read(buffer, {
        type: "buffer",
        bookSheets: true
    });

    console.log("Abas:", wb.SheetNames.join(", "));
    console.log("\nRESULTADO: ARQUIVO ACESSIVEL");
} catch (erro) {
    console.error("\nERRO IDENTIFICADO:");
    console.error(erro.message);
    console.error("Codigo:", erro.code || "Nao informado");
}
