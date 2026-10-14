
import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { adminDb } from '../../../../lib/matinal-auth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type CookieItem = {
  name: string;
  value: string;
  options?: Parameters<NextResponse['cookies']['set']>[2];
};

function json(
  dados: Record<string, unknown>,
  status = 200
) {
  return NextResponse.json(dados, {
    status,
    headers: { 'Cache-Control': 'no-store' },
  });
}

export async function POST(req: NextRequest) {
  try {
    const body: unknown = await req.json();

    if (!body || typeof body !== 'object') {
      return json({ erro: 'Dados inválidos' }, 400);
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
      return json({ erro: 'Dados inválidos' }, 400);
    }

    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!url || !key) {
      console.error('[login] Variáveis Supabase ausentes');
      return json(
        { erro: 'Configuração de autenticação incompleta' },
        500
      );
    }

    const cookiesPendentes: CookieItem[] = [];

    const db = createServerClient(url, key, {
      cookies: {
        getAll() {
          return req.cookies.getAll();
        },

        setAll(items) {
          items.forEach(item => {
            req.cookies.set(item.name, item.value);

            const indice = cookiesPendentes.findIndex(
              cookie => cookie.name === item.name
            );

            if (indice >= 0) {
              cookiesPendentes[indice] = item;
            } else {
              cookiesPendentes.push(item);
            }
          });
        },
      },
    });

    const { data, error } = await db.auth.signInWithPassword({
      email: email.trim(),
      password: senha,
    });

    if (error || !data.user) {
      console.warn('[login] Credenciais recusadas');
      return json({ erro: 'E-mail ou senha inválidos' }, 401);
    }

    const admin = adminDb();

    const { data: perfil, error: perfilErro } = await admin
      .from('matinal_usuarios')
      .select('id, ativo, perfil, trocar_senha')
      .eq('id', data.user.id)
      .maybeSingle();

    if (perfilErro) {
      console.error(
        '[login] Consulta de perfil falhou:',
        perfilErro.code,
        perfilErro.message
      );

      return json(
        { erro: 'Erro ao consultar cadastro do usuário' },
        500
      );
    }

    if (!perfil || !perfil.ativo) {
      return json(
        { erro: 'Usuário sem cadastro ativo no Matinal' },
        403
      );
    }

    const destino = perfil.trocar_senha
      ? '/trocar-senha'
      : '/portal';

    const resposta = NextResponse.json(
      { ok: true, destino },
      {
        headers: {
          'Cache-Control': 'no-store',
        },
      }
    );

    cookiesPendentes.forEach(cookie => {
      resposta.cookies.set(
        cookie.name,
        cookie.value,
        cookie.options
      );
    });

    console.info('[login] Autenticação concluída', {
      cookiesGerados: cookiesPendentes.length,
      perfil: perfil.perfil,
    });

    return resposta;
  } catch (error) {
    console.error(
      '[login] Erro inesperado:',
      error instanceof Error ? error.message : error
    );

    return json(
      { erro: 'Não foi possível concluir o login' },
      500
    );
  }
}
