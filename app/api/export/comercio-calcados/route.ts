import {NextRequest,NextResponse} from 'next/server';
import {usuarioAtual} from '../../../../lib/matinal-auth';
export const runtime='nodejs';
export const dynamic='force-dynamic';

// M49 UN Comtrade codes; use importer's declarations (flow M), not Brazilian exports.
const PAISES:Record<string,number>={
 EQUADOR:218,ARGENTINA:32,PARAGUAI:600,BOLIVIA:68,LIBIA:434,
 COLOMBIA:170,COSTARICA:188,PERU:604,URUGUAI:858,GUATEMALA:320,
 ISRAEL:376,VENEZUELA:862,SURINAME:740,EMIRADOSARABESUNIDOS:784,
 EMIRADOSARABES:784,ILHASMAURICIO:480,MAURICIO:480,PANAMA:591,
 LIBANO:422,ELSALVADOR:222,CHIPRE:196,CHILE:152,
 REPUBLICADOMINICANA:214,NICARAGUA:558,HONDURAS:340,MEXICO:484,
 PORTUGAL:620,ESTADOSUNIDOS:842,CUBA:192,ANGOLA:24,MOCAMBIQUE:508,
 MOZAMBIQUE:508,ARUBA:533,BARBADOS:52,TRINIDADEETOBAGO:780,
 GUIANA:328,JAMAICA:388,PALESTINA:275,CATAR:634,QATAR:634,
 KUWAIT:414,ARABIASAUDITA:682,CABOVERDE:132,BAHAMAS:44
};
const norm=(s:string)=>s.normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^A-Z0-9]/gi,'').toUpperCase();
type Registro={period?:string|number;cmdCode?:string;partnerCode?:number;partnerDesc?:string;primaryValue?:number;netWgt?:number;isAggregate?:boolean;customsCode?:string;motCode?:number;partner2Code?:number};
type Resposta={data?:Registro[];count?:number;error?:string;message?:string};
async function buscar(code:number,ano:number,partner:number|string):Promise<Registro[]>{
 const qs=new URLSearchParams({period:String(ano),reportercode:String(code),cmdCode:'64',flowCode:'M',partnerCode:String(partner),maxRecords:'500'});
 const url=`https://comtradeapi.un.org/public/v1/preview/C/A/HS?${qs}`;
 const resp=await fetch(url,{next:{revalidate:86400},signal:AbortSignal.timeout(18000)});
 if(!resp.ok)throw new Error(`UN Comtrade HTTP ${resp.status}`);
 const dados:Resposta=await resp.json();
 if(dados.error||!Array.isArray(dados.data))throw Error(dados.error||dados.message||'Resposta inesperada');
 // Avoid summing multiple customs/modes/breakdowns; prefer the explicitly reported world/partner aggregate.
 return dados.data.filter(x=>String(x.cmdCode)==='64' && typeof x.primaryValue==='number' && Number.isFinite(x.primaryValue));
}
function valorUnico(linhas:Registro[],partner:number){
 const linhasParceiro=linhas.filter(x=>Number(x.partnerCode)===partner);
 const padrao=linhasParceiro.find(x=>(!x.customsCode||x.customsCode==='C00')&&(!x.motCode||x.motCode===0)&&(!x.partner2Code||x.partner2Code===0));
 return padrao?.primaryValue??linhasParceiro[0]?.primaryValue??null;
}
export async function GET(req:NextRequest){
 const user=await usuarioAtual();
 if(!user)return NextResponse.json({erro:'Nao autenticado'},{status:401});
 if(user.perfil!=='ADMINISTRADOR'&&!user.telas.some(t=>String(t)==='export'))return NextResponse.json({erro:'Acesso negado'},{status:403});
 const pais=(req.nextUrl.searchParams.get('pais')||'').trim().slice(0,90);
 const codigo=PAISES[norm(pais)];
 if(!codigo)return NextResponse.json({pais,serie:[],fornecedores:[],aviso:'País não mapeado ou não selecionado.',fonte:'UN Comtrade'}, {headers:{'Cache-Control':'private, no-store'}});
 const anos=[2023,2024,2025];
 const serie=await Promise.all(anos.map(async ano=>{
  const r=await Promise.allSettled([buscar(codigo,ano,0),buscar(codigo,ano,76)]);
  return {ano,importacoesUsd:r[0].status==='fulfilled'?valorUnico(r[0].value,0):null,
   brasilUsd:r[1].status==='fulfilled'?valorUnico(r[1].value,76):null,
   erro:r.some(x=>x.status==='rejected')?'Uma ou mais consultas indisponíveis':null};
 }));
 // Supplier breakdown: preview can truncate results; never claim a definitive ranking.
 let fornecedores:{nome:string;codigo:number;usd:number}[]=[];let rankingAviso='';
 try{
  const rows=await buscar(codigo,2024,'all');
  const mapa=new Map<number,{nome:string;codigo:number;usd:number}>();
  for(const x of rows){const id=Number(x.partnerCode);if(!id||id===0||id===codigo||!Number.isFinite(id))continue;
   if(x.customsCode&&x.customsCode!=='C00')continue;
   if(x.motCode&&x.motCode!==0)continue;
   if(x.partner2Code&&x.partner2Code!==0)continue;
   const atual=mapa.get(id);if(!atual||x.primaryValue!>atual.usd)mapa.set(id,{nome:x.partnerDesc||`Código ${id}`,codigo:id,usd:x.primaryValue!});
  }
  fornecedores=[...mapa.values()].sort((a,b)=>b.usd-a.usd).slice(0,8);
  rankingAviso='Amostra da API pública (máx. 500 linhas). A lista pode ser incompleta e NÃO é ranking oficial definitivo.';
 }catch{rankingAviso='Detalhamento de fornecedores não disponível nesta consulta pública.'}
 const disponiveis=serie.filter(x=>x.importacoesUsd!==null);
 return NextResponse.json({pais,codigo,sh:'64',unidade:'US$',serie,fornecedores,anoFornecedores:2024,
  fonte:'https://comtradeplus.un.org/',consultadoEm:new Date().toISOString(),rankingAviso,
  aviso:disponiveis.length?'Importações reportadas pelo país importador; série sujeita a revisões. SH 64 agrega todos os tipos de calçados e componentes, não somente infantis.':'Sem série SH 64 retornada pela API pública. Não interpretar ausência como zero.',
  nota:'Dados observados, não previsões para 2027. A cobertura dos parceiros pode ser parcial; nenhuma série está incorporada automaticamente ao modelo da KIDY.'
 },{headers:{'Cache-Control':'private, no-store'}});
}
