-- Execute no SQL Editor do Supabase. NÃO cria usuários de exemplo.
create extension if not exists pgcrypto;
create table if not exists public.matinal_usuarios (
 id uuid primary key references auth.users(id) on delete cascade,
 nome text not null check (length(trim(nome)) between 2 and 160),
 email text not null,
 perfil text not null check (perfil in ('ADMINISTRADOR','GERENTE','SUPERVISOR')),
 ativo boolean not null default true,
 supervisor_codigo text,
 criado_em timestamptz not null default now(),
 atualizado_em timestamptz not null default now(),
 constraint supervisor_exige_codigo check (perfil <> 'SUPERVISOR' or nullif(trim(supervisor_codigo),'') is not null)
);
create unique index if not exists matinal_usuarios_email_unique on public.matinal_usuarios (lower(email));
create table if not exists public.matinal_permissoes (
 usuario_id uuid not null references public.matinal_usuarios(id) on delete cascade,
 tela text not null check (tela in ('faturamento','entrada','cobertura','projetos-especiais','brinquedos')),
 primary key(usuario_id,tela)
);
create index if not exists matinal_usuarios_perfil_idx on public.matinal_usuarios(perfil);
alter table public.matinal_usuarios enable row level security;
alter table public.matinal_permissoes enable row level security;
-- Permitir APENAS SELECT do próprio perfil/permissões (middleware). Escrita só service role.
revoke all on public.matinal_usuarios from anon, authenticated;
revoke all on public.matinal_permissoes from anon, authenticated;
grant select on public.matinal_usuarios to authenticated;
grant select on public.matinal_permissoes to authenticated;
drop policy if exists matinal_proprio_perfil on public.matinal_usuarios;
create policy matinal_proprio_perfil on public.matinal_usuarios for select to authenticated using (id = (select auth.uid()));
drop policy if exists matinal_proprias_permissoes on public.matinal_permissoes;
create policy matinal_proprias_permissoes on public.matinal_permissoes for select to authenticated using (usuario_id = (select auth.uid()));

-- Troca obrigatória de senha no primeiro acesso
alter table public.matinal_usuarios add column if not exists trocar_senha boolean not null default true;
