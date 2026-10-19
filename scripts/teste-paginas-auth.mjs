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

let total = 0;

for (let pagina = 1; pagina <= 100; pagina++) {
  const { data, error } = await supabase.auth.admin.listUsers({
    page: pagina,
    perPage: 5
  });

  if (error) {
    console.log(
      'ERRO NA PAGINA:', pagina,
      '| STATUS:', error.status,
      '| MENSAGEM:', error.message
    );
    break;
  }

  const usuarios = data?.users ?? [];

  console.log(
    'PAGINA:', pagina,
    '| USUARIOS:', usuarios.length
  );

  total += usuarios.length;

  if (usuarios.length < 5) break;
}

console.log('TOTAL CONSULTADO:', total);
