# Configuração inicial Matinal Web 2

1. Faça backup do projeto e extraia os arquivos no diretório `D:\matinal-web`.
2. No Supabase, abra **SQL Editor > New query**, cole o conteúdo de `supabase/schema.sql` e clique em **Run**.
3. Em **Project Settings > API Keys**, copie a URL do projeto, a chave pública/anon e a chave service_role (secreta). NÃO envie service_role em chats nem publique no GitHub.
4. Crie `.env.local` com `NEXT_PUBLIC_SUPABASE_URL=...`, `NEXT_PUBLIC_SUPABASE_ANON_KEY=...` e `SUPABASE_SERVICE_ROLE_KEY=...`.
5. Execute `npm install @supabase/supabase-js @supabase/ssr`.
6. Execute `node --env-file=.env.local scripts/criar-usuarios-iniciais.mjs` (Node 20+).
7. Reinicie o Next.js, entre em `/login` e teste a troca obrigatória em `/trocar-senha`.

Usuários provisionados pelo script: Carlos (Administrador), Mauricio (Gerente), Andreia (Gerente). Wanderley NÃO é criado porque o e-mail informado parece inválido. Após confirmar o e-mail, inclua no script antes de executá-lo ou cadastre-o pela área administrativa.

Senha provisória de todos: `123456`; troca obrigatória no primeiro acesso. As senhas finais devem ter no mínimo 12 caracteres. O script não modifica usuários já existentes.

**Atenção:** os cinco dashboards existentes não foram alterados. Antes de abrir acesso a supervisores, implemente filtro regional também no servidor das APIs.

**Atenção:** a rota administrativa de criação de usuários do pacote anterior exige senha de 12 caracteres; a senha provisória de seis caracteres só é usada no script inicial, como solicitado.
