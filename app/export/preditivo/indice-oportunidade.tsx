 'use client';
import {useEffect,useMemo,useState} from 'react';
import {ResponsiveContainer,BarChart,Bar,XAxis,YAxis,CartesianGrid,Tooltip} from 'recharts';

type SerieSH={ano:number;importacoesUsd:number|null;brasilUsd:number|null};
type Comercio={serie:SerieSH[];aviso?:string;nota?:string};
type Obs={ano:number;valor:number};
type Mercado={indicadores:{key:string;serie:Obs[]}[]};
type Fator={nome:string;valor:number|null;peso:number;detalhe:string};
const n=(v:number)=>new Intl.NumberFormat('pt-BR',{maximumFractionDigits:1}).format(v);
const usd=(v:number)=>new Intl.NumberFormat('pt-BR',{style:'currency',currency:'USD',maximumFractionDigits:0}).format(v);
const brl=(v:number)=>new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL',maximumFractionDigits:2}).format(v);
const limite=(n:number)=>Math.max(0,Math.min(100,n));
const cartao:React.CSSProperties={border:'1px solid #dce5f1',borderRadius:12,padding:16,background:'#f4f8fd'};
function ultimoMercado(m:Mercado|null,chave:string){return m?.indicadores?.find(i=>i.key===chave)?.serie?.filter(x=>Number.isFinite(x.valor)).sort((a,b)=>b.ano-a.ano)[0]||null;}
export default function IndiceOportunidade({pais,metaValor,projecao,historico2025,historico2026JanSet}:{pais:string;metaValor:number;projecao:number;historico2025:number;historico2026JanSet:number}){
 const [comercio,setComercio]=useState<Comercio|null>(null),[mercado,setMercado]=useState<Mercado|null>(null),[erros,setErros]=useState<string[]>([]),[loading,setLoading]=useState(false);
 useEffect(()=>{
  setComercio(null);setMercado(null);setErros([]);
  if(!pais)return;
  const ctrl=new AbortController();setLoading(true);
  const consultar=async(url:string)=>{const r=await fetch(url,{cache:'no-store',signal:ctrl.signal});const d=await r.json();if(!r.ok)throw Error(d.erro||`HTTP ${r.status}`);return d;};
  Promise.allSettled([
   consultar('/api/export/comercio-calcados?pais='+encodeURIComponent(pais)),
   consultar('/api/export/mercado?pais='+encodeURIComponent(pais))
  ]).then(r=>{if(ctrl.signal.aborted)return;
   if(r[0].status==='fulfilled')setComercio(r[0].value as Comercio);
   if(r[1].status==='fulfilled')setMercado(r[1].value as Mercado);
   setErros(r.flatMap((x,i)=>x.status==='rejected'?[`${i===0?'UN Comtrade':'Banco Mundial'}: ${String(x.reason)}`]:[]));
  }).finally(()=>{if(!ctrl.signal.aborted)setLoading(false)});
  return()=>ctrl.abort();
 },[pais]);
 const analise=useMemo(()=>{
  const serie=(comercio?.serie||[]).filter(s=>s.importacoesUsd!==null&&s.importacoesUsd>0).sort((a,b)=>a.ano-b.ano);
  const recente=serie.at(-1),anterior=recente?serie.find(s=>s.ano===recente.ano-1):undefined;
  const crescimento=recente&&anterior&&anterior.importacoesUsd?100*(recente.importacoesUsd!-anterior.importacoesUsd)/anterior.importacoesUsd:null;
  const presenca=recente&&recente.brasilUsd!==null?100*recente.brasilUsd!/recente.importacoesUsd!:null;
  const pib=ultimoMercado(mercado,'pib');
  const cobertura=metaValor>0?projecao/metaValor*100:null;
  // Transformation rules: 100 points at >=120% target coverage, >=20% import growth,
  // >=10% Brazil share, and >=6% real GDP growth. Floor at 0 in each scale.
  const fatores:Fator[]=[
   {nome:'KIDY / meta',valor:cobertura===null?null:limite(cobertura/120*100),peso:35,detalhe:cobertura===null?'Meta não disponível':`${n(cobertura)}% da meta KIDY`},
   {nome:'Mercado SH 64',valor:crescimento===null?null:limite((crescimento+10)/30*100),peso:35,detalhe:crescimento===null?'Dois anos consecutivos indisponíveis':`${n(crescimento)}% de crescimento (${anterior?.ano}–${recente?.ano})`},
   {nome:'Brasil no SH 64',valor:presenca===null?null:limite(presenca/10*100),peso:15,detalhe:presenca===null?'Comércio com Brasil indisponível':`${n(presenca)}% de participação brasileira (${recente?.ano})`},
   {nome:'PIB real',valor:pib===null?null:limite((pib.valor+3)/9*100),peso:15,detalhe:pib===null?'Indicador indisponível':`${n(pib.valor)}% em ${pib.ano}`},
  ];
  const coberturaDados=fatores.filter(x=>x.valor!==null).reduce((a,x)=>a+x.peso,0);
  const completo=coberturaDados===100;
  // Calculate a conditional weighted score from available indicators only.
  // Require at least two observations and 40% total factor weight.
  const qtdDisponivel=fatores.filter(f=>f.valor!==null).length;
  const indice=(coberturaDados>=40 && qtdDisponivel>=2)
    ?fatores.reduce((a,x)=>a+(x.valor===null?0:x.valor*x.peso),0)/coberturaDados
    :null;
  const fatoresDisponiveis=fatores.filter(x=>x.valor!==null);
  const melhor=fatoresDisponiveis.length?[...fatoresDisponiveis].sort((a,b)=>(b.valor||0)-(a.valor||0))[0]:null;
  const pior=fatoresDisponiveis.length?[...fatoresDisponiveis].sort((a,b)=>(a.valor||0)-(b.valor||0))[0]:null;
  return {fatores,coberturaDados,completo,indice,recente,anterior,crescimento,presenca,pib,cobertura,melhor,pior};
 },[comercio,mercado,metaValor,projecao]);
 if(!pais)return <section style={{...cartao,marginTop:20}}><h2 style={{marginTop:0}}>Índice de oportunidade comercial KIDY</h2><p>Selecione um país no filtro superior para analisar o potencial do mercado, os resultados KIDY e os indicadores internacionais.</p></section>;
 const diagnostico=analise.indice===null?'Dados insuficientes para pontuação':analise.completo?'Índice completo (heurístico)':'Índice parcial (heurístico; confiança limitada)';
 return <section style={{background:'#fff',border:'1px solid #dce5f1',borderRadius:16,padding:20,marginTop:18}}>
  <h2 style={{margin:'0 0 6px',fontSize:21}}>Índice de oportunidade comercial · {pais}</h2>
  <p style={{fontSize:13,color:'#536980'}}>Leitura exploratória de dados internos e mercado externo. Não representa previsão, recomendação automática de investimento ou probabilidade estatística.</p>
  {loading&&<p>Atualizando indicadores para {pais}...</p>}
  <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(min(100%,245px),1fr))',gap:12,margin:'18px 0'}}>
   <div style={cartao}><small>Índice de oportunidade</small><div style={{fontSize:'clamp(24px,3vw,36px)',fontWeight:800,marginTop:8}}>{analise.indice===null?'Não calculado':`${n(analise.indice)} / 100`}</div><small>{diagnostico}</small></div>
   <div style={cartao}><small>Completude dos indicadores</small><div style={{fontSize:28,fontWeight:800,marginTop:8}}>{analise.coberturaDados}%</div><small>{analise.completo?'Todos os fatores disponíveis':'Índice parcial: pesos disponíveis reponderados, não comparável diretamente com índice completo'}</small></div>
   <div style={cartao}><small>Meta KIDY 2027</small><div style={{fontSize:'clamp(17px,2vw,23px)',fontWeight:800,overflowWrap:'anywhere',marginTop:8}}>{brl(metaValor)}</div><small>Projeção histórica: {brl(projecao)}</small></div>
   <div style={cartao}><small>Mercado SH 64 ({analise.recente?.ano||'sem dados'})</small><div style={{fontSize:'clamp(17px,2vw,23px)',fontWeight:800,overflowWrap:'anywhere',marginTop:8}}>{analise.recente?.importacoesUsd==null?'Não disponível':usd(analise.recente.importacoesUsd)}</div><small>Capítulo SH 64, não apenas calçados infantis</small></div>
  </div>
  <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(min(100%,430px),1fr))',gap:16}}>
   <div style={{minHeight:300}}><h3 style={{fontSize:16}}>Pontuação dos fatores disponíveis</h3><div style={{height:245}}><ResponsiveContainer width="100%" height="100%"><BarChart layout="vertical" data={analise.fatores.filter(f=>f.valor!==null)} margin={{left:5,right:22,top:8,bottom:8}}><CartesianGrid strokeDasharray="3 3" horizontal={false}/><XAxis type="number" domain={[0,100]}/><YAxis type="category" dataKey="nome" width={120} tick={{fontSize:11}}/><Tooltip formatter={v=>`${n(Number(Array.isArray(v)?v[0]:v))} / 100`}/><Bar dataKey="valor" fill="#2563a6" radius={[0,5,5,0]}/></BarChart></ResponsiveContainer></div></div>
   <div><h3 style={{fontSize:16}}>Diagnóstico específico · {pais}</h3>
    <p style={{fontSize:13,lineHeight:1.7}}>{analise.crescimento!==null?`O mercado de calçados SH 64 variou ${n(analise.crescimento)}% entre ${analise.anterior?.ano} e ${analise.recente?.ano}.`:'A série de importações SH 64 ainda não possui dois anos consecutivos utilizáveis.'} {analise.presenca!==null?`O Brasil respondeu por ${n(analise.presenca)}% das importações SH 64 no último ano disponível.`:'A participação de fornecedores brasileiros não está disponível para o último ano.'}</p>
    <p style={{fontSize:13,lineHeight:1.7}}>{analise.cobertura!==null?`A projeção histórica da KIDY corresponde a ${n(analise.cobertura)}% da meta de 2027.`:'A meta KIDY não está disponível para comparação.'} {analise.pib?`O PIB real publicado variou ${n(analise.pib.valor)}% em ${analise.pib.ano}.`:'Não há valor publicado de PIB real nesta consulta.'}</p>
    {analise.melhor&&<p style={{fontSize:13}}><strong>Fator mais favorável na escala:</strong> {analise.melhor.nome} — {analise.melhor.detalhe}.</p>}
    {analise.pior&&<p style={{fontSize:13}}><strong>Ponto de atenção na escala:</strong> {analise.pior.nome} — {analise.pior.detalhe}.</p>}
    {erros.map((e,i)=><p key={i} style={{color:'#a12b2b',fontSize:12}}>{e}</p>)}
   </div>
  </div>
  <div style={{overflowX:'auto',marginTop:15}}><table style={{width:'100%',borderCollapse:'collapse',fontSize:13}}><thead><tr style={{background:'#eaf1f9'}}>{['Fator','Peso','Pontuação','Evidência'].map(k=><th key={k} style={{textAlign:'left',padding:10}}>{k}</th>)}</tr></thead><tbody>{analise.fatores.map(f=><tr key={f.nome} style={{borderBottom:'1px solid #e7edf5'}}><td style={{padding:10}}>{f.nome}</td><td style={{padding:10}}>{f.peso}%</td><td style={{padding:10}}>{f.valor===null?'Pendente':`${n(f.valor)} / 100`}</td><td style={{padding:10}}>{f.detalhe}</td></tr>)}</tbody></table></div>
  <p style={{fontSize:12,color:'#697a8f',lineHeight:1.7}}>Método: 35% cobertura da meta (100 pontos em 120% da meta); 35% crescimento SH 64 (0 pontos em −10%, 100 em +20%); 15% participação brasileira (100 pontos em 10%); 15% PIB real (0 em −3%, 100 em +6%). Valores limitados de 0 a 100. <strong>Quando existem pelo menos dois fatores cobrindo 40% dos pesos, exibimos um índice parcial, reponderando somente os fatores observados. Se a completude for inferior a 100%, não use a pontuação como ranking definitivo entre países.</strong> As escalas são heurísticas iniciais, ainda não validadas contra resultados de vendas. A carteira aberta não é incluída enquanto não for conciliada com o faturamento.</p>
  <p style={{fontSize:12,color:'#697a8f'}}>Fontes: <a href="https://comtradeplus.un.org/" target="_blank" rel="noreferrer">UN Comtrade</a> (SH 64) e <a href="https://data.worldbank.org/" target="_blank" rel="noreferrer">Banco Mundial</a>, mais o planejamento interno KIDY. Indicadores externos são carregados ao selecionar o país.</p>
 </section>;
}
