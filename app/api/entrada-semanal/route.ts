import {abrirDrive,encontrarDrive} from '../../../lib/drive-source';
import {NextResponse} from 'next/server';
import {usuarioAtual,adminDb,podeAcessar} from '../../../lib/matinal-auth';
import fs from 'node:fs';
import path from 'node:path';
import * as XLSX from 'xlsx';
export const runtime='nodejs';
export const dynamic='force-dynamic';
type Registro=Record<string,unknown>;
type Tipo='PRODUCAO'|'KIDEX';
type Secao='NACIONAL'|'RN'|'B2B';
type Grupo={secao:Secao;regional:string;gerente:string;representante?:string;tipo:Tipo;metaMensal:number;semanas:number[]};
const norm=(v:unknown)=>String(v??'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toUpperCase().replace(/[^A-Z0-9]/g,'');
const str=(v:unknown)=>String(v??'').trim().replace(/\.0$/,'');
const numero=(v:unknown)=>{if(typeof v==='number')return Number.isFinite(v)?v:0;const s=str(v);const n=Number(s.includes(',')?s.replace(/\./g,'').replace(',','.'):s);return Number.isFinite(n)?n:0};
const campo=(r:Registro,...keys:string[])=>{for(const k of keys){const v=r[norm(k)];if(v!==undefined&&v!==null&&str(v)!=='')return v}return undefined};
function encontrar(_dir:string,nome:string){return encontrarDrive([nome])}
async function ler(file:string,header:number):Promise<Registro[]>{const w=await abrirDrive(file);const sheet=w.Sheets[w.SheetNames[0]];const matriz=XLSX.utils.sheet_to_json<unknown[]>(sheet,{header:1,defval:'',raw:true});const h=(matriz[header-1]||[]).map(norm);if(!h.length)throw Error(`Cabeçalho ausente em ${file}`);return matriz.slice(header).filter(row=>row.some(v=>v!==''&&v!==null)).map(row=>Object.fromEntries(h.map((k,i)=>[k,row[i]]).filter(([k])=>Boolean(k))))}
function data(v:unknown){if(v instanceof Date)return new Date(Date.UTC(v.getFullYear(),v.getMonth(),v.getDate()));if(typeof v==='number')return new Date(Date.UTC(1899,11,30)+v*86400000);const s=str(v);const br=s.match(/^(\d{2})\/(\d{2})\/(\d{4})/);return br?new Date(Date.UTC(+br[3],+br[2]-1,+br[1])):new Date(s)}
const B2B_IDS=new Set(['264','273','296','334']);
const idRep=(v:unknown)=>{const s=str(v);return /^\d+(?:[.,]0+)?$/.test(s)?String(Number(s.replace(',','.'))):s.toUpperCase()};
function classificar(raw:string):{secao:Secao;regional:string;gerente:string}|null{
 const n=norm(raw);
 if(n==='B2B')return {secao:'B2B',regional:'B2B',gerente:'Maurício'};
 if(n.startsWith('RN')){
  if(n.includes('NORTE')||n.includes('NORDESTE'))return {secao:'RN',regional:'RN - NORTE/NORDESTE',gerente:'Thiago'};
  if(n.includes('CEO')||n.includes('REM'))return {secao:'RN',regional:'RN - CEO/REM',gerente:'Natália'};
  if(n.includes('SP')||n.includes('SUL'))return {secao:'RN',regional:'RN - SP/SUL',gerente:'Rafael'};
  return null;
 }
 if(n==='9902'||n==='CEO'||n==='CENTROOESTE')return {secao:'NACIONAL',regional:'CEO',gerente:'Natália'};
 if(n==='9915'||n==='REM')return {secao:'NACIONAL',regional:'REM',gerente:'Natália'};
 if(n==='9914'||n==='NORTE'||n==='NORDESTE'||n==='NORTENORDESTE')return {secao:'NACIONAL',regional:'NORTE / NORDESTE',gerente:'Thiago'};
 if(n==='9907'||n==='SUL')return {secao:'NACIONAL',regional:'SUL',gerente:'Rafael'};
 if(n==='9916'||n==='SPC')return {secao:'NACIONAL',regional:'SPC',gerente:'Rafael'};
 if(n==='9917'||n==='SPI')return {secao:'NACIONAL',regional:'SPI',gerente:'Rafael'};
 return null; // Exportacao, regionais desconhecidas e outros segmentos nao entram no Nacional
}
function classificarRep(regional:string,id:string){
 if(B2B_IDS.has(id))return {secao:'B2B' as Secao,regional:'B2B',gerente:'Maurício'};
 return classificar(regional);
}
function tipoVenda(v:unknown):Tipo|null{const n=norm(v);return n==='PEDIDONORMAL'?'PRODUCAO':n==='PRONTAENTREGA'?'KIDEX':null}
function tipoMeta(v:unknown):Tipo|null{return str(v)==='1'?'PRODUCAO':str(v)==='4'?'KIDEX':null}
export async function GET(){try{
 const user=await usuarioAtual();if(!user)return NextResponse.json({erro:'Não autenticado'},{status:401});
 if(!podeAcessar(user,'entrada'))
   return NextResponse.json({erro:'Acesso negado'},{status:403});
  const db=adminDb();const {data:cfg,error:cfgError}=await db.from('matinal_carga_usuarios').select('acesso_total,regionais').ilike('email',user.email).maybeSingle();
 if(user.perfil!=='ADMINISTRADOR'&&(cfgError||!cfg))return NextResponse.json({erro:'Permissões regionais não configuradas'},{status:403});
 const total=user.perfil==='ADMINISTRADOR'||cfg?.acesso_total===true;
 const codigos=(cfg?.regionais||[]) as string[];
 const permitidos=new Set(codigos.map(c=>classificar(c)).filter((c):c is NonNullable<typeof c>=>c!==null).map(c=>norm(c.regional)));
 const dir=(process.env.MATINAL_ENTRADA_DIR||process.env.MATINAL_DATA_DIR||'I:\\Meu Drive\\Dados Matinal').trim();
 const venda=await ler(encontrar(dir,'VENDA SEMANA.xlsx'),4);
 const metas=await ler(encontrar(dir,'META DE ENTRADA DO MES.xlsx'),1);
 const cadastro=await ler(encontrar(dir,'CAD_REPRESENTANTE.xlsx'),1);
 const mapa=new Map<string,string>();const nomes=new Map<string,string>();for(const r of cadastro){const id=idRep(campo(r,'Codigo Representante','Codigo Rep','COD_REP'));const regional=str(campo(r,'Supervisor'));const nome=str(campo(r,'Nome Rep','Nome Representante','Representante','Nome'));if(id&&regional)mapa.set(id,regional);if(id&&nome)nomes.set(id,nome)}
 const datas=venda.map(r=>data(campo(r,'Data Cadastro'))).filter(d=>!isNaN(d.getTime()));if(!datas.length)throw Error('VENDA SEMANA sem datas válidas');
 const maisRecente=datas.reduce((a,b)=>a>b?a:b);const ano=maisRecente.getUTCFullYear(),mes=maisRecente.getUTCMonth();
 // Semanas de domingo a sabado, limitadas ao mes selecionado.
 const ultimo=new Date(Date.UTC(ano,mes+1,0)).getUTCDate();
 const diaPrimeiro=new Date(Date.UTC(ano,mes,1)).getUTCDay();
 const fimPrimeiraSemana=1+((6-diaPrimeiro+7)%7);
 const periodos:{inicio:number;fim:number}[]=[];
 for(let inicio=1;inicio<=ultimo;){
  const fim=Math.min(ultimo,inicio===1?fimPrimeiraSemana:inicio+6);
  periodos.push({inicio,fim});
  inicio=fim+1;
 }
 const quantidade=periodos.length;
 const grupos=new Map<string,Grupo>();const obter=(regional:string,tipo:Tipo,id='')=>{const c=classificarRep(regional,id);if(!c)return null;const representante=c.secao==='B2B'?(nomes.get(id)||id||'SEM REPRESENTANTE'):undefined;const chave=[c.secao,norm(c.regional),tipo,c.secao==='B2B'?id:''].join('|');let g=grupos.get(chave);if(!g){g={...c,representante,tipo,metaMensal:0,semanas:Array(quantidade).fill(0)};grupos.set(chave,g)}return g};
 let semClassificacao=0,semRegional=0;
 for(const r of metas){const t=tipoMeta(campo(r,'ID_TIPO_PEDIDO'));if(!t)continue;const id=idRep(campo(r,'CODIGO_REP'));const reg=mapa.get(id);if(!reg){semRegional++;continue}const dm=data(campo(r,'DATA_META'));if(!isNaN(dm.getTime())&&(dm.getUTCMonth()!==mes||dm.getUTCFullYear()!==ano))continue;const grupo=obter(reg,t,id);if(grupo)grupo.metaMensal+=numero(campo(r,'META_QUANTIDADE'))}
 for(const r of venda){const d=data(campo(r,'Data Cadastro'));if(isNaN(d.getTime())||d.getUTCFullYear()!==ano||d.getUTCMonth()!==mes)continue;const t=tipoVenda(campo(r,'Tipo Pedido'));if(!t){semClassificacao++;continue}const id=idRep(campo(r,'Codigo Representante'));const reg=str(campo(r,'Supervisor'))||mapa.get(id)||'SEM REGIONAL';const semana=periodos.findIndex(p=>d.getUTCDate()>=p.inicio&&d.getUTCDate()<=p.fim);if(semana<0)continue;const grupo=obter(reg,t,id);if(grupo)grupo.semanas[semana]+=numero(campo(r,'Qtd Venda'))}
 const autorizado=(g:Grupo)=>{if(total)return true;if(g.secao==='B2B')return false;if(g.secao==='RN'){const n=norm(g.regional);const cods=n.includes('NORTE')?['9914']:n.includes('CEO')?['9902','9915']:['9907','9916','9917'];return cods.some(c=>codigos.includes(c))}return permitidos.has(norm(g.regional))};
 const selecionados=[...grupos.values()].filter(autorizado);
 const semanas=Array.from({length:quantidade},(_,i)=>({numero:i+1,inicio:periodos[i].inicio,fim:periodos[i].fim,linhas:selecionados.map(g=>{const anteriores=g.semanas.slice(0,i).reduce((a,b)=>a+b,0);return {secao:g.secao,regional:g.regional,gerente:g.gerente,representante:g.representante,tipo:g.tipo,meta:(g.metaMensal-anteriores)/(quantidade-i),realizado:g.semanas[i]}}).sort((a,b)=>a.secao.localeCompare(b.secao)||a.regional.localeCompare(b.regional)||a.tipo.localeCompare(b.tipo))}));
 const avisos:string[]=[];if(semRegional)avisos.push(`${semRegional} linhas de meta sem regional correspondente no CAD_REPRESENTANTE.`);if(semClassificacao)avisos.push(`${semClassificacao} linhas de vendas com tipo de pedido não reconhecido.`);
 return NextResponse.json({versao:'SEGMENTOS-20261016-DOM-SAB',periodo:`${String(mes+1).padStart(2,'0')}/${ano}`,semanas,avisos},{headers:{'Cache-Control':'private, no-store, max-age=0','X-Matinal-Versao':'SEGMENTOS-20261016-DOM-SAB'}});
 }catch(e){return NextResponse.json({erro:e instanceof Error?e.message:String(e)},{status:500})}}
