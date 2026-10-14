import {abrirDrive,encontrarDrive} from './drive-source';
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
 if (!/\.xlsx$/i.test(nome)) throw new Error(`Somente arquivos XLSX no Google Drive: ${nome}`);
 const wb=await abrirDrive(nome);
 const folha=wb.Sheets[aba||wb.SheetNames[0]];
 if(!folha)throw new Error(`Aba '${aba}' não encontrada em '${nome}'`);
 return XLSX.utils.sheet_to_json<Registro>(folha,{defval:null,range:linhaCabecalho,blankrows:false});
}
export async function carregar(nomeBase: string): Promise<Registro[]> {
 return lerArquivo(encontrarDrive([nomeBase+'.xlsx']));
}
export async function carregarIndicadoresMes(): Promise<Registro[]> {
 const linhas=await lerArquivo('INDICADORES COMERCIAIS POR  FATURAMENTO.xlsx','MES',2);
 return linhas.filter(r=>/^\d+$/.test(String(campo(r,'Codigo Representante')??'').trim()));
}
