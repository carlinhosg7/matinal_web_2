import { createClient } from '@supabase/supabase-js';

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

for (const quantidade of [1, 5, 10, 20, 50, 100]) {
  const { data, error } = await supabase.auth.admin.listUsers({
    page: 1,
    perPage: quantidade
  });

  console.log(
    'LIMITE:', quantidade,
    '| STATUS:', error?.status ?? 'OK',
    '| RETORNADOS:', data?.users?.length ?? 0,
    '| ERRO:', error?.message ?? 'Nenhum'
  );

  if (error) break;
}
