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
      // Preserva as linhas vazias para mostrar a posição real no Excel.
      const linhas = XLSX.utils.sheet_to_json<unknown[]>(sheet, {
        header: 1, defval: null, blankrows: true, raw: true,
      });
      const primeirasLinhas = linhas.slice(0, 16).map((linha, i) => ({
        linhaExcel: i + 1,
        valores: (Array.isArray(linha) ? linha : []).slice(0, 20).map(v =>
          v === null || v === undefined ? '' : String(v).slice(0, 120)
        ),
      }));
      const linhasNaoVazias = linhas.filter(linha => Array.isArray(linha) && linha.some(v => v !== null && v !== undefined && String(v).trim() !== ''));
      return { nome: aba, linhasNaoVazias: linhasNaoVazias.length, primeirasLinhas };
    });
    return NextResponse.json({ sucesso: true, nome, tamanho, atualizado, abas }, {
      headers: { 'Cache-Control': 'no-store' },
    });
  } catch (e) {
    console.error('[drive-excel]', e instanceof Error ? e.message : e);
    return NextResponse.json({ sucesso: false, erro: 'Falha ao ler Excel no Google Drive. Consulte logs da Vercel.' }, { status: 502 });
  }
}
