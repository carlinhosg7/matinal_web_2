import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { adminDb } from '../../../../lib/matinal-auth';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const body: unknown = await req.json();
    if (!body || typeof body !== 'object') return NextResponse.json({ erro: 'Dados invÃ¡lidos' }, { status: 400 });
    const { email, senha } = body as Record<string, unknown>;
    if (typeof email !== 'string' || typeof senha !== 'string' || !email.trim() || email.length > 254 || !senha || senha.length > 1024) {
      return NextResponse.json({ erro: 'Dados invÃ¡lidos' }, { status: 400 });
    }

    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!url || !key) {
      console.error('[matinal/login] URL ou chave pÃºblica nÃ£o configurada');
      return NextResponse.json({ erro: 'ConfiguraÃ§Ã£o de autenticaÃ§Ã£o incompleta' }, { status: 500 });
    }

    const res = NextResponse.json({ ok: true, destino: '/portal' }, { headers: { 'Cache-Control': 'no-store' } });
    const db = createServerClient(url, key, {
      cookies: {
        getAll() { return req.cookies.getAll(); },
        setAll(items) { items.forEach(({ name, value, options }) => res.cookies.set(name, value, options)); },
      },
    });

    const { data, error } = await db.auth.signInWithPassword({ email: email.trim(), password: senha });
    if (error || !data.user) {
      return NextResponse.json({ erro: 'E-mail ou senha invÃ¡lidos' }, { status: 401, headers: { 'Cache-Control': 'no-store' } });
    }

    // VerificaÃ§Ã£o autoritativa no servidor, independente da leitura dos cookies pelo /api/auth/me.
    const admin = adminDb();
    const { data: perfil, error: perfilErro } = await admin
      .from('matinal_usuarios')
      .select('id,ativo,perfil,trocar_senha')
      .eq('id', data.user.id)
      .maybeSingle();

    if (perfilErro) {
      console.error('[matinal/login] Falha na consulta do perfil:', perfilErro.code, perfilErro.message);
      return NextResponse.json({ erro: 'Erro ao consultar o cadastro. Verifique a tabela matinal_usuarios.' }, { status: 500 });
    }
    if (!perfil || !perfil.ativo) {
      return NextResponse.json({ erro: 'UsuÃ¡rio sem cadastro ativo no Matinal. Procure o administrador.' }, { status: 403 });
    }

    // As polÃ­ticas do middleware e as APIs continuam sendo a autorizaÃ§Ã£o definitiva.
    const resposta = NextResponse.json(
      { ok: true, destino: perfil.trocar_senha ? '/trocar-senha' : '/portal' },
      { headers: { 'Cache-Control': 'no-store' } },
    );
    res.cookies.getAll().forEach(cookie => resposta.cookies.set(cookie));
    return resposta;
  } catch (e) {
    console.error('[matinal/login] Erro inesperado:', e instanceof Error ? e.message : e);
    return NextResponse.json({ erro: 'NÃ£o foi possÃ­vel concluir o login' }, { status: 500 });
  }
}

