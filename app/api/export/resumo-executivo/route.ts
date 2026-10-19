import {NextResponse} from 'next/server';
import {usuarioAtual,podeAcessar} from '../../../../lib/matinal-auth';

export const runtime='nodejs';
export const dynamic='force-dynamic';

type Pais = {pais:string;meta:number;projecao:number;metaPares:number;pares:number;mercado?:unknown;comercio?:unknown};
const num=(v:unknown)=>{const n=Number(v);return Number.isFinite(n)?n:0};
const valor=(n:number)=>'R$ '+n.toLocaleString('pt-BR',{minimumFractionDigits:2,maximumFractionDigits:2});
const pct=(n:number)=>n.toLocaleString('pt-BR',{minimumFractionDigits:1,maximumFractionDigits:1})+'%';
const canon=(v:unknown)=>String(v??'').trim().slice(0,120);
const recent=(obj:unknown,key:string):{ano:number;valor:number}|null=>{
 if(!obj||typeof obj!=='object')return null;
 const itens=(obj as {indicadores?:unknown}).indicadores;
 if(!Array.isArray(itens))return null;
 const i=itens.find(x=>x&&typeof x==='object'&&(x as {key?:string}).key===key);
 const serie=i?.serie;
 if(!Array.isArray(serie))return null;
 const pontos=serie.filter(x=>x&&Number.isFinite(Number(x.valor))&&Number.isFinite(Number(x.ano)));
 if(!pontos.length)return null;
 const ultimo=[...pontos].sort((a,b)=>Number(b.ano)-Number(a.ano))[0];
 return {ano:Number(ultimo.ano),valor:Number(ultimo.valor)};
};
const shSerie=(obj:unknown)=>{
 if(!obj||typeof obj!=='object')return [] as {ano:number;importacoesUsd:number;brasilUsd:number|null}[];
 const s=(obj as {serie?:unknown}).serie;
 if(!Array.isArray(s))return [];
 return s.filter(x=>x&&Number.isFinite(Number(x.ano))&&x.importacoesUsd!=null&&Number.isFinite(Number(x.importacoesUsd))).map(x=>({ano:num(x.ano),importacoesUsd:num(x.importacoesUsd),brasilUsd:x.brasilUsd==null?null:num(x.brasilUsd)})).sort((a,b)=>a.ano-b.ano);
};
function analisar(paises:Pais[],cenario:string,avisos:string[]){
 const totalMeta=paises.reduce((s,p)=>s+p.meta,0);
 const totalEstimado=paises.reduce((s,p)=>s+p.projecao,0);
 const gap=totalEstimado-totalMeta;
 const grupos=[...paises].sort((a,b)=>b.meta-a.meta);
 const deficit=[...paises].filter(p=>p.meta>0&&p.projecao<p.meta).sort((a,b)=>(a.projecao-a.meta)-(b.projecao-b.meta));
 const superavit=[...paises].filter(p=>p.meta>0&&p.projecao>=p.meta).sort((a,b)=>(b.projecao-b.meta)-(a.projecao-a.meta));
 const shDisponivel=paises.filter(p=>shSerie(p.comercio).length>0).length;
 const pibDisponivel=paises.filter(p=>recent(p.mercado,'pib')!==null).length;
 const linhas:string[]=[];
 linhas.push(`Visao consolidada. Cenario ${cenario}. Meta de 2027: ${valor(totalMeta)}. Estimativa quantitativa: ${valor(totalEstimado)}. Cobertura estimada: ${totalMeta?pct(totalEstimado/totalMeta*100):'indisponivel'}. Diferenca projetada: ${valor(gap)}.`);
 linhas.push(`${deficit.length} de ${paises.length} paises com estimativa abaixo da respectiva meta. A lacuna negativa e uma prioridade comercial, mas nao equivale a probabilidade calculada de perda.`);
 if(grupos.length){const quatro=grupos.slice(0,4),parcela=totalMeta?quatro.reduce((s,p)=>s+p.meta,0)/totalMeta*100:0;linhas.push(`Concentracao da meta: os quatro maiores mercados (${quatro.map(p=>p.pais).join(', ')}) representam ${pct(parcela)} da meta considerada. Acompanhamento concentrado nesses mercados pode reduzir exposicao a desvios relevantes.`)}
 if(deficit.length)linhas.push(`Maiores lacunas estimadas: ${deficit.slice(0,5).map(p=>`${p.pais} (${valor(p.projecao-p.meta)}; cobertura ${pct(p.projecao/p.meta*100)})`).join('; ')}. Priorizar validacao de carteira aberta, retorno de clientes recorrentes e prazos de embarque.`);
 if(superavit.length)linhas.push(`Mercados acima ou em linha com a meta: ${superavit.slice(0,5).map(p=>`${p.pais} (${pct(p.projecao/p.meta*100)})`).join('; ')}. Confirmar realizabilidade das encomendas antes de interpretar o excedente como receita garantida.`);
 linhas.push(`Disponibilidade de mercado externo: PIB observado em ${pibDisponivel}/${paises.length} paises; registros SH 64 em ${shDisponivel}/${paises.length}. SH 64 inclui calçados e componentes, nao exclusivamente calçados infantis.`);
 const destaques=paises.length<=3?paises: [...deficit.slice(0,3),...superavit.slice(0,2)];
 const unicos=[...new Map(destaques.map(p=>[p.pais,p])).values()];
 for(const p of unicos){
  const cobertura=p.meta?p.projecao/p.meta*100:0;
  const pib=recent(p.mercado,'pib'),infl=recent(p.mercado,'inflacao');
  const sh=shSerie(p.comercio);const ultimo=sh.at(-1);
  const anos=sh.length>=2?sh.slice(-2):[];
  const cresc=anos.length===2&&anos[0].importacoesUsd>0?(anos[1].importacoesUsd/anos[0].importacoesUsd-1)*100:null;
  const fatores=[pib?`PIB real ${pct(pib.valor)} (${pib.ano})`:'PIB nao disponivel',infl?`inflacao ${pct(infl.valor)} (${infl.ano})`:'inflacao nao disponivel',ultimo?`importacoes SH 64 US$ ${ultimo.importacoesUsd.toLocaleString('pt-BR',{maximumFractionDigits:0})} (${ultimo.ano})`:'SH 64 nao disponivel',cresc!==null?`variacao SH 64 ${pct(cresc)} entre ${anos[0].ano} e ${anos[1].ano}`:'sem dois anos validos para tendencia SH 64'];
  linhas.push(`${p.pais}: meta ${valor(p.meta)}, estimativa ${valor(p.projecao)}, diferenca ${valor(p.projecao-p.meta)}, cobertura ${pct(cobertura)}. Contexto externo: ${fatores.join('; ')}. ${cobertura<100?'Acao: revisar lacuna de pedidos e clientes com queda de recompra.':'Acao: confirmar carteira, prazo de entrega e estabilidade de demanda.'}`);
 }
 linhas.push('Metodologia: estimativa quantitativa recebida do painel, com pesos de 35% no faturamento de 2025 e 65% na anualizacao de janeiro a setembro de 2026 quando ambos existem; cenarios variam os valores em 10%. Essa formula e um modelo heuristico, NAO um modelo de Machine Learning treinado ou validado. O texto e produzido automaticamente por calculos sobre os dados, sem provedor externo. Indicadores macroeconomicos e SH 64 sao contexto e nao alteram a estimativa de vendas. Carteira aberta nao confirmada nao foi somada para evitar dupla contagem.');
 if(avisos.length)linhas.push('Alertas da base: '+avisos.slice(0,5).join('; '));
 return linhas.join('\n\n');
}
export async function POST(req:Request){
 try{
  const user=await usuarioAtual();
  if(!user)return NextResponse.json({erro:'Nao autenticado'},{status:401});
  if(!podeAcessar(user,'export'))return NextResponse.json({erro:'Acesso negado'},{status:403});
  const data=await req.json();
  if(!data||!Array.isArray(data.paises)||data.paises.length===0||data.paises.length>100)return NextResponse.json({erro:'Dados invalidos'},{status:400});
  const paises:Pais[]=data.paises.map((p:Record<string,unknown>)=>({pais:canon(p.pais),meta:num(p.meta),projecao:num(p.projecao),metaPares:num(p.metaPares),pares:num(p.pares),mercado:p.mercado,comercio:p.comercio}));
  const avisos=Array.isArray(data.avisos)?data.avisos.slice(0,10).map(canon):[];
  return NextResponse.json({texto:analisar(paises,canon(data.cenario),avisos),motor:'quantitativo-local'},{headers:{'Cache-Control':'private, no-store'}});
 }catch(e){console.error('[resumo executivo]',e);return NextResponse.json({erro:'Falha ao calcular resumo executivo'},{status:500});}
}
