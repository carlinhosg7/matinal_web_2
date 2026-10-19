import { createClient } from '@supabase/supabase-js';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

console.log('URL configurada:', Boolean(url));
console.log('Service Role configurada:', Boolean(key));

if (!url || !key) {
  console.error('Faltam variáveis de ambiente.');
  process.exit(1);
}

const supabase = createClient(url, key, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

const { data, error } =
  await supabase.auth.admin.listUsers({
    page: 1,
    perPage: 1
  });

console.log('STATUS:', error?.status ?? 'OK');
console.log('CÓDIGO:', error?.code ?? 'OK');
console.log('ERRO:', error?.message ?? 'Nenhum');
console.log('USUÁRIOS RETORNADOS:', data?.users?.length ?? 0);
