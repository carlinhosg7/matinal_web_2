import {NextResponse} from 'next/server';
import fs from 'node:fs';
import path from 'node:path';
import * as XLSX from 'xlsx';
export const runtime='nodejs';
export const dynamic='force-dynamic';
type Registro=Record<string,unknown>;
type Linha={codigo:string;nome:string;supervisor:string;metaClientes:number;metaPares:number;metaValor:number;realClientes:number;realPares:number;realValor:number};
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

function achar(dir:string,nomes:string[]){const files=fs.readdirSync(dir).filter(f=>/\.xlsx$/i.test(f)&&!f.startsWith('~$'));const f=files.find(f=>nomes.some(n=>norm(path.parse(f).name)===norm(path.parse(n).name)));if(!f)throw Error(`Não encontrei ${nomes.join(' / ')} em ${dir}. Disponíveis: ${files.join(', ')}`);return path.join(dir,f)}
function abrir(file:string){return XLSX.read(fs.readFileSync(file),{type:'buffer',cellDates:true})}
function ler(w:XLSX.WorkBook,aba:string,cab:number){const n=w.SheetNames.find(n=>norm(n)===norm(aba));if(!n)throw Error(`Aba ${aba} ausente. Disponíveis: ${w.SheetNames.join(', ')}`);const m=XLSX.utils.sheet_to_json<unknown[]>(w.Sheets[n],{header:1,raw:true,defval:''});const h=(m[cab-1]||[]).map(norm);return m.slice(cab).filter(r=>r.some(v=>v!==''&&v!==null)).map(r=>Object.fromEntries(h.map((k,i)=>[k,r[i]]).filter(([k])=>!!k))) as Registro[]}
function campo(r:Registro,...nomes:string[]){for(const n of nomes){const v=r[norm(n)];if(v!==undefined&&v!==null&&String(v).trim()!=='')return v}return undefined}
const config=[{id:'brincaflex',nome:'BRINCAFLEX',meta:'META BRINCAFLEX',torre:'BRINCA FLEX'},{id:'veloz',nome:'VELOZ',meta:'META VELOZ',torre:'VELOZ'},{id:'impulso',nome:'IMPULSO 2',meta:'META IMPULSO',torre:'K360 - IMPULSO 2'},{id:'localize',nome:'LOCALIZE',meta:'META LOCALIZE',torre:'LOCALIZE'},{id:'luzes',nome:'KIDY LUZES',meta:'Meta Luzes',torre:'LUZES'},{id:'rebecca',nome:'REBECCA BONBON',meta:'Forcast RB',torre:'REBECA BOMBOM'}];
export async function GET(){try{
 const dir=(process.env.MATINAL_PROJETOS_DIR||'I:\\Meu Drive\\Dados Matinal\\DADOS_2').trim();
 // Permite separar a pasta de projetos das demais bases.
 const pastaMetas=(process.env.MATINAL_PROJETOS_METAS_DIR||dir).trim();
 const pastaTorre=(process.env.MATINAL_PROJETOS_TORRE_DIR||dir).trim();
 const mf=achar(pastaMetas,['META PROJETOS ESPECIAIS.xlsx']);const tf=achar(pastaTorre,['TORRE 02.xlsx']);
 const mw=abrir(mf),tw=abrir(tf);
 const luzesFile=achar(pastaMetas,['METAS - LUZES-PRIM_KIDY - K360.xlsx']);
 const rebeccaFile=achar(pastaMetas,['METAS REBECA BONBON POR REP.xlsx','METAS REBECCA BONBON POR REP.xlsx']);
 const lw=abrir(luzesFile),rw=abrir(rebeccaFile);
 const cadastro=[dir,pastaMetas,path.dirname(dir),'I:\\Meu Drive\\Dados Matinal\\DADOS_2'].map(cadastroRepresentantes).find(m=>m.size>0)||new Map<string,{nome:string;supervisor:string}>();
 const projetos=config.map(cfg=>{
  const metas=ler(cfg.id==='luzes'?lw:cfg.id==='rebecca'?rw:mw,cfg.meta,cfg.id==='rebecca'?3:1),vendas=ler(tw,cfg.torre,3);
  const mapa=new Map<string,Linha>();const grupos=new Map<string,Set<string>>();
  const obter=(id:string)=>{let l=mapa.get(id);if(!l){l={codigo:id,nome:id,supervisor:'SEM SUPERVISOR',metaClientes:0,metaPares:0,metaValor:0,realClientes:0,realPares:0,realValor:0};mapa.set(id,l)}return l};
  let somaPares=0,somaValores=0;
  for(const r of vendas){const id=cod(campo(r,'Codigo Representante'));if(!id||total(id))continue;const q=num(campo(r,'Qtd Venda')),v=num(campo(r,'Vlr Venda'));const l=obter(id);l.realPares+=q;l.realValor+=v;somaPares+=q;somaValores+=v;const n=campo(r,'Representante');if(n&&l.nome===id)l.nome=String(n).trim();const sup=campo(r,'Supervisor');if(sup)l.supervisor=String(sup).trim();const g=campo(r,'Codigo Grupo Cliente');if(g!==undefined&&!total(g)){const set=grupos.get(id)||new Set<string>();set.add(norm(g));grupos.set(id,set)}}
  const pmv=somaPares>0?somaValores/somaPares:0;
  for(const r of metas){const id=cod(campo(r,'Codigo Representante','Codigo Representante Carteirs'));if(!id||total(id))continue;const l=obter(id);
   if(cfg.id==='rebecca'){l.metaClientes+=num(campo(r,'Carteira Clientes Alvo'));l.metaPares+=num(campo(r,'Meta'));}
   else if(cfg.id==='luzes'){const pares=num(campo(r,'Meta Luzes'));l.metaPares+=pares;l.metaClientes+=pares/48;}
   else{l.metaClientes+=num(campo(r,'META CLIENTE'));l.metaPares+=num(campo(r,'META PARES'));}
   const n=campo(r,'Representante');if(n)l.nome=String(n).trim();const sup=campo(r,'Supervisor');if(sup)l.supervisor=String(sup).trim()}
  for(const l of mapa.values()){const cad=cadastro.get(l.codigo);if(cad){l.supervisor=cad.supervisor;if(cad.nome)l.nome=cad.nome}}
  const linhas=[...mapa.values()].map(l=>({...l,realClientes:grupos.get(l.codigo)?.size||0,metaValor:l.metaPares*pmv})).sort((a,b)=>a.nome.localeCompare(b.nome,'pt-BR'));
  return {id:cfg.id,nome:cfg.nome,pmv,linhas,registrosMetas:metas.length,registrosTorre:vendas.length};
 });
 return NextResponse.json({projetos,supervisores:[...new Set(projetos.flatMap(p=>p.linhas.map(l=>l.supervisor)))].sort(),arquivos:{metas:path.basename(mf),torre:path.basename(tf)},avisos:['Realizado Clientes = grupos cliente distintos por representante nas abas da TORRE 02. A contagem nacional é a soma das contagens por representante; um grupo associado a dois representantes será contado duas vezes.','Metas em reais = meta de pares × preço médio nacional ponderado de cada projeto (valor total / pares totais).','Rebecca Bonbon: metas I (clientes) e K (pares) da aba Forcast RB. Luzes: pares G da aba Meta Luzes e clientes = pares / 48; F é o percentual de distribuição já aplicado à coluna G.']});
 }catch(e){console.error('[API PROJETOS ESPECIAIS]',e);return NextResponse.json({erro:e instanceof Error?e.message:String(e)},{status:500})}}
