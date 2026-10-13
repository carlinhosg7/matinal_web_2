# Matinal Web — Autenticação e cadastro

## Instalação
1. Faça backup do projeto em `D:\matinal-web`. Extraia os arquivos na raiz, mantendo as pastas.
2. Instale: `npm install @supabase/supabase-js @supabase/ssr`.
3. Execute `supabase/schema.sql` no SQL Editor do **seu projeto Supabase**.
4. Configure `.env.local` a partir de `.env.local.example`. **Nunca exponha `SUPABASE_SERVICE_ROLE_KEY` no navegador, em `NEXT_PUBLIC_*` ou no Git.**
5. Configure Supabase Auth (e-mail/senha), SMTP para confirmação de e-mail, política de senhas e proteção contra abuso/rate limiting no provedor/reverse proxy.
6. Crie **manualmente** o primeiro administrador no painel Supabase Authentication > Users, com e-mail confirmado; copie o UUID. Execute, substituindo os dados:

```sql
insert into public.matinal_usuarios(id,nome,email,perfil,ativo)
values ('UUID-DO-ADMIN', 'Nome do administrador', 'admin@empresa.com.br','ADMINISTRADOR',true);
```

7. Inicie com `npm run dev`, acesse `/login`; admin cadastra usuários em `/admin/usuarios`. **Nenhum usuário João Silva foi criado.**

## Permissões e segurança
- `/portal` exibe só módulos liberados; middleware bloqueia URLs de módulos e APIs sem permissão.
- Supabase Auth verifica sessão no servidor; o cadastro só é realizado por administrador autenticado. Não há cadastro público.
- O Supabase envia confirmação de e-mail de acordo com a configuração do projeto. `createUser` não envia automaticamente um convite; para convites, integre `inviteUserByEmail` com um fluxo de definição de senha.
- **IMPORTANTE**: o middleware impede acessar módulos não liberados, mas **não limita os dados retornados pelas APIs atuais por regional**. Antes de produção, cada API de relatório deve chamar `usuarioAtual()` e aplicar filtro obrigatório por `supervisor_codigo` para SUPERVISOR **no servidor**, inclusive em totais e listas; filtros visuais não são segurança.
- As rotas de administração não suportam ainda exclusão de usuários, reset de senha, trilha de auditoria ou gerenciamento de regionais para GERENTE.
- Para proteção completa contra alterações parciais em permissões sob falha de rede, migrar a edição de cadastro/permissões para uma função transacional PostgreSQL (RPC); há compensação best-effort nesta versão.
- Em versões Next.js recentes, `middleware.ts` pode exigir migração para `proxy.ts` dependendo da versão; valide no seu projeto.
- Este pacote **não modifica as páginas e APIs existentes** dos cinco dashboards; integra somente acesso e cadastro.
