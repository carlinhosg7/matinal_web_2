import {NextResponse} from 'next/server';
import fs from 'node:fs';
import path from 'node:path';
import * as XLSX from 'xlsx';
export const runtime='nodejs';
export const dynamic='force-dynamic';
type Linha={codigo:string;nome:string;supervisor:string;metaClientes:number;metaPares:number;metaValor:number;realClientes:number;realPares:number;realValor:number};
type Registro=Record<string,unknown>;
const normal=(v:unknown)=>String(v??'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toUpperCase().replace(/[^A-Z0-9]/g,'');
const codigo=(v:unknown)=>String(v??'').trim().replace(/\.0$/,'');
const numero=(v:unknown)=>{if(typeof v==='number')return Number.isFinite(v)?v:0;const t=String(v??'').trim();if(!t)return 0;const n=Number(t.includes(',')?t.replace(/\./g,'').replace(',','.'):t);return Number.isFinite(n)?n:0};
const total=(v:unknown)=>['TOTAL','TOTALGERAL','SUBTOTAL'].includes(normal(v));
function localizar(dirs:string[],nomes:string[]):string{
 for(const dir of dirs){try{const files=fs.readdirSync(dir).filter(x=>/\.xlsx$/i.test(x)&&!x.startsWith('~$'));const nome=files.find(x=>nomes.some(n=>normal(path.parse(x).name)===normal(path.parse(n).name)));if(nome)return path.join(dir,nome)}catch{}}
 throw new Error(`Não foi possível localizar ${nomes.join(' ou ')}. Pastas verificadas: ${dirs.join('; ')}`);
}
function abrir(file:string){return XLSX.read(fs.readFileSync(file),{type:'buffer',cellDates:true})}
function registros(wb:XLSX.WorkBook,nome:string,linhaCabecalho:number):Registro[]{
 const aba=wb.SheetNames.find(s=>normal(s)===normal(nome));if(!aba)throw new Error(`Aba ${nome} ausente. Disponíveis: ${wb.SheetNames.join(', ')}`);
 const m=XLSX.utils.sheet_to_json<unknown[]>(wb.Sheets[aba],{header:1,raw:true,defval:''});const head=(m[linhaCabecalho-1]||[]).map(normal);
 return m.slice(linhaCabecalho).filter(r=>r.some(v=>String(v??'').trim())).map(r=>Object.fromEntries(head.map((h,i)=>[h,r[i]]).filter(([h])=>h)));
}
const campo=(r:Registro,...nomes:string[])=>{for(const nome of nomes){const v=r[normal(nome)];if(v!==undefined&&v!==null&&String(v).trim()!=='')return v}return undefined};
export async function GET(){try{
 const dirs=[process.env.MATINAL_BRINQUEDOS_DIR,process.env.MATINAL_ENTRADA_DIR,'I:\\Meu Drive\\Dados Matinal\\DADOS_2','I:\\Meu Drive\\Dados Matinal'].filter((x):x is string=>!!x);
 const metaFile=localizar(dirs,['META BRINQUEDOS VER26.xlsx']);const torreFile=localizar(dirs,['TORRE 02.xlsx']);
 const meta=registros(abrir(metaFile),'META BRINQUEDOS GERAL',1);
 const vendas=registros(abrir(torreFile),'BRINQUEDOS GERAL',3);
 const mapa=new Map<string,Linha>();const clientes=new Map<string,Set<string>>();
 const obter=(id:string)=>{let l=mapa.get(id);if(!l){l={codigo:id,nome:id,supervisor:'SEM SUPERVISOR',metaClientes:0,metaPares:0,metaValor:0,realClientes:0,realPares:0,realValor:0};mapa.set(id,l)}return l};
 for(const r of meta){const id=codigo(campo(r,'Codigo Representante'));if(!id||total(id))continue;const l=obter(id);l.metaClientes+=numero(campo(r,'META CLIENTES'));l.metaPares+=numero(campo(r,'META PARES'));const nome=campo(r,'Representante');if(nome)l.nome=String(nome).trim();const sup=campo(r,'Regional');if(sup)l.supervisor=String(sup).trim()}
 for(const r of vendas){const id=codigo(campo(r,'Codigo Representante'));if(!id||total(id))continue;const l=obter(id);l.realPares+=numero(campo(r,'Qtd Venda'));l.realValor+=numero(campo(r,'Vlr Venda'));const nome=campo(r,'Representante');if(nome&&l.nome===id)l.nome=String(nome).trim();const sup=campo(r,'Supervisor');if(sup&&l.supervisor==='SEM SUPERVISOR')l.supervisor=String(sup).trim();const grupo=String(campo(r,'Grupo Cliente')??'').trim();if(grupo&&!['NAOINFORMADO','TOTAL','TOTALGERAL'].includes(normal(grupo))){if(!clientes.has(id))clientes.set(id,new Set());clientes.get(id)!.add(normal(grupo))}}
 const avisos:string[]=[];
 try{const cadFile=localizar(dirs,['CAD_REPRESENTANTE.xlsx']);const cad=registros(abrir(cadFile),'CAD_REPRESENTANTE',1);for(const r of cad){const id=codigo(campo(r,'Codigo Representante','CODIGO_REP','CODREP','CODIGO'));const l=mapa.get(id);if(!l)continue;const s=campo(r,'Supervisor');if(s)l.supervisor=String(s).trim();const n=campo(r,'Nome Rep');if(n)l.nome=String(n).trim()}}catch(e){avisos.push('CAD_REPRESENTANTE não aplicado: '+String(e))}
 const somaPares=[...mapa.values()].reduce((t,l)=>t+l.realPares,0);const somaValor=[...mapa.values()].reduce((t,l)=>t+l.realValor,0);const pmv=somaPares?somaValor/somaPares:0;
 if(!somaPares)avisos.push('Preço médio não calculável: realizado de pares igual a zero.');
 const linhas=[...mapa.values()].map(l=>({...l,realClientes:clientes.get(l.codigo)?.size||0,metaValor:l.metaPares*pmv})).sort((a,b)=>a.nome.localeCompare(b.nome,'pt-BR'));
 const supervisores=[...new Set(linhas.map(l=>l.supervisor))].sort((a,b)=>a.localeCompare(b,'pt-BR'));
 return NextResponse.json({projetos:[{id:'brinquedos',nome:'BRINQUEDOS GERAL',pmv,linhas}],supervisores,avisos,arquivos:{metas:path.basename(metaFile),realizado:path.basename(torreFile)},status:'aguardando_validacao_pbix'});
 }catch(e){console.error('[API BRINQUEDOS]',e);return NextResponse.json({erro:e instanceof Error?e.message:String(e)},{status:500})}}
