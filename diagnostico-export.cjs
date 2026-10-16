const fs = require("fs");

const env = fs.readFileSync(".env.local", "utf8");

function variavel(nome) {
  const linha = env.split(/\r?\n/).find(l =>
    l.trim().startsWith(nome + "=")
  );

  if (!linha) throw new Error("Variavel ausente: " + nome);

  return linha.substring(linha.indexOf("=") + 1)
    .trim().replace(/^["']|["']$/g, "");
}

async function testar(acao, nome) {
  const url = new URL(variavel("GOOGLE_APPS_SCRIPT_URL"));

  url.searchParams.set("acao", acao);
  url.searchParams.set("token", variavel("GOOGLE_APPS_SCRIPT_TOKEN"));

  if (nome) url.searchParams.set("nome", nome);

  try {
    const res = await fetch(url, {
      cache: "no-store",
      redirect: "follow",
      signal: AbortSignal.timeout(60000)
    });

    const texto = await res.text();

    console.log("\nACAO:", acao, nome || "");
    console.log("HTTP:", res.status);
    console.log("DOMINIO:", new URL(res.url).hostname);
    console.log("CONTENT-TYPE:", res.headers.get("content-type"));

    try {
      const dados = JSON.parse(texto);
      console.log("SUCESSO:", dados.sucesso);
      console.log("ERRO:", dados.erro || "Nenhum");
      console.log("VERSAO:", dados.versao || "-");
      console.log("TAMANHO:", dados.tamanho || "-");
    } catch {
      console.log("RESPOSTA: HTML ou texto nao JSON");
    }
  } catch(e) {
    console.log("FALHA:", e.message);
  }
}

(async () => {
  for (let i = 1; i <= 3; i++) {
    console.log("TENTATIVA:", i);
    await testar("arquivo", "PLANEJAMENTO EXPORTAÇÃO 2027.xlsx");
  }
})();

