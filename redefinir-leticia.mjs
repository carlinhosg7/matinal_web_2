import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !key) {
  throw new Error("Variaveis Supabase ausentes.");
}

const supabase = createClient(url, key, {
  auth: { persistSession: false, autoRefreshToken: false }
});

const email = "leticia.dias@kidy.com.br";

const { data: perfil, error: erroPerfil } = await supabase
  .from("matinal_usuarios")
  .select("id, email")
  .ilike("email", email)
  .single();

if (erroPerfil || !perfil) {
  throw new Error("Usuario nao encontrado no Matinal.");
}

const { error } = await supabase.auth.admin.updateUserById(
  perfil.id,
  {
    password: "123456",
    email_confirm: true
  }
);

if (error) {
  throw new Error(error.message);
}

const { error: erroAtualizacao } = await supabase
  .from("matinal_usuarios")
  .update({ trocar_senha: true })
  .eq("id", perfil.id);

if (erroAtualizacao) {
  throw new Error(erroAtualizacao.message);
}

console.log("Senha temporaria redefinida com sucesso para:", email);
