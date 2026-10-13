import {NextResponse} from 'next/server';
import fs from 'node:fs';
import path from 'node:path';
import * as XLSX from 'xlsx';
export const runtime='nodejs';
export const dynamic='force-dynamic';
type R=Record<string,unknown>;
type Linha={codigo:string;nome:string;supervisor:string;meta:number;gruposMes:string[];gruposSemanas:(string[]|null)[]};
const norm=(v:unknown)=>String(v??'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toUpperCase().replace(/[^A-Z0-9]/g,'');
const cod=(v:unknown)=>String(v??'').trim().replace(/\.0$/,'');
const num=(v:unknown)=>{if(typeof v==='number')return Number.isFinite(v)?v:0;const s=String(v??'').trim();const n=Number(s.includes(',')?s.replace(/\./g,'').replace(',','.'):s);return Number.isFinite(n)?n:0};
const total=(v:unknown)=>['TOTAL','TOTALGERAL','SUBTOTAL'].includes(norm(v));

function cadastroRepresentantes(dir:string):Map<string,{nome:string;supervisor:string}>{
 const resultado=new Map<string,{nome:string;supervisor:string}>();
 try{
  const f=fs.readdirSync(dir).find(x=>norm(path.parse(x).name)==='CADREPRESENTANTE'&&/\.xlsx$/i.test(x)&&!x.startsWith('~$'));
  if(!f)return resultado;
  const w=abrir(path.join(dir,f));
  const nomeAba=w.SheetNames.find(x=>norm(x)==='CADREPRESENTANTE');
  if(!nomeAba)return resultado;
  const matriz=XLSX.utils.sheet_to_json<unknown[]>(w.Sheets[nomeAba],{header:1,raw:true,defval:''});
  const cab=(matriz[0]||[]).map(norm);
  const indice=(...nomes:string[])=>cab.findIndex(x=>nomes.map(norm).includes(x));
  const ci=indice('Codigo Representante','CODIGO_REP','CODREP','CODIGO');
  const ni=indice('Nome Rep','Representante');
  const si=indice('Supervisor');
  if(ci<0||si<0)return resultado;
  for(const row of matriz.slice(1)){
   const id=cod(row[ci]);if(!id||total(id))continue;
   const supervisor=String(row[si]??'').trim();
   const nome=ni>=0?String(row[ni]??'').trim():'';
   if(supervisor)resultado.set(id,{supervisor,nome});
  }
 }catch(e){console.warn('[CAD_REPRESENTANTE]',e)}
 return resultado;
}

function encontrar(dir:string,nomes:string[]){const files=fs.readdirSync(dir).filter(f=>/\.xlsx$/i.test(f)&&!f.startsWith('~$'));const f=files.find(x=>nomes.some(n=>norm(path.parse(x).name)===norm(path.parse(n).name)));if(!f)throw Error(`Arquivo ${nomes.join(' / ')} não encontrado em ${dir}. Disponíveis: ${files.join(', ')}`);return path.join(dir,f)}
function abrir(f:string){return XLSX.read(fs.readFileSync(f),{type:'buffer',cellDates:true})}
function aba(w:XLSX.WorkBook,nome:string){const n=w.SheetNames.find(s=>norm(s)===norm(nome));return n?w.Sheets[n]:null}
function registros(w:XLSX.WorkBook,nome:string,linhaCabecalho:number):R[]|null{const s=aba(w,nome);if(!s)return null;const m=XLSX.utils.sheet_to_json<unknown[]>(s,{header:1,raw:true,defval:''});if(m.length<linhaCabecalho)return null;const h=(m[linhaCabecalho-1]||[]).map(norm);if(!h.includes('GRUPOCLIENTE')&&nome.toUpperCase().includes('COBERTURA SEMANA'))return null;return m.slice(linhaCabecalho).filter(r=>r.some(x=>x!==''&&x!==null)).map(r=>Object.fromEntries(h.map((k,i)=>[k,r[i]]).filter(([k])=>!!k)))}
function campo(r:R,...nomes:string[]){for(const n of nomes){const v=r[norm(n)];if(v!==undefined&&v!==null&&String(v).trim()!=='')return v}return undefined}
function validoGrupo(v:unknown){const s=String(v??'').trim();return s!==''&&!['TOTAL','TOTAL GERAL','SUBTOTAL'].includes(s.toUpperCase())}
function competencia(w:XLSX.WorkBook){const s=aba(w,'COBERTURA MES');const str=String(s?.A2?.v??'');const match=str.match(/Data Cadastro:\s*\d{2}\/(\d{2})\/(\d{4})/i);if(match)return {mes:Number(match[1]),ano:Number(match[2])};const d=new Date();return {mes:d.getMonth()+1,ano:d.getFullYear()}}
export async function GET(){try{
 const dir=(process.env.MATINAL_COBERTURA_DIR||'I:\\Meu Drive\\Dados Matinal').trim();
 const metaFile=encontrar(dir,['MATINAL.xlsx']);
 const comercialFile=encontrar(dir,['MATINAL COMERIAL.xlsx','MATINAL COMERCIAL.xlsx']);
 const mw=abrir(metaFile),cw=abrir(comercialFile);
 const metas=registros(mw,'COBERTURA DE CARTEIRA',3);
 if(!metas?.length)throw Error('Não foi possível ler a aba COBERTURA DE CARTEIRA com cabeçalho na linha 3.');
 const mapa=new Map<string,Linha>();
 const obter=(id:string):Linha=>{let l=mapa.get(id);if(!l){l={codigo:id,nome:id,supervisor:'SEM SUPERVISOR',meta:0,gruposMes:[],gruposSemanas:[null,null,null,null,null]};mapa.set(id,l)}return l};
 for(const r of metas){const id=cod(campo(r,'Codigo Representante'));if(!id||norm(id).includes('TOTAL'))continue;const l=obter(id);l.nome=String(campo(r,'Representante')??l.nome).trim();l.supervisor=String(campo(r,'Regional')??l.supervisor).trim();l.meta+=num(campo(r,'Meta de Positivação no Mês'))}
 const avisos:string[]=[];
 const mes=registros(cw,'COBERTURA MES',3);if(!mes)throw Error('Aba COBERTURA MES não encontrada ou cabeçalho Grupo Cliente ausente na linha 3.');
 const montar=(rs:R[],semana:number|null)=>{const porRep=new Map<string,Set<string>>();for(const r of rs){const id=cod(campo(r,'Codigo Representante Carteira'));const grupo=campo(r,'Grupo Cliente');if(!id||!validoGrupo(grupo)||norm(id).includes('TOTAL'))continue;const set=porRep.get(id)||new Set<string>();set.add(String(grupo).trim().toUpperCase());porRep.set(id,set);const l=obter(id);if(l.nome===id){const nome=campo(r,'Representante Carteira');if(nome)l.nome=String(nome).trim()}if(l.supervisor==='SEM SUPERVISOR'){const sup=campo(r,'Supervisor');if(sup)l.supervisor=String(sup).trim()}}for(const l of mapa.values()){const grupos=[...(porRep.get(l.codigo)||new Set<string>())];if(semana===null)l.gruposMes=grupos;else l.gruposSemanas[semana-1]=grupos}};
 montar(mes,null);
 const disponiveis:boolean[]=[];
 for(let i=1;i<=5;i++){const nome=`COBERTURA SEMANA ${String(i).padStart(2,'0')}`;const rs=registros(cw,nome,3);if(!rs){disponiveis.push(false);avisos.push(`${nome}: aba ausente ou sem cabeçalho Grupo Cliente; realizado pendente.`);continue}disponiveis.push(true);montar(rs,i)}
 const comp=competencia(cw),dias=new Date(comp.ano,comp.mes,0).getDate(),quantidadeSemanas=dias>28?5:4;
 // As semanas devem corresponder aos blocos 01–07, 08–14, 15–21, 22–28 e 29–fim.
 // O ERP pode exportar intervalos diferentes; alertar, sem alterar os registros silenciosamente.
 for(let i=1;i<=quantidadeSemanas;i++){const s=aba(cw,`COBERTURA SEMANA ${String(i).padStart(2,'0')}`);if(!s)continue;const texto=String(s.A2?.v??'');const m=texto.match(/Data Cadastro:\s*(\d{2})\/(\d{2})\/(\d{4})\s*(?:à|a)\s*(\d{2})\/(\d{2})\/(\d{4})/i);if(m){const inicio=(i-1)*7+1,fim=Math.min(i*7,dias);if(+m[1]!==inicio||+m[4]!==fim||+m[2]!==comp.mes||+m[5]!==comp.mes||+m[3]!==comp.ano||+m[6]!==comp.ano)avisos.push(`ATENÇÃO: COBERTURA SEMANA ${String(i).padStart(2,'0')} informa período ${m[1]}/${m[2]}/${m[3]} a ${m[4]}/${m[5]}/${m[6]}, diferente do bloco esperado ${String(inicio).padStart(2,'0')} a ${fim}/${comp.mes}/${comp.ano}. Confirme a exportação no ERP.`)}}
 const cadastro=cadastroRepresentantes(dir);
 for(const l of mapa.values()){const cad=cadastro.get(l.codigo);if(cad){l.supervisor=cad.supervisor;if(cad.nome)l.nome=cad.nome}}
 const linhas=[...mapa.values()].sort((a,b)=>a.nome.localeCompare(b.nome,'pt-BR'));
 return NextResponse.json({linhas,supervisores:[...new Set(linhas.map(l=>l.supervisor))].sort(),quantidadeSemanas,disponiveis,avisos,periodo:`${String(comp.mes).padStart(2,'0')}/${comp.ano}`,registros:mes.length,arquivos:{meta:path.basename(metaFile),realizado:path.basename(comercialFile)}});
 }catch(e){console.error('[API COBERTURA]',e);return NextResponse.json({erro:e instanceof Error?e.message:String(e)},{status:500})}}
