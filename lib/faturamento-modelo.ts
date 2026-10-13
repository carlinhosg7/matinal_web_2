import fs from 'node:fs';
import path from 'node:path';
import * as XLSX from 'xlsx';

type Row = unknown[];
export type LinhaFat = {codigo:string;nome:string;supervisor:string;metaValor:number;realValor:number;anteriorValor:number;metaPares:number;realPares:number;anteriorPares:number};
const dir = process.env.MATINAL_DATA_DIR || 'I:\\Meu Drive\\Dados Matinal\\DADOS_2';
const normal=(v:unknown)=>String(v??'').trim();
const num=(v:unknown)=>{if(typeof v==='number')return Number.isFinite(v)?v:0;const t=normal(v);if(!t)return 0;const n=Number(t.includes(',')?t.replace(/\./g,'').replace(',','.'):t);return Number.isFinite(n)?n:0};
const codigo=(v:unknown)=>{const s=normal(v);return /^\d+$/.test(s)?String(Number(s)):''};
function localizar(nome:string){const dirs=[dir,path.join(dir,'DADOS_2')];for(const d of dirs){const p=path.join(d,nome);if(fs.existsSync(p))return p;}throw new Error(`Arquivo não encontrado: ${nome}. Pastas verificadas: ${dirs.join(' | ')}`)}
function ler(nome:string,aba:string){const p=localizar(nome);const buffer=fs.readFileSync(p);const wb=XLSX.read(buffer,{type:'buffer',cellDates:true});const ws=wb.Sheets[aba];if(!ws)throw new Error(`Aba ${aba} não encontrada em ${nome}`);return XLSX.utils.sheet_to_json<Row>(ws,{header:1,defval:null,blankrows:false});}
function cabecalho(rows:Row[], campos:string[]){const idx=rows.findIndex(r=>campos.every(c=>r.some(v=>normal(v).toLowerCase()===c.toLowerCase())));if(idx<0)throw new Error(`Cabeçalho não encontrado: ${campos.join(', ')}`);return {idx, cols:rows[idx].map(v=>normal(v).toLowerCase())};}
function col(cols:string[],nome:string){const i=cols.indexOf(nome.toLowerCase());if(i<0)throw new Error(`Coluna não encontrada: ${nome}`);return i}
function periodoInfo(rows:Row[]){const s=rows.slice(0,3).flat().map(normal).find(x=>x.includes('Data Entrega:'))||'';const m=s.match(/Data Entrega:\s*(\d{2}\/\d{2}\/\d{4})\s*à\s*(\d{2}\/\d{2}\/\d{4})/);return m?{inicio:m[1],fim:m[2]}:null}
export function carregarModeloFaturamento(){
 const cadRows=ler('CAD_REPRESENTANTE.xlsx','CAD_REPRESENTANTE');const cadH=cabecalho(cadRows,['Codigo Representante','Supervisor']);const ci=col(cadH.cols,'Codigo Representante'),cs=col(cadH.cols,'Supervisor'),cn=col(cadH.cols,'Nome Rep');
 const cadastro=new Map<string,{nome:string;supervisor:string}>();for(const r of cadRows.slice(cadH.idx+1)){const c=codigo(r[ci]);if(c)cadastro.set(c,{nome:normal(r[cn]),supervisor:normal(r[cs])||'(Em branco)'})}
 const metaRows=ler('META DE FATURAMENTO DO MES.xlsx','META DE FATURAMENTO DO MES');const mh=cabecalho(metaRows,['CODIGO_REP','META_VALOR','META_QUANTIDADE','ANO','MÊS']);
 const mi=col(mh.cols,'CODIGO_REP'),my=col(mh.cols,'ANO'),mm=col(mh.cols,'MÊS'),mv=col(mh.cols,'META_VALOR'),mp=col(mh.cols,'META_QUANTIDADE'),mid=mh.cols.indexOf('identificador');
 const fatRows=ler('INDICADORES COMERCIAIS POR  FATURAMENTO.xlsx','MES');const fh=cabecalho(fatRows,['Codigo Representante','Vlr Venda','Vlr Venda AA','Qtd Venda','Qtd Venda AA']);const fi=col(fh.cols,'Codigo Representante'),fn=col(fh.cols,'Representante'),fv=col(fh.cols,'Vlr Venda'),fa=col(fh.cols,'Vlr Venda AA'),fp=col(fh.cols,'Qtd Venda'),fpa=col(fh.cols,'Qtd Venda AA');
 const periodo=periodoInfo(fatRows);if(!periodo)throw new Error('Período Data Entrega não encontrado na aba MES');const [dia,mes,ano]=periodo.inicio.split('/').map(Number);const [df,mf,af]=periodo.fim.split('/').map(Number);if(dia!==1||mes!==mf||ano!==af||df!==new Date(ano,mes,0).getDate())throw new Error('A aba MES não corresponde a um mês completo; confira o período exportado');
 const mapa=new Map<string,LinhaFat>();const get=(c:string,nome='')=>{let r=mapa.get(c);if(!r){const cad=cadastro.get(c);r={codigo:c,nome:cad?.nome||nome||`Representante ${c}`,supervisor:cad?.supervisor||'(Em branco)',metaValor:0,realValor:0,anteriorValor:0,metaPares:0,realPares:0,anteriorPares:0};mapa.set(c,r)}return r};
 const ids=new Set<string>();let metasValidas=0;for(const r of metaRows.slice(mh.idx+1)){const c=codigo(r[mi]);if(!c||num(r[my])!==ano||num(r[mm])!==mes)continue;const id=mid>=0?normal(r[mid]):'';if(id&&ids.has(id))continue;if(id)ids.add(id);const x=get(c);x.metaValor+=num(r[mv]);x.metaPares+=num(r[mp]);metasValidas++}
 let vendasValidas=0;for(const r of fatRows.slice(fh.idx+1)){const c=codigo(r[fi]);if(!c)continue;const x=get(c,normal(r[fn]));x.realValor+=num(r[fv]);x.anteriorValor+=num(r[fa]);x.realPares+=num(r[fp]);x.anteriorPares+=num(r[fpa]);vendasValidas++}
 const supervisores=[...new Set([...cadastro.values()].map(r=>r.supervisor))].sort((a,b)=>a.localeCompare(b,'pt-BR'));
 const linhas=[...mapa.values()].sort((a,b)=>a.nome.localeCompare(b.nome,'pt-BR'));
 return {linhas,supervisores,periodo:`${periodo.inicio} a ${periodo.fim}`,mes,ano,metasValidas,vendasValidas,semCadastro:linhas.filter(r=>!cadastro.has(r.codigo)).map(r=>r.codigo)};
}
