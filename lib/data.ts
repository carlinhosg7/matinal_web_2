import fs from 'node:fs';
import path from 'node:path';
import * as XLSX from 'xlsx';
import { parquetRead } from 'hyparquet';

export type Registro = Record<string, unknown>;
const pastaLocal = path.join(process.cwd(), 'dados');
const pastaDrive = process.env.MATINAL_DATA_DIR?.trim();
const pasta = pastaDrive || pastaLocal;

export function valor(v: unknown): number {
  if (typeof v === 'number') return Number.isFinite(v) ? v : 0;
  if (v == null || v === '') return 0;
  const s = String(v).trim().replace(/[^\d,.-]/g, '');
  if (!s) return 0;
  const normal = s.includes(',') ? s.replace(/\./g, '').replace(',', '.') : s;
  const n = Number(normal);
  return Number.isFinite(n) ? n : 0;
}

export function campo(row: Registro, ...nomes: string[]): unknown {
  const normalizar = (s: string) => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim().toLowerCase().replace(/\s+/g, ' ');
  const nomesNormalizados = nomes.map(normalizar);
  const chave = Object.keys(row).find(k => nomesNormalizados.includes(normalizar(k)));
  return chave === undefined ? null : row[chave];
}

function conferirPasta(): string {
  if (!fs.existsSync(pasta)) throw new Error(`Pasta de dados não encontrada: ${pasta}`);
  return fs.realpathSync(pasta);
}

function caminhoSeguro(raiz: string, nome: string): string {
  const completo = path.resolve(raiz, nome);
  if (!completo.startsWith(raiz + path.sep)) throw new Error('Caminho inválido');
  return completo;
}

export async function lerArquivo(nome: string, aba?: string, linhaCabecalho = 0): Promise<Registro[]> {
  const raiz = conferirPasta();
  const completo = caminhoSeguro(raiz, nome);
  if (!fs.existsSync(completo)) return [];
  const ext = path.extname(nome).toLowerCase();
  if (ext === '.parquet') {
    const b = fs.readFileSync(completo);
    const linhas: Registro[] = [];
    await parquetRead({ file: b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength), onComplete: data => { linhas.push(...(data as unknown as Registro[])); } });
    return linhas;
  }
  if (ext === '.csv') {
    const wb = XLSX.readFile(completo, { type: 'file', raw: true });
    return XLSX.utils.sheet_to_json<Registro>(wb.Sheets[wb.SheetNames[0]], { defval: null, range: linhaCabecalho });
  }
  const wb = XLSX.readFile(completo, { cellDates: true });
  const folha = wb.Sheets[aba || wb.SheetNames[0]];
  if (!folha) throw new Error(`Aba '${aba}' não encontrada em '${nome}'`);
  return XLSX.utils.sheet_to_json<Registro>(folha, { defval: null, range: linhaCabecalho, blankrows: false });
}

export async function carregar(nomeBase: string): Promise<Registro[]> {
  const raiz = conferirPasta();
  const arquivos = fs.readdirSync(raiz);
  const nome = arquivos.find(f => f.replace(/\.(xlsx|xlsm|xls|csv|parquet)$/i, '').toLowerCase() === nomeBase.toLowerCase());
  return nome ? lerArquivo(nome) : [];
}

export async function carregarIndicadoresMes(): Promise<Registro[]> {
  const raiz = conferirPasta();
  const nome = fs.readdirSync(raiz).find(f => /^indicadores comerciais por\s+faturamento\.xlsx$/i.test(f));
  if (!nome) throw new Error(`Arquivo INDICADORES COMERCIAIS POR FATURAMENTO.xlsx não encontrado em ${raiz}`);
  // As duas primeiras linhas são título e parâmetros; a terceira é o cabeçalho.
  const linhas = await lerArquivo(nome, 'MES', 2);
  return linhas.filter(r => /^\d+$/.test(String(campo(r, 'Codigo Representante') ?? '').trim()));
}

