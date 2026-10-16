import { createClient } from "@supabase/supabase-js";
import nextEnv from "@next/env";

const { loadEnvConfig } = nextEnv;

loadEnvConfig(process.cwd());

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;

const chave =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

if (!url || !chave) {
  console.error("ERRO: Configuracao publica do Supabase nao encontrada.");
  process.exit(1);
}

const supabase = createClient(url, chave, {
  auth: {
    persistSession: false,
    autoRefreshToken: false
  }
});

const { data, error } = await supabase.auth.signInWithPassword({
  email: "leticia.dias@kidy.com.br",
  password: "123456"
});

console.log("\n========== RESULTADO ==========");

console.log({
  sucesso: Boolean(data?.session),
  mensagem: error?.message ?? null,
  status: error?.status ?? null,
  codigo: error?.code ?? null
});

console.log("===============================\n");
