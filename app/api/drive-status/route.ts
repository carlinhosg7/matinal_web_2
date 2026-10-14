
import { NextResponse } from 'next/server';
import { usuarioAtual, sessionDb } from '../../../lib/matinal-auth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function erro(mensagem: string, etapa: string, status: number) {
  return NextResponse.json(
    { sucesso: false, etapa, erro: mensagem },
    { status, headers: { 'Cache-Control': 'no-store' } }
  );
}

export async function GET() {
  try {
    const db = await sessionDb();

    const { data, error } = await db.auth.getUser();

    if (error || !data.user) {
      return erro(
        'Sessao Supabase ausente ou invalida. Faca login novamente.',
        'autenticacao',
        401
      );
    }

    const usuario = await usuarioAtual();

    if (!usuario) {
      console.error('[drive-status] Perfil nao resolvido');
      return erro(
        'Sessao valida, mas perfil ou permissoes nao foram carregados.',
        'perfil',
        403
      );
    }

    if (usuario.perfil !== 'ADMINISTRADOR') {
      return erro(
        'Usuario sem permissao de administrador.',
        'permissao',
        403
      );
    }

    const url = process.env.GOOGLE_APPS_SCRIPT_URL;
    const token = process.env.GOOGLE_APPS_SCRIPT_TOKEN;

    if (!url || !token) {
      return erro(
        'Variaveis GOOGLE_APPS_SCRIPT_URL ou GOOGLE_APPS_SCRIPT_TOKEN ausentes.',
        'configuracao',
        500
      );
    }

    const endpoint = new URL(url);
    endpoint.searchParams.set('acao', 'listar');
    endpoint.searchParams.set('token', token);

    const response = await fetch(endpoint.toString(), {
      cache: 'no-store',
      redirect: 'follow',
      signal: AbortSignal.timeout(25000),
    });

    if (!response.ok) {
      return erro(
        `Google Apps Script retornou HTTP ${response.status}.`,
        'google_apps_script',
        502
      );
    }

    const resultado = await response.json();

    if (!resultado.sucesso) {
      return erro(
        'Google Apps Script recusou a consulta.',
        'google_apps_script',
        502
      );
    }

    return NextResponse.json(
      {
        sucesso: true,
        etapa: 'concluido',
        total: resultado.total,
        arquivos: (resultado.arquivos || []).map(
          (arquivo: {
            nome: string;
            tamanho: number;
            atualizado: string;
          }) => ({
            nome: arquivo.nome,
            tamanho: arquivo.tamanho,
            atualizado: arquivo.atualizado,
          })
        ),
      },
      { headers: { 'Cache-Control': 'no-store' } }
    );
  } catch (error) {
    console.error(
      '[drive-status]',
      error instanceof Error ? error.message : error
    );

    return erro(
      'Erro interno. Consulte os logs da Vercel.',
      'servidor',
      500
    );
  }
}
