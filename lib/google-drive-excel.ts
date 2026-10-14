import 'server-only';
import * as XLSX from 'xlsx';

const MAX_BYTES = 1_000_000;
const ALLOWED = new Set(['VENDA SEMANA.xlsx']);

type ApiArquivo = {
  sucesso?: boolean;
  erro?: string;
  nome?: string;
  tamanho?: number;
  atualizado?: string;
  conteudoBase64?: string;
};

export async function lerExcelDoDrive(nome: string) {
  if (!ALLOWED.has(nome)) throw new Error('Arquivo não autorizado nesta etapa');
  const scriptUrl = process.env.GOOGLE_APPS_SCRIPT_URL;
  const token = process.env.GOOGLE_APPS_SCRIPT_TOKEN;
  if (!scriptUrl || !token) throw new Error('Configuração Google Apps Script ausente');

  const url = new URL(scriptUrl);
  if (url.protocol !== 'https:' || url.hostname !== 'script.google.com') {
    throw new Error('URL do Google Apps Script inválida');
  }
  url.searchParams.set('acao', 'arquivo');
  url.searchParams.set('nome', nome);
  url.searchParams.set('token', token);

  const response = await fetch(url.toString(), {
    cache: 'no-store',
    redirect: 'follow',
    signal: AbortSignal.timeout(25000),
  });
  if (!response.ok) throw new Error(`Apps Script respondeu HTTP ${response.status}`);
  const contentLength = Number(response.headers.get('content-length') || '0');
  if (contentLength > 1_600_000) throw new Error('Resposta maior que o limite permitido');
  const raw = await response.text();
  if (raw.length > 1_600_000) throw new Error('Resposta maior que o limite permitido');
  let result: ApiArquivo;
  try { result = JSON.parse(raw) as ApiArquivo; }
  catch { throw new Error('Resposta não é JSON. Confira a implantação do Apps Script'); }
  if (!result.sucesso || !result.conteudoBase64) {
    throw new Error(result.erro || 'Apps Script não retornou o conteúdo do Excel');
  }
  if (result.nome !== nome) throw new Error('Nome do arquivo retornado é diferente do solicitado');
  if (typeof result.tamanho !== 'number' || result.tamanho > MAX_BYTES || result.tamanho <= 0) {
    throw new Error('Tamanho do Excel fora do limite');
  }
  const base64 = result.conteudoBase64;
  if (base64.length > 1_400_000 || !/^[A-Za-z0-9+/]+={0,2}$/.test(base64)) {
    throw new Error('Conteúdo Base64 inválido');
  }
  const buffer = Buffer.from(base64, 'base64');
  if (buffer.length !== result.tamanho || buffer.length > MAX_BYTES) {
    throw new Error('Arquivo incompleto ou com tamanho divergente');
  }
  const workbook = XLSX.read(buffer, { type: 'buffer', cellDates: true });
  return { workbook, tamanho: buffer.length, atualizado: result.atualizado ?? null };
}
