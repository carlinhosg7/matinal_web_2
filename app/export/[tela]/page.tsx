'use client';
import FechamentoMensal from './FechamentoMensal';
import {useEffect,useRef,useState} from 'react';
import Link from 'next/link';
import {useParams} from 'next/navigation';

type Metric={pares:number;valor:number;pedidos:number;clientes:number};
type Row={nome:string;pares:number;valor:number;pedidos:number;clientes:number;gerente?:string;metaPares?:number|null;metaValor?:number|null;atingimentoValor?:number|null;atingimentoPares?:number|null};
type LinhaMensal={mes:number;nome:string;metaPares:number|null;metaValor:number|null;realizadoPares:number;realizadoValor:number;tendenciaPares?:number;tendenciaValor?:number;totalProjetadoPares?:number;totalProjetadoValor?:number};
type Semana={inicio:string;fim:string;entrada:Metric;faturamento:Metric;carteira:Metric};
type ClienteDetalhado={codigo:string;nome:string;pais:string;pares:number;valor:number;ultimaCompra:string;participacaoParesPais:number|null;participacaoValorPais:number|null;participacaoParesGeral:number|null;participacaoValorGeral:number|null};
type Dados={clientesDetalhados?:{linhas:ClienteDetalhado[];totalGeral:{pares:number;valor:number};totalSelecionado:{pares:number;valor:number};quantidade:number};ano:number;mes:number;mensal?:LinhaMensal[];paises:string[];selecionado:string;atualizadoReferencia:string;totais:Metric;meta:{pares:number|null;valor:number|null};entrada:Metric;faturamento:Metric;carteira:Metric;tendencia?:Metric;totalProjetado?:{pares:number;valor:number};porPais:Row[];porCliente:Row[];porDia:Row[];semanas:Semana[];avisos:string[];porPaisFechamento?:any[];porClienteFechamento?:any[];metaEntradaFechamento?:{pares:number;valor:number};metaFaturamentoFechamento?:{pares:number;valor:number}};
const menu=[['entrada','Entrada'],['faturamento','Faturamento'],['clientes','Clientes'],['fechamento-semanal','Fechamento Semanal']];
const meses=['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];
const fmt=(n:number)=>Number(n||0).toLocaleString('pt-BR',{maximumFractionDigits:0});
const money=(n:number)=>Number(n||0).toLocaleString('pt-BR',{style:'currency',currency:'BRL',maximumFractionDigits:2});
const targetMoney=(v:number|null)=>v===null?'Sem meta definida':money(v);
const targetPares=(v:number|null)=>v===null?'Sem meta definida':fmt(v);
const pct=(v:number|null)=>v===null?'—':v.toLocaleString('pt-BR',{maximumFractionDigits:1})+'%';
const short=(s:string)=>s.split('-').reverse().join('/');
function Table({rows,client=false}:{rows:Row[];client?:boolean}){return <div style={{overflowX:'auto',borderRadius:10,background:'#fff'}}><table style={{width:'100%',borderCollapse:'collapse',minWidth:650}}><thead><tr style={{background:'#8ea9d2',color:'#102544'}}>{[client?'CLIENTE':'PAÍS','PARES','VALOR','PEDIDOS'].map(s=><th key={s} style={{padding:13,textAlign:s==='PARES'||s==='VALOR'||s==='PEDIDOS'?'right':'left'}}>{s}</th>)}</tr></thead><tbody>{rows.map((r,i)=><tr key={r.nome+i} style={{background:i%2?'#f5f7fb':'#fff',borderBottom:'1px solid #e1e7ef'}}><td style={{padding:11}}>{r.nome}</td><td style={{padding:11,textAlign:'right'}}>{fmt(r.pares)}</td><td style={{padding:11,textAlign:'right'}}>{money(r.valor)}</td><td style={{padding:11,textAlign:'right'}}>{fmt(r.pedidos)}</td></tr>)}</tbody></table></div>}
function CountryTable({rows}:{rows:Row[]}){return <div style={{overflowX:'auto',borderRadius:10,background:'#fff'}}><table style={{width:'100%',borderCollapse:'collapse',minWidth:980}}><thead><tr style={{background:'#8ea9d2',color:'#102544'}}>{['PAÍS','REALIZADO (PARES)','META (PARES)','REALIZADO (R$)','META (R$)','ATINGIMENTO (R$)','PEDIDOS'].map(h=><th key={h} style={{padding:12,textAlign:h==='PAÍS'?'left':'right'}}>{h}</th>)}</tr></thead><tbody>{rows.map((r,i)=><tr key={r.nome+i} style={{background:i%2?'#f5f7fb':'#fff',borderBottom:'1px solid #e1e7ef'}}><td style={{padding:10}}>{r.nome}</td><td style={{padding:10,textAlign:'right'}}>{fmt(r.pares)}</td><td style={{padding:10,textAlign:'right'}}>{targetPares(r.metaPares??null)}</td><td style={{padding:10,textAlign:'right'}}>{money(r.valor)}</td><td style={{padding:10,textAlign:'right'}}>{targetMoney(r.metaValor??null)}</td><td style={{padding:10,textAlign:'right'}}>{pct(r.atingimentoValor??null)}</td><td style={{padding:10,textAlign:'right'}}>{fmt(r.pedidos)}</td></tr>)}</tbody></table></div>}

const bandeiras:Record<string,string>={ARGENTINA:'ar',BOLIVIA:'bo',BRASIL:'br',CANADA:'ca',CHILE:'cl',COLOMBIA:'co',COSTARICA:'cr',ELSALVADOR:'sv',EMIRADOSARABESUNID:'ae',EQUADOR:'ec',ESTADOSUNIDOS:'us',GUATEMALA:'gt',GUIANA:'gy',ILHASMAURICIO:'mu',ISRAEL:'il',ITALIA:'it',LIBIA:'ly',PANAMA:'pa',PARAGUAI:'py',PERU:'pe',REPUBLICADOMINICANA:'do',SURINAME:'sr',URUGUAI:'uy',VENEZUELA:'ve',ANGOLA:'ao',CHIPRE:'cy',NICARAGUA:'ni',LIBANO:'lb',COSTADOMARFIM:'ci',AFRICADOSUL:'za'};
function Flag({pais}:{pais:string}){
 const nome=pais.replace(/[^A-Z0-9]/g,'');const iso=bandeiras[nome];
 return <section style={{display:'flex',alignItems:'center',justifyContent:'center',gap:18,margin:'15px 0 20px',padding:'10px 18px',border:'2px solid #111',borderRadius:12,background:'white'}}>
  <strong style={{fontSize:23,color:'#172e4a',textAlign:'center'}}>{pais||'EXPORTAÇÃO — TODOS OS PAÍSES'}</strong>
  {pais&&(iso?<img src={'https://flagcdn.com/w160/'+iso+'.png'} alt={'Bandeira: '+pais} width={96} height={64} style={{objectFit:'contain'}}/>:<span aria-label="Bandeira não disponível" style={{fontSize:40}}>🌐</span>)}
 </section>
}
function Kpi({titulo,valor,negativo=false}:{titulo:string;valor:string;negativo?:boolean}){
 return <div style={{background:negativo?'#e9b8ba':'#fff',border:'3px solid #111',borderRadius:16,padding:'10px 8px',textAlign:'center',minHeight:73,display:'flex',flexDirection:'column',justifyContent:'center',boxSizing:'border-box'}}>
  <div style={{fontWeight:800,fontSize:15,color:'#050505'}}>{titulo}</div>
  <div style={{fontWeight:900,fontSize:22,color:'#272727',marginTop:3,overflowWrap:'anywhere'}}>{valor}</div>
 </div>
}
function CardsEntrada({dados}:{dados:Dados}){
 const metaP=dados.meta.pares,metaV=dados.meta.valor,realP=dados.entrada.pares,realV=dados.entrada.valor;
 const percentage=(r:number,m:number|null)=>m!==null&&m>0?pct(r/m*100):'—';
 const difference=(r:number,m:number|null,moeda=false)=>m===null?'—':moeda?money(r-m):fmt(r-m);
 const linhas=[
  [{titulo:'META PARES',valor:targetPares(metaP)},{titulo:'REALIZADO PARES',valor:fmt(realP)},{titulo:'DIFERENÇA PARES',valor:difference(realP,metaP),negativo:metaP!==null&&realP<metaP},{titulo:'% ATINGIDO',valor:percentage(realP,metaP)}],
  [{titulo:'META VALOR',valor:targetMoney(metaV)},{titulo:'REALIZADO VALOR',valor:money(realV)},{titulo:'DIFERENÇA VALOR',valor:difference(realV,metaV,true),negativo:metaV!==null&&realV<metaV},{titulo:'% ATINGIDO',valor:percentage(realV,metaV)}]
 ];
 return <section style={{background:'#d3d3d3',border:'2px solid #111',padding:'14px 4%',margin:'18px 0 22px'}}>
  {linhas.map((linha,i)=><div key={i} style={{display:'grid',gridTemplateColumns:'repeat(4,minmax(0,1fr))',gap:12,marginBottom:13}}>{linha.map(k=><Kpi key={k.titulo} {...k}/>)}</div>)}
  <div style={{maxWidth:230,margin:'auto'}}><Kpi titulo="PREÇO MÉDIO" valor={realP>0?money(realV/realP):'—'}/></div>
 </section>
}
function CardsFaturamento({dados}:{dados:Dados}){
 const metaP=dados.meta.pares,metaV=dados.meta.valor;
 const fat=dados.faturamento,prev=dados.tendencia||{pares:0,valor:0,pedidos:0,clientes:0};
 const totalP=fat.pares+prev.pares,totalV=fat.valor+prev.valor;
 const percentual=(v:number,m:number|null)=>m!==null&&m>0?pct(100*v/m):'—';
 const dif=(v:number,m:number|null,moeda=false)=>m===null?'—':moeda?money(v-m):fmt(v-m);
 const linhas=[
  [{titulo:'META PARES',valor:targetPares(metaP)},{titulo:'REALIZADO PARES',valor:fmt(fat.pares)},{titulo:'DIFERENÇA PARES',valor:dif(fat.pares,metaP),negativo:metaP!==null&&fat.pares<metaP},{titulo:'% ATINGIDO',valor:percentual(fat.pares,metaP)}],
  [{titulo:'CARTEIRA PARES',valor:fmt(prev.pares)},{titulo:'TENDÊNCIA PARES',valor:fmt(totalP)},{titulo:'TENDÊNCIA %',valor:percentual(totalP,metaP)},{titulo:'FALTA BUSCAR',valor:dif(totalP,metaP),negativo:metaP!==null&&totalP<metaP}],
  [{titulo:'META VALOR',valor:targetMoney(metaV)},{titulo:'REALIZADO VALOR',valor:money(fat.valor)},{titulo:'DIFERENÇA VALOR',valor:dif(fat.valor,metaV,true),negativo:metaV!==null&&fat.valor<metaV},{titulo:'% ATINGIDO',valor:percentual(fat.valor,metaV)}],
  [{titulo:'CARTEIRA VALOR',valor:money(prev.valor)},{titulo:'TENDÊNCIA VALOR',valor:money(totalV)},{titulo:'TENDÊNCIA %',valor:percentual(totalV,metaV)},{titulo:'FALTA BUSCAR',valor:dif(totalV,metaV,true),negativo:metaV!==null&&totalV<metaV}]
 ];
 return <section style={{background:'#d3d3d3',border:'2px solid #111',padding:'14px 4%',margin:'18px 0 22px'}}>
 {linhas.map((linha,i)=><div key={i} style={{display:'grid',gridTemplateColumns:'repeat(4,minmax(0,1fr))',gap:12,marginBottom:i===1?30:13}}>{linha.map((k,j)=><Kpi key={i+'-'+j} {...k}/>)}</div>)}
 <div style={{maxWidth:230,margin:'auto'}}><Kpi titulo="PREÇO MÉDIO" valor={fat.pares>0?money(fat.valor/fat.pares):'—'}/></div>
 </section>
}
function TabelaMensalFaturamento({dados,tipo}:{dados:Dados;tipo:'pares'|'valor'}){
 const moeda=tipo==='valor';const mostrar=(v:number)=>moeda?money(v):fmt(v);
 const linhas=(dados.mensal||[]).map(l=>({nome:meses[l.mes-1],meta:moeda?l.metaValor:l.metaPares,realizado:moeda?l.realizadoValor:l.realizadoPares,tendencia:moeda?(l.tendenciaValor||0):(l.tendenciaPares||0)}));
 const somaMeta=linhas.reduce((a,l)=>a+(l.meta||0),0),somaReal=linhas.reduce((a,l)=>a+l.realizado,0),somaTend=linhas.reduce((a,l)=>a+l.tendencia,0);
 const coluna=['MÊS',moeda?'META FATURAMENTO (R$)':'META FATURAMENTO (PARES)',moeda?'FATURADO (R$)':'FATURADO (PARES)',moeda?'TENDÊNCIA (R$)':'TENDÊNCIA (PARES)','TOTAL PROJETADO','FALTA BUSCAR','% PROJETADO'];
 const celula:React.CSSProperties={padding:'6px',border:'1px solid #a1b3c3',textAlign:'right'};
 return <div style={{flex:'1 1 510px',minWidth:0,overflowX:'auto',border:'2px solid #111',background:'#fff'}}><table style={{borderCollapse:'collapse',width:'100%',minWidth:680,fontSize:12}}>
 <thead><tr style={{background:'#66b3e8'}}>{coluna.map((c,i)=><th key={c} style={{...celula,textAlign:i?'right':'left',borderColor:'#205687'}}>{c}</th>)}</tr></thead>
 <tbody>{linhas.map((l,i)=><tr key={l.nome} style={{background:i%2?'#edf3fa':'#fff',fontWeight:600}}><td style={{...celula,textAlign:'left'}}>{l.nome}</td><td style={celula}>{l.meta===null?'Sem meta':mostrar(l.meta)}</td><td style={celula}>{mostrar(l.realizado)}</td><td style={celula}>{mostrar(l.tendencia)}</td><td style={celula}>{mostrar(l.realizado+l.tendencia)}</td><td style={celula}>{l.meta===null?'—':mostrar(l.realizado+l.tendencia-l.meta)}</td><td style={celula}>{l.meta&&l.meta>0?pct(100*(l.realizado+l.tendencia)/l.meta):'—'}</td></tr>)}</tbody>
 <tfoot><tr style={{background:'#164578',color:'#fff',fontWeight:800}}><td style={{...celula,textAlign:'left'}}>TOTAL</td><td style={celula}>{somaMeta?mostrar(somaMeta):'Sem meta'}</td><td style={celula}>{mostrar(somaReal)}</td><td style={celula}>{mostrar(somaTend)}</td><td style={celula}>{mostrar(somaReal+somaTend)}</td><td style={celula}>{somaMeta?mostrar(somaReal+somaTend-somaMeta):'—'}</td><td style={celula}>{somaMeta?pct(100*(somaReal+somaTend)/somaMeta):'—'}</td></tr></tfoot>
 </table></div>
}
function TabelaMensal({dados,tipo}:{dados:Dados;tipo:'pares'|'valor'}){
 const linhas=dados.mensal||[];
 const moeda=tipo==='valor';
 const valores=linhas.map(l=>({nome:meses[l.mes-1],meta:moeda?l.metaValor:l.metaPares,realizado:moeda?l.realizadoValor:l.realizadoPares}));
 const somaMeta=valores.reduce((s,l)=>s+(l.meta||0),0),somaReal=valores.reduce((s,l)=>s+l.realizado,0);
 const mostrar=(n:number)=>moeda?money(n):fmt(n);
 return <div style={{overflowX:'auto',border:'2px solid #111',background:'#fff',flex:'1 1 470px',minWidth:0}}>
 <table style={{borderCollapse:'collapse',width:'100%',fontSize:12,minWidth:510}}>
  <thead><tr style={{background:'#66b3e8',color:'#061b32'}}>{['Mês',moeda?'META ENTRADA VLR':'META ENTRADA',moeda?'REALIZADO VALOR':'REALIZADO PARES',moeda?'DIFERENÇA VALORES':'DIFERENÇA PARES','% ATINGIDO'].map(h=><th key={h} style={{border:'1px solid #205687',padding:7,textAlign:h==='Mês'?'left':'right'}}>{h}</th>)}</tr></thead>
  <tbody>{valores.map((l,i)=><tr key={l.nome} style={{background:i%2?'#edf3fa':'#fff',fontWeight:600}}><td style={{padding:7,border:'1px solid #a1b3c3'}}>{l.nome}</td><td style={{padding:7,border:'1px solid #a1b3c3',textAlign:'right'}}>{l.meta===null?'Sem meta':mostrar(l.meta)}</td><td style={{padding:7,border:'1px solid #a1b3c3',textAlign:'right'}}>{mostrar(l.realizado)}</td><td style={{padding:7,border:'1px solid #a1b3c3',textAlign:'right'}}>{l.meta===null?'—':mostrar(l.realizado-l.meta)}</td><td style={{padding:7,border:'1px solid #a1b3c3',textAlign:'right'}}>{l.meta&&l.meta>0?pct(l.realizado/l.meta*100):'—'}</td></tr>)}</tbody>
  <tfoot><tr style={{background:'#164578',color:'white',fontWeight:800}}><td style={{padding:9}}>TOTAL</td><td style={{textAlign:'right',padding:9}}>{somaMeta?mostrar(somaMeta):'Sem meta'}</td><td style={{textAlign:'right',padding:9}}>{mostrar(somaReal)}</td><td style={{textAlign:'right',padding:9}}>{somaMeta?mostrar(somaReal-somaMeta):'—'}</td><td style={{textAlign:'right',padding:9}}>{somaMeta?pct(somaReal/somaMeta*100):'—'}</td></tr></tfoot>
 </table></div>
}
function MultiFiltro({titulo,opcoes,selecionados,mudar,todosEquivaleVazio}:{titulo:string;opcoes:{value:string;label:string}[];selecionados:string[];mudar:(v:string[])=>void;todosEquivaleVazio:boolean}){
 const [aberto,setAberto]=useState(false);
 const ref=useRef<HTMLDivElement>(null);
 useEffect(()=>{function fechar(e:MouseEvent){if(ref.current&&!ref.current.contains(e.target as Node))setAberto(false)}document.addEventListener('mousedown',fechar);return()=>document.removeEventListener('mousedown',fechar)},[]);
 const todos=todosEquivaleVazio?selecionados.length===0:selecionados.length===opcoes.length;
 const descricao=todos?'Todos':selecionados.length===0?'Selecione':selecionados.length===1?opcoes.find(o=>o.value===selecionados[0])?.label||selecionados[0]:`${selecionados.length} selecionados`;
 return <div ref={ref} style={{position:'relative',minWidth:titulo==='País'?205:125}}><div style={{marginBottom:4,fontSize:14}}>{titulo}</div>
 <button type="button" aria-expanded={aberto} aria-label={'Filtrar '+titulo} onClick={()=>setAberto(v=>!v)} style={{width:'100%',display:'flex',alignItems:'center',justifyContent:'space-between',gap:12,padding:'11px 12px',border:'1px solid #cbd5e1',background:'#fff',borderRadius:7,color:'#173962',cursor:'pointer'}}><span style={{overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{descricao}</span><span>▾</span></button>
 {aberto&&<div style={{position:'absolute',top:'100%',left:0,zIndex:40,marginTop:4,minWidth:'100%',width:Math.max(220,titulo==='País'?270:220),maxHeight:320,overflowY:'auto',background:'#fff',border:'1px solid #cbd5e1',borderRadius:9,boxShadow:'0 8px 25px #0002',padding:8}}>
 <button type="button" onClick={()=>mudar(todosEquivaleVazio?[]:opcoes.map(o=>o.value))} style={{border:0,background:'#e9eff7',color:'#173962',padding:'8px 10px',borderRadius:6,cursor:'pointer',width:'100%',textAlign:'left'}}>✓ Selecionar todos</button>
 <button type="button" onClick={()=>mudar([])} style={{border:0,background:'transparent',padding:'8px 10px',cursor:'pointer',width:'100%',textAlign:'left'}}>Limpar seleção</button>
 {opcoes.map(o=><label key={o.value} style={{display:'flex',gap:9,alignItems:'center',padding:'7px 8px',cursor:'pointer'}}><input type="checkbox" checked={todosEquivaleVazio?selecionados.includes(o.value):selecionados.includes(o.value)} onChange={e=>mudar(e.target.checked?[...selecionados,o.value]:selecionados.filter(x=>x!==o.value))}/>{o.label}</label>)}
 </div>}
 </div>
}

function ClientesDetalhe({dados}:{dados:Dados}){
 const c=dados.clientesDetalhados;
 if(!c)return <p>Dados dos clientes indisponíveis.</p>;
 const porcentagem=(n:number|null)=>n===null?'—':n.toLocaleString('pt-BR',{minimumFractionDigits:1,maximumFractionDigits:2})+'%';
 const titulos=['CÓDIGO','CLIENTE','PAÍS','PARES','VALOR (R$)','% PARES NO PAÍS','% VALOR NO PAÍS','% PARES GERAL','% VALOR GERAL','ÚLTIMA COMPRA'];
 return <section style={{marginTop:15}}>
  <h2 style={{color:'#172e4a'}}>Clientes por país — Participação nas vendas</h2>
  <div style={{background:'white',borderRadius:10,overflowX:'auto'}}><table style={{borderCollapse:'collapse',minWidth:1250,width:'100%',fontSize:13}}>
   <thead><tr style={{background:'#173962',color:'white'}}>{titulos.map(t=><th key={t} style={{padding:11,textAlign:['CLIENTE','PAÍS','CÓDIGO','ÚLTIMA COMPRA'].includes(t)?'left':'right'}}>{t}</th>)}</tr></thead>
   <tbody>{c.linhas.map((r,i)=><tr key={r.pais+'|'+r.codigo} style={{background:i%2?'#f2f5f9':'white',borderBottom:'1px solid #dbe3ee'}}>
    <td style={{padding:9}}>{r.codigo}</td><td style={{padding:9}}>{r.nome}</td><td style={{padding:9}}>{r.pais}</td>
    <td style={{padding:9,textAlign:'right'}}>{fmt(r.pares)}</td><td style={{padding:9,textAlign:'right'}}>{money(r.valor)}</td>
    <td style={{padding:9,textAlign:'right'}}>{porcentagem(r.participacaoParesPais)}</td><td style={{padding:9,textAlign:'right'}}>{porcentagem(r.participacaoValorPais)}</td>
    <td style={{padding:9,textAlign:'right'}}>{porcentagem(r.participacaoParesGeral)}</td><td style={{padding:9,textAlign:'right'}}>{porcentagem(r.participacaoValorGeral)}</td>
    <td style={{padding:9}}>{r.ultimaCompra?short(r.ultimaCompra):'—'}</td>
   </tr>)}</tbody>
  </table></div>
  {!c.linhas.length&&<p>Nenhum cliente com vendas no período selecionado.</p>}
  <p style={{color:'#64748b',fontSize:12}}>Participação geral: denominador de todos os países nos anos e meses selecionados, independentemente do filtro de países. Última compra: data mais recente no histórico da aba CLIENTES.</p>
 </section>
}

export default function ExportTela(){
 const params=useParams();const tela=String(params.tela||'entrada');
 const [dados,setDados]=useState<Dados|null>(null),[erro,setErro]=useState(''),[carregando,setCarregando]=useState(true);
 const [anos,setAnos]=useState<number[]>([2026]),[mesesSelecionados,setMesesSelecionados]=useState<number[]>([new Date().getMonth()+1]),[paisesSelecionados,setPaisesSelecionados]=useState<string[]>([]);
 const [versao,setVersao]=useState(0);
 const consulta=()=>{const q=new URLSearchParams({anos:anos.join(','),meses:mesesSelecionados.join(',')});if(paisesSelecionados.length)q.set('paises',paisesSelecionados.join(','));return q};
 useEffect(()=>{
  if(!menu.some(m=>m[0]===tela)){setErro('Tela não encontrada');return;}
  if(!anos.length||!mesesSelecionados.length){setErro('Selecione pelo menos um ano e um mês.');setCarregando(false);return;}
  let cancel=false;setCarregando(true);setErro('');
  const q=consulta();if(versao){q.set('atualizar','1');q.set('_r',String(versao));}
  fetch('/api/export/'+tela+'?'+q,{cache:'no-store'}).then(async r=>{const x=await r.json();if(!r.ok)throw Error(x.erro||'Falha ao consultar');if(!cancel)setDados(x)}).catch(e=>{if(!cancel)setErro(e instanceof Error?e.message:String(e))}).finally(()=>{if(!cancel)setCarregando(false)});
  return()=>{cancel=true}
 },[tela,anos,mesesSelecionados,paisesSelecionados,versao]);
 const titulo=menu.find(m=>m[0]===tela)?.[1]||'Exportação';
 return <main style={{background:'#f3f5f9',minHeight:'100vh',fontFamily:'Arial,sans-serif',padding:'26px 3%'}}><div style={{maxWidth:1450,margin:'auto'}}><Link href="/export">← Menu Exportação</Link><header style={{display:'flex',gap:16,alignItems:'center',background:'white',borderRadius:13,padding:20,margin:'16px 0',flexWrap:'wrap'}}><img src="/kidy-logo.png" alt="Kidy" width={95}/><div><h1 style={{margin:0,color:'#172e4a'}}>Exportação — {titulo}</h1><small style={{color:'#64748b'}}>Matinal Comercial · dados do Google Drive</small></div></header><nav style={{display:'flex',gap:8,flexWrap:'wrap',marginBottom:20}}>{menu.map(([slug,name])=><Link key={slug} href={'/export/'+slug} style={{background:tela===slug?'#ff6900':'#e2e8f0',color:tela===slug?'white':'#182a42',borderRadius:8,padding:'13px 16px',textDecoration:'none',fontWeight:700}}>{name}</Link>)}</nav>
 <div style={{display:'flex',gap:12,alignItems:'end',flexWrap:'wrap',margin:'0 0 20px'}}>
 <MultiFiltro titulo="Ano" opcoes={[2025,2026,2027].map(x=>({value:String(x),label:String(x)}))} selecionados={anos.map(String)} mudar={v=>setAnos(v.map(Number).sort())} todosEquivaleVazio={false}/>
 <MultiFiltro titulo="Mês" opcoes={meses.map((m,i)=>({value:String(i+1),label:m}))} selecionados={mesesSelecionados.map(String)} mudar={v=>setMesesSelecionados(v.map(Number).sort((a,b)=>a-b))} todosEquivaleVazio={false}/>
 <MultiFiltro titulo="País" opcoes={(dados?.paises||[]).map(x=>({value:x,label:x}))} selecionados={paisesSelecionados} mudar={setPaisesSelecionados} todosEquivaleVazio={true}/>
 <button disabled={carregando} onClick={()=>setVersao(Date.now())} style={{padding:'12px 20px',background:'#173962',color:'white',border:0,borderRadius:7,cursor:'pointer',opacity:carregando ? 0.7 : 1}}>Atualizar dados</button>
 </div>
 {carregando&&<p style={{color:'#64748b'}}>{dados?'Atualizando indicadores; mantendo os dados anteriores...':'Carregando planilhas do Google Drive pela primeira vez...'}</p>}{erro&&<div style={{padding:20,color:'#9f1239',background:'#ffe4e6',borderRadius:9}}>Erro: {erro}. Confira os arquivos permitidos no Apps Script.</div>}
 {dados&&<>{tela==='fechamento-semanal'?<FechamentoMensal dados={dados}/>:tela==='faturamento'?<><Flag pais={paisesSelecionados.length===1?paisesSelecionados[0]:paisesSelecionados.length?paisesSelecionados.join(' · '):''}/><CardsFaturamento dados={dados}/><h2 style={{color:'#172e4a'}}>Evolução mensal — Faturamento e Tendência</h2><div style={{display:'flex',gap:16,alignItems:'stretch',flexWrap:'wrap'}}><TabelaMensalFaturamento dados={dados} tipo="pares"/><TabelaMensalFaturamento dados={dados} tipo="valor"/></div><h2 style={{color:'#172e4a'}}>Resultados por país</h2><CountryTable rows={dados.porPais}/></>:tela==='entrada'?<><Flag pais={paisesSelecionados.length===1?paisesSelecionados[0]:paisesSelecionados.length?paisesSelecionados.join(' · '):''}/><CardsEntrada dados={dados}/><h2 style={{color:'#172e4a'}}>Evolução mensal — Entrada</h2><div style={{display:'flex',gap:16,alignItems:'stretch',flexWrap:'wrap'}}><TabelaMensal dados={dados} tipo="pares"/><TabelaMensal dados={dados} tipo="valor"/></div><h2 style={{color:'#172e4a'}}>Resultados por país</h2><CountryTable rows={dados.porPais}/></>:<ClientesDetalhe dados={dados}/>}
 <div style={{padding:'16px 0',color:'#64748b',fontSize:12}}>Última data nos registros: {short(dados.atualizadoReferencia)}. {dados.avisos.join(' ')}</div></>}
 </div></main>
}
