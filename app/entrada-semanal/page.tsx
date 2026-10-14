'use client';
import {useEffect,useState} from 'react';
import Link from 'next/link';
type Secao='NACIONAL'|'RN'|'B2B';
type Tipo='PRODUCAO'|'KIDEX';
type Linha={secao:Secao;regional:string;gerente:string;tipo:Tipo;meta:number;realizado:number};
type Semana={numero:number;inicio:number;fim:number;linhas:Linha[]};
type Api={periodo:string;semanas:Semana[];avisos:string[];erro?:string};
const fmt=(n:number)=>n.toLocaleString('pt-BR',{maximumFractionDigits:0});
const pct=(m:number,r:number)=>m?(r/m*100).toLocaleString('pt-BR',{minimumFractionDigits:2,maximumFractionDigits:2})+'%':'—';
const cell:React.CSSProperties={border:'1px solid #cbd5e1',padding:'10px 12px'};
export default function EntradaSemanal(){
 const [dados,setDados]=useState<Api|null>(null),[semana,setSemana]=useState(1),[segmento,setSegmento]=useState<Secao>('NACIONAL'),[erro,setErro]=useState('');
 useEffect(()=>{fetch('/api/entrada-semanal',{cache:'no-store'}).then(async r=>{const j=await r.json();if(!r.ok)throw Error(j.erro||'Falha ao carregar');setDados(j)}).catch(e=>setErro(e instanceof Error?e.message:String(e)))},[]);
 const atual=dados?.semanas.find(s=>s.numero===semana)||dados?.semanas[0];
 function tabela(titulo:string,tipo:'GERAL'|Tipo){
  const agrupados=new Map<string,Linha>();
  for(const l of atual?.linhas||[]){if(l.secao!==segmento||(tipo!=='GERAL'&&l.tipo!==tipo))continue;const key=l.regional;const prev=agrupados.get(key);if(prev){prev.meta+=l.meta;prev.realizado+=l.realizado}else agrupados.set(key,{...l})}
  const linhas=[...agrupados.values()].sort((a,b)=>a.regional.localeCompare(b.regional,'pt-BR'));
  const meta=linhas.reduce((s,l)=>s+l.meta,0),realizado=linhas.reduce((s,l)=>s+l.realizado,0);
  function linha(l:Linha,isTotal=false){return <tr key={l.regional} style={{fontWeight:isTotal?800:400,background:isTotal?'#eef2f7':'white'}}><td style={cell}>{l.regional}</td><td style={cell}>{l.gerente}</td><td style={{...cell,textAlign:'right'}}>{fmt(l.meta)}</td><td style={{...cell,textAlign:'right'}}>{fmt(l.realizado)}</td><td style={{...cell,textAlign:'right',background:l.realizado<l.meta?'#fee2e2':'#dcfce7'}}>{fmt(l.realizado-l.meta)}</td><td style={{...cell,textAlign:'right',background:l.realizado<l.meta?'#fee2e2':'#dcfce7'}}>{pct(l.meta,l.realizado)}</td></tr>}
  return <section key={titulo} style={{marginBottom:26}}><h2 style={{fontSize:18,background:'#90a9d3',textAlign:'center',padding:12,margin:0}}>{titulo}</h2><div style={{overflowX:'auto'}}><table style={{borderCollapse:'collapse',width:'100%',minWidth:750}}><thead><tr>{['REGIONAL','GERENTE','META SEMANA','REALIZADO SEMANA','DIF.','▲ %'].map(h=><th key={h} style={{...cell,background:'#f8fafc'}}>{h}</th>)}</tr></thead><tbody>{linhas.map(l=>linha(l))}{linha({secao:segmento,regional:'TOTAL',gerente:'—',tipo:'PRODUCAO',meta,realizado},true)}</tbody></table></div></section>;
 }
 const botao=(ativo:boolean):React.CSSProperties=>({padding:'11px 20px',border:0,borderRadius:7,cursor:'pointer',background:ativo?'#f97316':'#dbe2ed',color:ativo?'white':'#1f2937',fontWeight:700});
 return <main style={{background:'#f4f6f9',minHeight:'100vh',padding:'28px 18px',fontFamily:'Arial,sans-serif'}}><div style={{maxWidth:1150,margin:'auto'}}><Link href="/portal">← Voltar ao portal</Link><header style={{display:'flex',alignItems:'center',gap:22,margin:'22px 0'}}><img src="/kidy-logo.png" alt="KIDY" style={{width:110}}/><div><h1 style={{color:'#f97316',margin:0}}>ENTRADA SEMANAL</h1><strong>{dados?.periodo||'Carregando período...'}</strong></div></header><div style={{display:'flex',gap:8,flexWrap:'wrap',marginBottom:18}}>{(['NACIONAL','RN','B2B'] as Secao[]).map(s=><button key={s} onClick={()=>setSegmento(s)} style={botao(segmento===s)}>{s==='NACIONAL'?'Nacional':s}</button>)}</div>{erro&&<p role="alert" style={{color:'#b91c1c'}}>{erro}</p>}<div style={{display:'flex',gap:8,flexWrap:'wrap',marginBottom:24}}>{dados?.semanas.map(s=><button key={s.numero} onClick={()=>setSemana(s.numero)} style={botao(semana===s.numero)}>Semana {s.numero}</button>)}</div>{atual&&<><p style={{fontWeight:700}}>PERÍODO: {String(atual.inicio).padStart(2,'0')} A {String(atual.fim).padStart(2,'0')} / {dados?.periodo}</p>{tabela('GERAL','GERAL')}{tabela('PRODUÇÃO — PEDIDO NORMAL','PRODUCAO')}{tabela('PRONTA ENTREGA — KIDEX','KIDEX')}</>}{dados?.avisos?.map((a,i)=><p key={i} style={{fontSize:12,color:'#64748b'}}>{a}</p>)}</div></main>;
}
