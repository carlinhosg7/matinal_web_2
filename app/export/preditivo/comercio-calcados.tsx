'use client';
import {useEffect,useMemo,useState} from 'react';
import {ResponsiveContainer,BarChart,Bar,CartesianGrid,Legend,Tooltip,XAxis,YAxis,LineChart,Line} from 'recharts';
type Ano={ano:number;importacoesUsd:number|null;brasilUsd:number|null;erro:string|null};
type Fornecedor={nome:string;codigo:number;usd:number};
type Resultado={pais:string;serie:Ano[];fornecedores:Fornecedor[];anoFornecedores?:number;aviso:string;rankingAviso?:string;nota?:string;fonte:string;consultadoEm?:string};
const usd=(x:number|null)=>x===null?'Não disponível':new Intl.NumberFormat('pt-BR',{style:'currency',currency:'USD',maximumFractionDigits:0}).format(x);
const pct=(x:number)=>new Intl.NumberFormat('pt-BR',{style:'percent',minimumFractionDigits:1,maximumFractionDigits:1}).format(x);
const card:React.CSSProperties={borderRadius:12,padding:17,background:'#eff5fc',minWidth:0};
export default function ComercioCalcados({pais}:{pais:string}){
 const [dados,setDados]=useState<Resultado|null>(null),[erro,setErro]=useState(''),[loading,setLoading]=useState(false);
 useEffect(()=>{if(!pais){setDados(null);setErro('');return;}const ac=new AbortController();setLoading(true);setDados(null);setErro('');
 fetch(`/api/export/comercio-calcados?pais=${encodeURIComponent(pais)}`,{signal:ac.signal,cache:'no-store'}).then(async r=>{const d=await r.json();if(!r.ok)throw Error(d.erro||`HTTP ${r.status}`);return d as Resultado}).then(setDados).catch(e=>{if(e.name!=='AbortError')setErro(String(e.message))}).finally(()=>{if(!ac.signal.aborted)setLoading(false)});return ()=>ac.abort();},[pais]);
 const ult=useMemo(()=>dados?.serie.filter(x=>x.importacoesUsd!==null).at(-1),[dados]);
 const yoy=useMemo(()=>{if(!ult||!dados)return null;const prev=dados.serie.find(x=>x.ano===ult.ano-1);return prev?.importacoesUsd&&ult.importacoesUsd!==null?(ult.importacoesUsd-prev.importacoesUsd)/prev.importacoesUsd:null},[dados,ult]);
 if(!pais)return <section style={{marginTop:20,border:'1px dashed #afc1d8',borderRadius:12,padding:20}}>Selecione um país para consultar suas importações de calçados (SH 64).</section>;
 return <section style={{marginTop:20,borderTop:'1px solid #dbe3ed',paddingTop:20}}>
 <h3 style={{fontSize:19,margin:'0 0 9px'}}>Importações de calçados · {pais} · SH 64</h3>
 <p style={{fontSize:12,color:'#576b82',lineHeight:1.6}}>Consulta à UN Comtrade pelo país importador. Dados históricos em dólares, sujeitos à disponibilidade da API pública. O capítulo SH 64 não isola calçados infantis.</p>
 {loading&&<p>Consultando a UN Comtrade...</p>}{erro&&<p role="alert" style={{color:'#ad2b2b'}}>Falha ao consultar: {erro}. Os números não foram estimados.</p>}
 {dados&&<>
 <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(215px,1fr))',gap:12,margin:'16px 0'}}>
 <div style={card}><small>Importações SH 64 ({ult?.ano||'sem ano'})</small><strong style={{display:'block',fontSize:'clamp(15px,1.6vw,21px)',marginTop:8,overflowWrap:'anywhere'}}>{usd(ult?.importacoesUsd??null)}</strong></div>
 <div style={card}><small>Variação anual das importações</small><strong style={{display:'block',fontSize:23,marginTop:8}}>{yoy===null?'Não disponível':pct(yoy)}</strong></div>
 <div style={card}><small>Importações do Brasil ({ult?.ano||'sem ano'})</small><strong style={{display:'block',fontSize:'clamp(15px,1.6vw,21px)',marginTop:8,overflowWrap:'anywhere'}}>{usd(ult?.brasilUsd??null)}</strong></div>
 <div style={card}><small>Participação brasileira no mercado</small><strong style={{display:'block',fontSize:23,marginTop:8}}>{ult?.importacoesUsd&&ult.brasilUsd!==null?pct(ult.brasilUsd/ult.importacoesUsd):'Não disponível'}</strong></div>
 </div>
 <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(min(100%,410px),1fr))',gap:18}}>
 <div><h4>Importações anuais de calçados (US$)</h4><div style={{height:280}}><ResponsiveContainer width="100%" height="100%"><LineChart data={dados.serie}><CartesianGrid strokeDasharray="3 3" vertical={false}/><XAxis dataKey="ano"/><YAxis width={92} tickFormatter={(n:number)=>new Intl.NumberFormat('pt-BR',{notation:'compact',maximumFractionDigits:1}).format(n)}/><Tooltip formatter={(v)=>usd(typeof v==='number'?v:null)}/><Legend/><Line connectNulls={false} type="linear" dataKey="importacoesUsd" name="Importações do mundo" stroke="#1467a4" strokeWidth={3}/><Line connectNulls={false} type="linear" dataKey="brasilUsd" name="Origem Brasil" stroke="#e97816" strokeWidth={3}/></LineChart></ResponsiveContainer></div></div>
 <div><h4>Fornecedores identificados · {dados.anoFornecedores||2024}</h4>{dados.fornecedores.length?<div style={{height:280}}><ResponsiveContainer width="100%" height="100%"><BarChart layout="vertical" data={dados.fornecedores}><CartesianGrid strokeDasharray="3 3" horizontal={false}/><XAxis type="number" tickFormatter={(n:number)=>new Intl.NumberFormat('pt-BR',{notation:'compact',maximumFractionDigits:1}).format(n)}/><YAxis type="category" dataKey="nome" width={115} tick={{fontSize:11}}/><Tooltip formatter={(v)=>usd(typeof v==='number'?v:null)}/><Bar name="Importações (US$)" dataKey="usd" fill="#376b9f"/></BarChart></ResponsiveContainer></div>:<p style={{fontSize:13}}>Sem detalhamento confiável de fornecedores nesta consulta.</p>}</div>
 </div>
 <p style={{fontSize:12,color:'#6b4c17',lineHeight:1.6}}>{dados.aviso} {dados.rankingAviso}</p>
 <p style={{fontSize:12,color:'#5c7084',lineHeight:1.6}}>{dados.nota}</p>
 <a href={dados.fonte} target="_blank" rel="noopener noreferrer" style={{fontSize:13}}>Fonte: UN Comtrade ↗</a>
 </>}
 </section>
}
