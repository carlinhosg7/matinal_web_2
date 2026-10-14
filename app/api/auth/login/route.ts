
import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { adminDb } from '../../../../lib/matinal-auth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  let response = NextResponse.json(
    { ok: true },
    { headers: { 'Cache-Control': 'no-store' } }
  );

  try {
    const body: unknown = await req.json();

    if (!body || typeof body !== 'object') {
      return NextResponse.json(
        { erro: 'Dados inválidos' },
        { status: 400 }
      );
    }

    const { email, senha } = body as Record<string, unknown>;

    if (
      typeof email !== 'string' ||
      typeof senha !== 'string' ||
      !email.trim() ||
      email.length > 254 ||
      !senha ||
      senha.length > 1024
    ) {
      return NextResponse.json(
        { erro: 'Dados inválidos' },
        { status: 400 }
      );
    }

    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!url || !key) {
      console.error('[login] Configuração Supabase incompleta');

      return NextResponse.json(
        { erro: 'Configuração de autenticação incompleta' },
        { status: 500 }
      );
    }

    const db = createServerClient(url, key, {
      cookies: {
        getAll() {
          return req.cookies.getAll();
        },

        setAll(items) {
          items.forEach(({ name, value }) => {
            req.cookies.set(name, value);
          });

          const novaResposta = NextResponse.json(
            { ok: true },
            { headers: { 'Cache-Control': 'no-store' } }
          );

          response.cookies.getAll().forEach(cookie => {
            novaResposta.cookies.set(cookie);
          });

          items.forEach(({ name, value, options }) => {
            novaResposta.cookies.set(name, value, options);
          });

          response = novaResposta;
        },
      },
    });

    const { data, error } = await db.auth.signInWithPassword({
      email: email.trim(),
      password: senha,
    });

    if (error || !data.user) {
      return NextResponse.json(
        { erro: 'E-mail ou senha inválidos' },
        { status: 401 }
      );
    }

    const admin = adminDb();

    const { data: perfil, error: perfilErro } = await admin
      .from('matinal_usuarios')
      .select('id, ativo, perfil, trocar_senha')
      .eq('id', data.user.id)
      .maybeSingle();

    if (perfilErro) {
      console.error(
        '[login] Erro ao consultar perfil:',
        perfilErro.message
      );

      return NextResponse.json(
        { erro: 'Erro ao consultar cadastro do usuário' },
        { status: 500 }
      );
    }

    if (!perfil || !perfil.ativo) {
      return NextResponse.json(
        { erro: 'Usuário sem cadastro ativo no Matinal' },
        { status: 403 }
      );
    }

    const destino = perfil.trocar_senha
      ? '/trocar-senha'
      : '/portal';

    // Retorna os cookies diretamente na resposta final.
    // Preserva os atributos definidos pelo Supabase.
    response = NextResponse.json(
      { ok: true, destino },
      { headers: { 'Cache-Control': 'no-store' } }
    );

    // Garante que a sessão seja escrita na resposta final.
    // A autenticação anterior pode ter atualizado os cookies
    // da requisição, por isso consultamos a sessão atual.
    const { data: sessao, error: erroSessao } =
      await db.auth.getSession();

    if (erroSessao || !sessao.session) {
      console.error('[login] Sessão não disponível após login');

      return NextResponse.json(
        { erro: 'Não foi possível estabelecer a sessão' },
        { status: 500 }
      );
    }

    return response;
  } catch (error) {
    console.error(
      '[login] Erro inesperado:',
      error instanceof Error ? error.message : error
    );

    return NextResponse.json(
      { erro: 'Não foi possível concluir o login' },
      { status: 500 }
    );
  }
}
