import { NextResponse } from 'next/server';
import { usuarioAtual } from '../../../lib/matinal-auth';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export async function GET() {
  try {
    const user = await usuarioAtual();
    if (!user || user.perfil !== 'ADMINISTRADOR') return NextResponse.json({ erro: 'Acesso restrito ao administrador' }, { status: 403 });
    const url = process.env.GOOGLE_APPS_SCRIPT_URL;
    const token = process.env.GOOGLE_APPS_SCRIPT_TOKEN;
    if (!url || !token) return NextResponse.json({ erro: 'Configuração do Google Drive incompleta' }, { status: 500 });
    const endpoint = new URL(url);
    endpoint.searchParams.set('acao', 'listar');
    endpoint.searchParams.set('token', token);
    const response = await fetch(endpoint.toString(), { cache: 'no-store', redirect: 'follow', signal: AbortSignal.timeout(25000) });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const data = await response.json();
    if (!data.sucesso) throw new Error(data.erro || 'Consulta recusada');
    return NextResponse.json({ sucesso: true, total: data.total, arquivos: (data.arquivos || []).map((f: { nome: string; tamanho: number; atualizado: string }) => ({ nome: f.nome, tamanho: f.tamanho, atualizado: f.atualizado })) }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    console.error('[drive-status]', error instanceof Error ? error.message : error);
    return NextResponse.json({ erro: 'Falha ao consultar Drive; verifique logs da Vercel' }, { status: 502 });
  }
}
