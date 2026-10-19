import {NextRequest,NextResponse} from 'next/server';
import {usuarioAtual} from '../../../../lib/matinal-auth';

export const runtime='nodejs';
export const dynamic='force-dynamic';

const COUNTRY:Record<string,string>={
 EQUADOR:'ECU',ARGENTINA:'ARG',PARAGUAI:'PRY',BOLIVIA:'BOL',LIBIA:'LBY',COLOMBIA:'COL',COSTARICA:'CRI',PERU:'PER',URUGUAI:'URY',GUATEMALA:'GTM',ISRAEL:'ISR',VENEZUELA:'VEN',SURINAME:'SUR',EMIRADOSARABESUNIDOS:'ARE',EMIRADOSARABES:'ARE',ILHASMAURICIO:'MUS',MAURICIO:'MUS',PANAMA:'PAN',LIBANO:'LBN',ELSALVADOR:'SLV',CHIPRE:'CYP',CHILE:'CHL',REPUBLICADOMINICANA:'DOM',NICARAGUA:'NIC',HONDURAS:'HND',MEXICO:'MEX',PORTUGAL:'PRT',ESTADOSUNIDOS:'USA',CUBA:'CUB',ANGOLA:'AGO',MOCAMBIQUE:'MOZ',MOZAMBIQUE:'MOZ',CURAÇAO:'CUW',CURACAO:'CUW',ARUBA:'ABW',BARBADOS:'BRB',TRINIDADEETOBAGO:'TTO',GUIANA:'GUY',JAMAICA:'JAM',PALESTINA:'PSE',CATAR:'QAT',QATAR:'QAT',KUWAIT:'KWT',ARABIASAUDITA:'SAU',CABOVERDE:'CPV',BAHAMAS:'BHS',COSTADOMARFIM:'CIV'
};
const normalize=(x:string)=>x.normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^A-Za-z0-9]/g,'').toUpperCase();
const indicators=[
 {id:'NY.GDP.MKTP.KD.ZG',key:'pib',label:'Crescimento do PIB real',unit:'%'},
 {id:'FP.CPI.TOTL.ZG',key:'inflacao',label:'Inflação ao consumidor',unit:'%'},
 {id:'SP.POP.TOTL',key:'populacao',label:'População total',unit:'habitantes'},
 {id:'TM.VAL.MRCH.CD.WT',key:'importacoesGerais',label:'Importações totais de mercadorias',unit:'US$'}
] as const;

type Obs={ano:number;valor:number};
async function consulta(iso:string,code:string):Promise<Obs[]>{
 const url=`https://api.worldbank.org/v2/country/${iso}/indicator/${code}?format=json&date=2019:2027&per_page=40`;
 const r=await fetch(url,{next:{revalidate:86400},signal:AbortSignal.timeout(12000)});
 if(!r.ok)throw Error(`Banco Mundial HTTP ${r.status}`);
 const data:unknown=await r.json();
 if(!Array.isArray(data)||!Array.isArray(data[1]))throw Error('Formato inesperado do Banco Mundial');
 return data[1].filter((x:unknown):x is {date:string;value:number}=>typeof x==='object'&&x!==null&&'date' in x&&'value' in x&&typeof (x as {date:unknown}).date==='string'&&typeof (x as {value:unknown}).value==='number').map((x:{date:string;value:number})=>({ano:Number(x.date),valor:x.value})).filter((x:Obs)=>Number.isFinite(x.ano)&&Number.isFinite(x.valor)).sort((a:Obs,b:Obs)=>a.ano-b.ano);
}
export async function GET(request:NextRequest){
 const user=await usuarioAtual();
 if(!user)return NextResponse.json({erro:'Nao autenticado'},{status:401});
 if(user.perfil!=='ADMINISTRADOR' && !user.telas.some(t=>String(t)==='export'))return NextResponse.json({erro:'Sem permissao para Exportacao'},{status:403});
 const nome=(request.nextUrl.searchParams.get('pais')||'').slice(0,100).trim();
 if(!nome)return NextResponse.json({erro:'Selecione um pais'},{status:400});
 const iso=COUNTRY[normalize(nome)];
 if(!iso)return NextResponse.json({pais:nome,iso:null,indicadores:[],aviso:'Pais ainda nao mapeado para a API do Banco Mundial',fonte:'https://data.worldbank.org/'},{headers:{'Cache-Control':'private, no-store'}});
 const results=await Promise.all(indicators.map(async item=>{
  try{return {...item,serie:await consulta(iso,item.id),erro:null}}catch(e){return {...item,serie:[] as Obs[],erro:e instanceof Error?e.message:'Erro de consulta'}}
 }));
 return NextResponse.json({pais:nome,iso,indicadores:results,fonte:`https://data.worldbank.org/country/${iso.toLowerCase()}`,consultadoEm:new Date().toISOString(),nota:'Sao observacoes publicadas com ano de referencia; nao sao previsoes da KIDY nem importacoes especificas de calcados. Dados 2027 so aparecem se a fonte os disponibilizar.'},{headers:{'Cache-Control':'private, no-store'}});
}
