import { createClient } from '@supabase/supabase-js';
import { randomBytes } from 'node:crypto';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
);

const email = 'export@kidy.com.br';
const senha = randomBytes(24).toString('base64url');

const { data, error } = await supabase.auth.admin.createUser({
  email,
  password: senha,
  email_confirm: true,
  user_metadata: { nome: 'Jessica Martins' }
});

if (error) {
  console.error('Erro ao criar no Auth:', error.message);
  process.exit(1);
}

const { error: erroCadastro } = await supabase
  .from('matinal_usuarios')
  .upsert({
    id: data.user.id,
    nome: 'Jessica Martins',
    email,
    perfil: 'EXPORTACAO',
    ativo: true,
    supervisor_codigo: null,
    trocar_senha: true
  }, { onConflict: 'id' });

if (erroCadastro) {
  console.error('Erro no cadastro:', erroCadastro.message);
  process.exit(1);
}

const { error: erroPermissao } = await supabase
  .from('matinal_permissoes')
  .upsert({
    usuario_id: data.user.id,
    tela: 'export'
  }, { onConflict: 'usuario_id,tela' });

if (erroPermissao) {
  console.error('Erro na permissão:', erroPermissao.message);
  process.exit(1);
}

console.log('USUÁRIO CRIADO:', email);
console.log('PERFIL: EXPORTACAO');
console.log('PERMISSÃO: export');
console.log('SENHA PROVISÓRIA:', senha);
console.log('TROCA DE SENHA: obrigatória');
