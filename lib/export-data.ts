import 'server-only';
import * as XLSX from 'xlsx';
import {abrirDrive} from './drive-source';

const names = {
  entrada:'Dash Export Entrada.xlsx',
  faturamento:'Dash Export Faturamento.xlsx',
  metas:'BASE01.xlsx',
  carteira:'CONTROLE DE VENDAS POR FATURAMENTO  EXPORT.xlsx'
} as const;
type R=Record<string,unknown>;
const normal=(v:unknown)=>String(v??'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-zA-Z0-9]/g,'').toUpperCase();
const asNum=(v:unknown)=>{if(typeof v==='number')return Number.isFinite(v)?v:0;const s=String(v??'').trim();const n=Number(s.includes(',')?s.replace(/\./g,'').replace(',','.'):s);return Number.isFinite(n)?n:0};
const field=(r:R,...keys:string[])=>{for(const k of keys){const v=r[normal(k)];if(v!==undefined&&v!==null&&String(v).trim()!=='')return v}return undefined};
const txt=(v:unknown)=>String(v??'').trim();
const mkDate=(v:unknown):Date|null=>{
  if(v instanceof Date)return new Date(Date.UTC(v.getFullYear(),v.getMonth(),v.getDate()));
  if(typeof v==='number'){const d=new Date(Date.UTC(1899,11,30)+Math.floor(v)*86400000);return isNaN(d.getTime())?null:d;}
  const s=txt(v);const m=s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  const d=m?new Date(Date.UTC(+m[3],+m[2]-1,+m[1])):new Date(s);return isNaN(d.getTime())?null:d;
};
const iso=(d:Date)=>d.toISOString().slice(0,10);
const monthNames=['JANEIRO','FEVEREIRO','MARCO','ABRIL','MAIO','JUNHO','JULHO','AGOSTO','SETEMBRO','OUTUBRO','NOVEMBRO','DEZEMBRO'];
const month=(v:unknown)=>monthNames.indexOf(normal(v));

// Buffer por instancia: reutiliza as planilhas por 15 minutos.
// Mantem a ultima copia em memoria se o Google falhar temporariamente.
const ARQUIVO_TTL_MS = 15 * 60 * 1000;
const ARQUIVO_STALE_MS = 6 * 60 * 60 * 1000;
type WorkbookEntry = {value:XLSX.WorkBook; updatedAt:number};
const workbookBuffer = new Map<string,WorkbookEntry>();
const workbookPending = new Map<string,Promise<XLSX.WorkBook>>();
async function workbook(nome:string):Promise<XLSX.WorkBook>{
 const antigo=workbookBuffer.get(nome), agora=Date.now();
 if(antigo && agora-antigo.updatedAt<ARQUIVO_TTL_MS)return antigo.value;
 const pendente=workbookPending.get(nome);
 if(pendente)return pendente;
 const tarefa=(async()=>{
   try{
     const atual=await abrirDrive(nome);
     workbookBuffer.set(nome,{value:atual,updatedAt:Date.now()});
     return atual;
   }catch(erro){
     if(antigo && Date.now()-antigo.updatedAt<ARQUIVO_STALE_MS){
       console.warn('[export-buffer] Usando ultima copia de',nome,erro);
       return antigo.value;
     }
     throw erro;
   }
 })();
 workbookPending.set(nome,tarefa);
 try{return await tarefa}finally{workbookPending.delete(nome)}
}
function sheet(w:XLSX.WorkBook,name:string,headerIndex:number):R[]{
  const sheetName=w.SheetNames.find(s=>normal(s)===normal(name));if(!sheetName)throw Error(`Aba ${name} ausente`);
  const matrix=XLSX.utils.sheet_to_json<unknown[]>(w.Sheets[sheetName],{header:1,defval:'',raw:true});
  const headers=(matrix[headerIndex]||[]).map(normal);
  return matrix.slice(headerIndex+1).filter(row=>row.some(v=>v!==''&&v!==null)).map(row=>Object.fromEntries(headers.map((h,i)=>[h,row[i]]).filter(([h])=>Boolean(h))));
}
type Item={data:string;pais:string;cliente:string;pedido:string;pares:number;valor:number};
function items(rows:R[], dateField:string, quantityField:string,amountField:string):Item[]{return rows.map(r=>{
 const d=mkDate(field(r,dateField));return {data:d?iso(d):'',pais:normal(field(r,'Pais')),cliente:txt(field(r,'Razao Social')),pedido:txt(field(r,'Numero Pedido')),pares:asNum(field(r,quantityField)),valor:asNum(field(r,amountField))};
}).filter(r=>r.data);}
const sum=(a:Item[])=>({pares:a.reduce((s,i)=>s+i.pares,0),valor:a.reduce((s,i)=>s+i.valor,0),pedidos:new Set(a.map(r=>r.pedido).filter(Boolean)).size,clientes:new Set(a.map(r=>r.cliente).filter(Boolean)).size});
function agrupamento(a:Item[],by:(r:Item)=>string){const map=new Map<string,Item[]>();for(const r of a){const key=by(r)||'NÃO INFORMADO';const old=map.get(key)||[];old.push(r);map.set(key,old)}return [...map.entries()].map(([nome,rows])=>({nome,...sum(rows)})).sort((a,b)=>b.valor-a.valor)}
const sunday=(date:Date)=>{const d=new Date(date);d.setUTCDate(d.getUTCDate()-d.getUTCDay());return d};
const saturday=(d:Date)=>{const next=new Date(d);next.setUTCDate(next.getUTCDate()+6);return next};
const atMonth=(d:Date,y:number,m:number)=>d.getUTCFullYear()===y&&d.getUTCMonth()===m;
type MetaPais={pais:string;metaPares:number;metaValor:number;temMetaPares:boolean;temMetaValor:boolean};
function metas(rows:R[],_y:number,m:number):MetaPais[]{
 return rows.filter(r=>month(field(r,'MES'))===m).map(r=>{
  const metaPares=asNum(field(r,'Meta Entrada Pares','Meta Faturamento Pares'));
  const metaValor=asNum(field(r,'Meta Valores Entrada','Meta Valores Faturamento'));
  return {pais:normal(field(r,'pais')),metaPares,metaValor,temMetaPares:metaPares>0,temMetaValor:metaValor>0};
 }).filter(r=>Boolean(r.pais));
}
function consolidarMetas(rows:MetaPais[]){
 const m=new Map<string,MetaPais>();
 for(const r of rows){const prev=m.get(r.pais);
  if(prev){prev.metaPares+=r.metaPares;prev.metaValor+=r.metaValor;prev.temMetaPares=prev.metaPares>0;prev.temMetaValor=prev.metaValor>0;}
  else m.set(r.pais,{...r});
 }
 return m;
}

// Base historica CLIENTES: agrega por CODIGO CLIENTE e MES ANO EMISSAO.
// A ultima compra considera todo o historico, nao apenas o periodo filtrado.
function clientesHistoricos(rows:R[],years:number[],months:number[],countries:Set<string>){
 type Cli={codigo:string;nome:string;pais:string;pares:number;valor:number;ultimaCompra:string};
 const todos=new Map<string,Cli>();
 for(const r of rows){
  const codigo=txt(field(r,'Codigo Cliente')).replace(/\.0$/,'');
  const nome=txt(field(r,'Razao Social'));
  const pais=normal(field(r,'Pais'));
  if(!codigo||!pais)continue;
  const chave=pais+'|'+codigo;
  const ultima=mkDate(field(r,'Data Ultima Compra'));
  const ultimaIso=ultima?iso(ultima):'';
  const atual=todos.get(chave)||{codigo,nome,pais,pares:0,valor:0,ultimaCompra:''};
  if(ultimaIso>atual.ultimaCompra)atual.ultimaCompra=ultimaIso;
  const referencia=txt(field(r,'Mes Ano Emissao'));
  const match=referencia.match(/^(\d{1,2})\/(\d{4})$/);
  if(match&&months.includes(Number(match[1])-1)&&years.includes(Number(match[2]))){
   atual.pares+=asNum(field(r,'Qtd Venda','Quantidade'));
   atual.valor+=asNum(field(r,'Vlr Venda','Valor'));
  }
  todos.set(chave,atual);
 }
 const todosPeriodo=[...todos.values()].filter(r=>r.pares!==0||r.valor!==0);
 const totaisPais=new Map<string,{pares:number;valor:number}>();
 let geralPares=0,geralValor=0;
 for(const r of todosPeriodo){
  const t=totaisPais.get(r.pais)||{pares:0,valor:0};
  t.pares+=r.pares;t.valor+=r.valor;totaisPais.set(r.pais,t);
  geralPares+=r.pares;geralValor+=r.valor;
 }
 const filtrados=todosPeriodo.filter(r=>!countries.size||countries.has(r.pais));
 const rowsResultado=filtrados.map(r=>{
  const t=totaisPais.get(r.pais)!;
  const pct=(v:number,den:number)=>den!==0?100*v/den:null;
  return {...r,participacaoParesPais:pct(r.pares,t.pares),participacaoValorPais:pct(r.valor,t.valor),participacaoParesGeral:pct(r.pares,geralPares),participacaoValorGeral:pct(r.valor,geralValor)};
 }).sort((a,b)=>b.valor-a.valor||a.nome.localeCompare(b.nome));
 return {linhas:rowsResultado,totalGeral:{pares:geralPares,valor:geralValor},totalSelecionado:{pares:filtrados.reduce((s,r)=>s+r.pares,0),valor:filtrados.reduce((s,r)=>s+r.valor,0)},quantidade:rowsResultado.length};
}

async function calcularExportData(tela:string,requestedYears?:number[],requestedMonths?:number[],requestedCountries?:string[]){
 const allowed=['entrada','faturamento','clientes','fechamento-semanal'];if(!allowed.includes(tela))throw Error('Tela inválida');
 const entW=await workbook(names.entrada);
 const fatW=await workbook(names.faturamento);
 const baseW=await workbook(names.metas);
 const cartW=await workbook(names.carteira);
 const linhasClientes=sheet(entW,'CLIENTES',2);
 const entrada=items(sheet(entW,'entrada dia',2),'Data Cadastro','Qtd Venda','Vlr Venda');
 const faturamento=items(sheet(fatW,'fat por dia',2),'Data Emissao','Quantidade','Vlr Faturado');
 const carteira=items(sheet(cartW,'CONTROLE DE VENDAS POR FATURAM',2),'Data Entrega','Qtd Venda','Vlr Venda');
 // Tendencia do faturamento: aba carteira ref da planilha Dash Export Entrada (cabecalho na linha 3).
 const tendenciaFaturamento=items(sheet(entW,'carteira ref',2),'Data Entrega','Qtd Venda','Vlr Venda');
 const paisRows=sheet(baseW,'PAIS',0);
 const gerentes=Object.fromEntries(paisRows.map(r=>[normal(field(r,'PAIS')),txt(field(r,'GERENTE'))]));
 const dates=[...entrada,...faturamento].map(r=>r.data).sort();const latest=dates.at(-1)||iso(new Date());
 const active=new Date(latest+'T00:00:00Z');
 const years=[...new Set((requestedYears?.length?requestedYears:[active.getUTCFullYear()]).filter(y=>Number.isInteger(y)&&y>=2020&&y<=2100))].sort((a,b)=>a-b);
 const monthIndices=[...new Set((requestedMonths?.length?requestedMonths:[active.getUTCMonth()+1]).filter(m=>Number.isInteger(m)&&m>=1&&m<=12).map(m=>m-1))].sort((a,b)=>a-b);
 if(!years.length||!monthIndices.length)throw Error('Selecione pelo menos um ano e um mês válidos');
 const year=years[0],monthIndex=monthIndices[0];
 const paises=[...new Set([...entrada,...faturamento,...carteira].map(r=>r.pais).filter(Boolean))].sort();
 const countries=new Set((requestedCountries||[]).map(normal).filter(Boolean));
 const paisPermitido=(pais:string)=>countries.size===0||countries.has(pais);
 const periodoPermitido=(dataStr:string)=>{const d=new Date(dataStr+'T00:00:00Z');return years.includes(d.getUTCFullYear())&&monthIndices.includes(d.getUTCMonth())};
 const filter=(rows:Item[])=>rows.filter(r=>periodoPermitido(r.data)&&paisPermitido(r.pais));
 const e=filter(entrada),f=filter(faturamento),c=filter(carteira);
 const tendencia=filter(tendenciaFaturamento);
 const metasEntrada=monthIndices.flatMap(idx=>metas(sheet(baseW,'METAS DE ENTRADA',0),year,idx)).filter(r=>paisPermitido(r.pais));
 const metasFaturamento=monthIndices.flatMap(idx=>metas(sheet(baseW,'METAS DE FATURAMENTO',0),year,idx)).filter(r=>paisPermitido(r.pais));
 const metaMap=consolidarMetas(tela==='faturamento'?metasFaturamento:metasEntrada);
 const base=tela==='faturamento'?f:e;
 const totals=sum(base);
 const valorMetas=[...metaMap.values()];
 const somaMetaPares=valorMetas.reduce((a,r)=>a+r.metaPares,0);
 const somaMetaValor=valorMetas.reduce((a,r)=>a+r.metaValor,0);
 const targets={pares:somaMetaPares>0?somaMetaPares:null,valor:somaMetaValor>0?somaMetaValor:null};
 const movimentos=agrupamento(base,r=>r.pais);
 const movMap=new Map(movimentos.map(r=>[r.nome,r]));
 const todosPaises=new Set([...movMap.keys(),...metaMap.keys()]);
 const porPais=[...todosPaises].sort().map(nome=>{
   const r=movMap.get(nome)||{nome,pares:0,valor:0,pedidos:0,clientes:0};
   const meta=metaMap.get(nome);
   const metaPares=meta?.temMetaPares?meta.metaPares:null;
   const metaValor=meta?.temMetaValor?meta.metaValor:null;
   return {...r,gerente:gerentes[nome]||'—',metaPares,metaValor,atingimentoPares:metaPares?100*r.pares/metaPares:null,atingimentoValor:metaValor?100*r.valor/metaValor:null};
 }).sort((a,b)=>b.valor-a.valor);
 const byCountry=porPais;
 const bounds:{inicio:string;fim:string;entrada:ReturnType<typeof sum>;faturamento:ReturnType<typeof sum>;carteira:ReturnType<typeof sum>}[]=[];
 for(const yy of years)for(const mm of monthIndices){
  let cur=sunday(new Date(Date.UTC(yy,mm,1)));const last=new Date(Date.UTC(yy,mm+1,0));
  while(cur<=last){const end=saturday(cur);
   const startLimit=new Date(Math.max(cur.getTime(),Date.UTC(yy,mm,1)));
   const endLimit=new Date(Math.min(end.getTime(),last.getTime()));
   const inside=(a:Item[])=>a.filter(x=>x.data>=iso(startLimit)&&x.data<=iso(endLimit));
   bounds.push({inicio:iso(startLimit),fim:iso(endLimit),entrada:sum(inside(e)),faturamento:sum(inside(f)),carteira:sum(inside(c))});
   cur=new Date(cur.getTime()+7*86400000);
  }
 }
 // Evolucao mensal calculada sobre os workbooks ja armazenados no buffer.
 // Mantem o ano escolhido para realizados. A BASE01 nao tem coluna de ano.
 const baseMensal=tela==='faturamento'?faturamento:entrada;
 const linhasMeta=sheet(baseW,tela==='faturamento'?'METAS DE FATURAMENTO':'METAS DE ENTRADA',0);
 const mensal=monthNames.map((nome,idx)=>{
  const realizados=sum(baseMensal.filter(r=>{
   const d=new Date(r.data+'T00:00:00Z');
   return years.includes(d.getUTCFullYear())&&d.getUTCMonth()===idx&&paisPermitido(r.pais);
  }));
  const mapaMeta=consolidarMetas(metas(linhasMeta,year,idx).filter(r=>paisPermitido(r.pais)));
  const grupos=[...mapaMeta.values()];
  const pares=grupos.reduce((a,x)=>a+x.metaPares,0);
  const valor=grupos.reduce((a,x)=>a+x.metaValor,0);
  const previsto=sum(tendenciaFaturamento.filter(r=>{
   const d=new Date(r.data+'T00:00:00Z');
   return years.includes(d.getUTCFullYear())&&d.getUTCMonth()===idx&&paisPermitido(r.pais);
  }));
  return {mes:idx+1,nome,metaPares:pares>0?pares:null,metaValor:valor>0?valor:null,
   realizadoPares:realizados.pares,realizadoValor:realizados.valor,
   tendenciaPares:previsto.pares,tendenciaValor:previsto.valor,
   totalProjetadoPares:realizados.pares+previsto.pares,totalProjetadoValor:realizados.valor+previsto.valor};
 });
 // Fechamento mensal: projeção por pais e cliente, sem consultas adicionais ao Drive.
 const porPaisFechamento=[...new Set([...e,...f,...tendencia].map(r=>r.pais))].sort().map(pais=>{
  const er=sum(e.filter(r=>r.pais===pais));const fr=sum(f.filter(r=>r.pais===pais));const tr=sum(tendencia.filter(r=>r.pais===pais));
  const me=consolidarMetas(metasEntrada).get(pais);
  const mf=consolidarMetas(metasFaturamento).get(pais);
  return {pais,entrada:er,faturamento:fr,tendencia:tr,metaEntradaPares:me?.temMetaPares?me.metaPares:null,metaEntradaValor:me?.temMetaValor?me.metaValor:null,metaFaturamentoPares:mf?.temMetaPares?mf.metaPares:null,metaFaturamentoValor:mf?.temMetaValor?mf.metaValor:null};
 });
 const porClienteFechamento=[...new Set([...e,...f,...tendencia].map(r=>r.cliente).filter(Boolean))].map(cliente=>({
  cliente,entrada:sum(e.filter(r=>r.cliente===cliente)),faturamento:sum(f.filter(r=>r.cliente===cliente)),tendencia:sum(tendencia.filter(r=>r.cliente===cliente))
 })).sort((a,b)=>(b.faturamento.valor+b.tendencia.valor+b.entrada.valor)-(a.faturamento.valor+a.tendencia.valor+a.entrada.valor));
 const clientes=agrupamento([...e,...f],r=>r.cliente).slice(0,250);
 const clientesDetalhados=tela==='clientes'?clientesHistoricos(linhasClientes,years,monthIndices,countries):undefined;
 return {tela,ano:year,mes:monthIndex+1,anosSelecionados:years,mesesSelecionados:monthIndices.map(n=>n+1),paisesSelecionados:[...countries],mensal,paises,porPaisFechamento,porClienteFechamento,metaEntradaFechamento:{pares:metasEntrada.reduce((s,r)=>s+r.metaPares,0),valor:metasEntrada.reduce((s,r)=>s+r.metaValor,0)},metaFaturamentoFechamento:{pares:metasFaturamento.reduce((s,r)=>s+r.metaPares,0),valor:metasFaturamento.reduce((s,r)=>s+r.metaValor,0)},selecionado:[...countries][0]||'',atualizadoReferencia:latest,totais:totals,meta:targets,entrada:sum(e),faturamento:sum(f),carteira:sum(c),tendencia:sum(tendencia),totalProjetado:{pares:sum(f).pares+sum(tendencia).pares,valor:sum(f).valor+sum(tendencia).valor},porPais:byCountry,porCliente:clientes,clientesDetalhados,porDia:agrupamento(base,r=>r.data).sort((a,b)=>a.nome.localeCompare(b.nome)),semanas:bounds,avisos:['Metas conforme BASE01.xlsx; países com meta zero ou ausente são exibidos como Sem meta definida. A aba de metas não possui coluna de ano; valide o período de referência.','Clientes agrupados por Razão Social, pois não há identificador único nas abas diárias.']};
}

// Buffer dos indicadores por tela, ano, mes e pais.
// Evita recomputar quando o usuario navega entre paginas.
const RESULTADO_TTL_MS=10*60*1000;
const RESULTADO_STALE_MS=6*60*60*1000;
type ExportResult=Awaited<ReturnType<typeof calcularExportData>>;
const resultadoBuffer=new Map<string,{value:ExportResult;updatedAt:number}>();
const resultadoPending=new Map<string,Promise<ExportResult>>();
export async function exportData(tela:string,anos?:number[],meses?:number[],paises?:string[],forcar=false):Promise<ExportResult>{
 // Nao normalizar em outro formato: mantem as regras de negocio existentes.
 const chave=JSON.stringify([tela,[...(anos||[])].sort(),[...(meses||[])].sort(),[...(paises||[])].map(normal).sort()]);
 const antigo=resultadoBuffer.get(chave);
 if(!forcar && antigo && Date.now()-antigo.updatedAt<RESULTADO_TTL_MS)return antigo.value;
 const pendente=resultadoPending.get(chave);
 if(pendente)return pendente;
 const tarefa=(async()=>{
   try{
     const novo=await calcularExportData(tela,anos,meses,paises);
     resultadoBuffer.set(chave,{value:novo,updatedAt:Date.now()});
     while(resultadoBuffer.size>32){const primeira=resultadoBuffer.keys().next().value;if(!primeira)break;resultadoBuffer.delete(primeira)}
     return novo;
   }catch(erro){
     if(antigo && Date.now()-antigo.updatedAt<RESULTADO_STALE_MS){
       console.warn('[export-buffer] Retornando ultimo resultado disponivel',chave,erro);
       return {...antigo.value,avisos:[...antigo.value.avisos,'Exibindo ultima carga disponivel: falha temporaria ao atualizar o Google Drive.']};
     }
     throw erro;
   }
 })();
 resultadoPending.set(chave,tarefa);
 try{return await tarefa}finally{resultadoPending.delete(chave)}
}
