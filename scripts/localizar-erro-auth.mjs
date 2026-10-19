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

for (let pagina = 1; pagina <= 30; pagina++) {
  const { data, error } = await supabase.auth.admin.listUsers({
    page: pagina,
    perPage: 1
  });

  if (error) {
    console.log(
      'POSICAO:', pagina,
      '| ERRO:', error.message,
      '| STATUS:', error.status
    );
    break;
  }

  if (!data?.users?.length) {
    console.log('FIM DA LISTA');
    break;
  }

  console.log('POSICAO:', pagina, '| OK');
}
