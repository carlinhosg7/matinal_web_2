'use client';
import {useEffect,useMemo,useState} from 'react';
import {CartesianGrid,Line,LineChart,ResponsiveContainer,Tooltip,XAxis,YAxis,Legend} from 'recharts';

type Obs={ano:number;valor:number};
type Indicator={id:string;key:string;label:string;unit:string;serie:Obs[];erro:string|null};
type Res={pais:string;iso:string|null;indicadores:Indicator[];aviso?:string;fonte:string;consultadoEm?:string;nota?:string};
type Props={pais:string;metaValor:number;metaPares:number;historico2025:number;historico2026JanSet:number;projecao:number;carteiraRegistros:number};
const br=(x:number,d=1)=>x.toLocaleString('pt-BR',{minimumFractionDigits:d,maximumFractionDigits:d});
const grana=(x:number)=>x.toLocaleString('pt-BR',{style:'currency',currency:'BRL',maximumFractionDigits:2});
const painel:React.CSSProperties={background:'#f0f5fa',padding:15,borderRadius:12,minWidth:0};
export default function MercadoPais({pais,metaValor,metaPares,historico2025,historico2026JanSet,projecao,carteiraRegistros}:Props){
 const [dados,setDados]=useState<Res|null>(null);
 const [erro,setErro]=useState('');
 const [carregando,setCarregando]=useState(false);
 useEffect(()=>{
  if(!pais){setDados(null);setErro('');return;}
  const c=new AbortController();setCarregando(true);setErro('');setDados(null);
  fetch(`/api/export/mercado?pais=${encodeURIComponent(pais)}`,{signal:c.signal,cache:'no-store'}).then(async r=>{const v=await r.json();if(!r.ok)throw Error(v.erro||`HTTP ${r.status}`);return v as Res}).then(setDados).catch(e=>{if(e.name!=='AbortError')setErro(e.message||'Falha ao obter indicadores')}).finally(()=>{if(!c.signal.aborted)setCarregando(false)});
  return ()=>c.abort();
 },[pais]);
 const byKey=(key:string)=>dados?.indicadores.find(i=>i.key===key);
 const recent=(key:string)=>byKey(key)?.serie.at(-1);
 const format=(v:number,unit:string)=>unit==='%'?`${br(v,2)}%`:unit==='habitantes'?Math.round(v).toLocaleString('pt-BR'):new Intl.NumberFormat('pt-BR',{style:'currency',currency:'USD',maximumFractionDigits:0}).format(v);
 const serie=useMemo(()=>{
  const p=byKey('pib')?.serie||[],i=byKey('inflacao')?.serie||[];
  return [...new Set([...p,...i].map(x=>x.ano))].sort().map(ano=>({ano,pib:p.find(x=>x.ano===ano)?.valor??null,inflacao:i.find(x=>x.ano===ano)?.valor??null}));
 },[dados]);
 if(!pais)return <section style={{marginTop:14,padding:18,border:'1px dashed #bdcadd',borderRadius:12}}><strong>Selecione um país no filtro superior</strong><p style={{fontSize:13}}>Os dados econômicos e comerciais da KIDY serão exibidos especificamente para o mercado escolhido.</p></section>;
 const gap=projecao-metaValor;
 const pct=metaValor>0?projecao/metaValor*100:null;
 return <div style={{marginTop:12}}>
  <h3 style={{fontSize:18,margin:'4px 0 12px'}}>Mercado selecionado: {pais}</h3>
  <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(190px,1fr))',gap:10}}>
   <div style={painel}><small>Meta KIDY 2027</small><strong style={{display:'block',fontSize:20,marginTop:9}}>{grana(metaValor)}</strong><small>{Math.round(metaPares).toLocaleString('pt-BR')} pares</small></div>
   <div style={painel}><small>Projeção KIDY 2027</small><strong style={{display:'block',fontSize:20,marginTop:9}}>{grana(projecao)}</strong><small>{pct===null?'Sem meta':`${br(pct)}% da meta`}</small></div>
   <div style={painel}><small>Gap projetado KIDY</small><strong style={{display:'block',fontSize:20,marginTop:9,color:gap<0?'#a31d24':'#166534'}}>{grana(gap)}</strong><small>Não incorpora indicadores externos</small></div>
   <div style={painel}><small>Registros com entrega 2027</small><strong style={{display:'block',fontSize:20,marginTop:9}}>{carteiraRegistros.toLocaleString('pt-BR')}</strong><small>Saldo aberto não confirmado</small></div>
  </div>
  <p style={{fontSize:12,color:'#53657b'}}>Histórico KIDY neste país: 2025 = {grana(historico2025)}; janeiro a setembro de 2026 = {grana(historico2026JanSet)}. Valores conforme o planejamento carregado.</p>
  {carregando&&<p>Consultando indicadores específicos de {pais} no Banco Mundial...</p>}
  {erro&&<p style={{color:'#a31d24'}}>Não foi possível carregar o mercado: {erro}. As informações KIDY permanecem disponíveis.</p>}
  {dados&&<>
   {dados.aviso&&<p style={{color:'#8a5500'}}>{dados.aviso}</p>}
   <h3 style={{fontSize:16,margin:'20px 0 9px'}}>Indicadores publicados — {pais}</h3>
   <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(190px,1fr))',gap:10}}>
    {(['pib','inflacao','populacao','importacoesGerais'] as const).map(key=>{const i=byKey(key),obs=recent(key);return <div key={key} style={{...painel,background:'#fff',border:'1px solid #d6e1ed'}}><div style={{fontSize:12,color:'#52657b',minHeight:32}}>{i?.label??key}</div><strong style={{fontSize:22,display:'block',margin:'6px 0'}}>{obs?format(obs.valor,i!.unit):'Indisponível'}</strong><small>{obs?`Ano de referência: ${obs.ano}`:i?.erro?'Fonte temporariamente indisponível':'Sem dados publicados'}</small></div>})}
   </div>
   {serie.length>1&&<div style={{marginTop:20}}><strong>Histórico econômico do país — PIB e inflação (%)</strong><div style={{height:270,width:'100%',marginTop:12}}><ResponsiveContainer width="100%" height="100%"><LineChart data={serie}><CartesianGrid strokeDasharray="3 3"/><XAxis dataKey="ano"/><YAxis tickFormatter={v=>`${v}%`}/><Tooltip formatter={(v,name)=>[typeof v==='number'?`${br(v,2)}%`:'—',String(name)]}/><Legend/><Line dataKey="pib" name="PIB real (%)" stroke="#1667a4" connectNulls dot/><Line dataKey="inflacao" name="Inflação (%)" stroke="#e07810" connectNulls dot/></LineChart></ResponsiveContainer></div></div>}
   <div style={{border:'1px solid #d6e1ed',borderRadius:10,padding:13,marginTop:16,fontSize:13,lineHeight:1.7}}><strong>Leitura comercial — {pais}</strong><p style={{margin:'7px 0'}}>{gap<0?`A projeção histórica da KIDY está ${grana(Math.abs(gap))} abaixo da meta neste país. Prioridade: conferir carteira efetivamente aberta, recompra de clientes e oportunidades adicionais.`:`A projeção histórica da KIDY está ${grana(gap)} acima da meta. Prioridade: confirmar carteira, prazos e risco de conversão dos pedidos.`} {recent('pib')?`O último crescimento de PIB publicado é ${format(recent('pib')!.valor,'%')} (${recent('pib')!.ano}); isso é contexto macroeconômico, não previsão automática de vendas.`:'O crescimento econômico deste país não está disponível na fonte consultada.'}</p><p style={{margin:'7px 0'}}>Para demanda específica de calçados infantis ainda é necessário obter importações por classificação SH/NCM, ano e origem. O valor de <b>importações gerais</b> exibido acima não corresponde a calçados.</p></div>
   <p style={{fontSize:12,color:'#52657b'}}>Fonte: <a href={dados.fonte} target="_blank" rel="noopener noreferrer">Banco Mundial — {dados.iso||pais}</a>. Dados econômicos identificados pelo ano da observação. <a href="https://comtradeplus.un.org/" target="_blank" rel="noopener noreferrer">Consultar comércio de calçados no UN Comtrade</a>. Dados externos ainda não alteram a projeção KIDY.</p>
  </>}
 </div>;
}
