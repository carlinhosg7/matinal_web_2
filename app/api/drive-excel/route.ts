import { NextResponse } from 'next/server';
import { usuarioAtual } from '../../../lib/matinal-auth';
import { lerExcelDoDrive } from '../../../lib/google-drive-excel';
import * as XLSX from 'xlsx';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const user = await usuarioAtual();
    if (!user || user.perfil !== 'ADMINISTRADOR') {
      return NextResponse.json({ sucesso: false, erro: 'Acesso restrito ao administrador' }, { status: 403 });
    }
    const nome = 'VENDA SEMANA.xlsx';
    const { workbook, tamanho, atualizado } = await lerExcelDoDrive(nome);
    const abas = workbook.SheetNames.map(aba => {
      const sheet = workbook.Sheets[aba];
      const linhas = XLSX.utils.sheet_to_json<unknown[]>(sheet, { header: 1, blankrows: false });
      const cabecalho = (linhas[0] || []).map(v => String(v ?? ''));
      return { nome: aba, quantidadeLinhas: Math.max(0, linhas.length - 1), colunas: cabecalho };
    });
    return NextResponse.json({ sucesso: true, nome, tamanho, atualizado, abas }, {
      headers: { 'Cache-Control': 'no-store' },
    });
  } catch (e) {
    console.error('[drive-excel]', e instanceof Error ? e.message : e);
    return NextResponse.json({ sucesso: false, erro: 'Falha ao ler Excel no Google Drive. Consulte logs da Vercel.' }, { status: 502 });
  }
}
