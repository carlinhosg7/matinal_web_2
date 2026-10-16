const fs = require("fs");
const path = require("path");

const env = fs.readFileSync(".env.local", "utf8");

function variavel(nome) {
  const linha = env.split(/\r?\n/).find(l =>
    l.trim().startsWith(nome + "=")
  );

  if (!linha) throw new Error("Variavel ausente: " + nome);

  return linha.substring(linha.indexOf("=") + 1)
    .trim().replace(/^["']|["']$/g, "");
}

async function testar() {
  const url = new URL(variavel("GOOGLE_APPS_SCRIPT_URL"));

  url.searchParams.set("acao", "arquivo");
  url.searchParams.set("nome", "CONTROLE DE VENDAS POR FATURAMENTO  EXPORT.xlsx");
  url.searchParams.set("token", variavel("GOOGLE_APPS_SCRIPT_TOKEN"));

  const resposta = await fetch(url, {
    redirect: "follow",
    cache: "no-store",
    signal: AbortSignal.timeout(60000)
  });

  console.log("HTTP:", resposta.status);
  console.log("URL final (dominio):", new URL(resposta.url).hostname);
  console.log("Content-Type:", resposta.headers.get("content-type"));

  const texto = await resposta.text();

  if (resposta.ok) {
    try {
      const dados = JSON.parse(texto);
      console.log("Sucesso:", dados.sucesso);
      console.log("Arquivo:", dados.nome);
      console.log("Tamanho:", dados.tamanho);
      console.log("Erro:", dados.erro || "Nenhum");
    } catch {
      console.log("Resposta nao e JSON.");
      console.log("Inicio da resposta:", texto.slice(0, 200));
    }
  } else {
    console.log("Inicio do erro:", texto.slice(0, 300));
  }
}

testar().catch(e => console.error(e.message));
