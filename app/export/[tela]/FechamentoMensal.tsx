'use client';
import React from 'react';

type Metric={pares:number;valor:number};
type Pais={pais:string;entrada:Metric;faturamento:Metric;tendencia:Metric;metaEntradaPares:number|null;metaEntradaValor:number|null;metaFaturamentoPares:number|null;metaFaturamentoValor:number|null};
type Cliente={cliente:string;entrada:Metric;faturamento:Metric;tendencia:Metric};
type Dados={ano:number;mes:number;anosSelecionados?:number[];mesesSelecionados?:number[];entrada:Metric;faturamento:Metric;tendencia?:Metric;metaEntradaFechamento?:Metric;metaFaturamentoFechamento?:Metric;porPaisFechamento?:Pais[];porClienteFechamento?:Cliente[];semanas?:{inicio:string;fim:string;entrada:Metric;faturamento:Metric;carteira:Metric}[]};
const n=(v:number)=>Number(v||0).toLocaleString('pt-BR',{maximumFractionDigits:0});
const reais=(v:number)=>Number(v||0).toLocaleString('pt-BR',{style:'currency',currency:'BRL'});
const pct=(v:number,m:number|null|undefined)=>m&&m>0?(100*v/m).toLocaleString('pt-BR',{maximumFractionDigits:1})+'%':'—';
const monthNames=['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];
function Indicador({rotulo,valor,destaque=false}:{rotulo:string;valor:string;destaque?:boolean}){return <div style={{border:'2px solid #111',borderRadius:11,background:destaque?'#edbabc':'#fff',padding:'8px 10px',textAlign:'center',minHeight:58,display:'flex',flexDirection:'column',justifyContent:'center'}}><strong style={{fontSize:12,color:'#111'}}>{rotulo}</strong><strong style={{fontSize:17,color:'#252525',overflowWrap:'anywhere'}}>{valor}</strong></div>}
function Painel({titulo,meta,realizado,carteira,valor}:{titulo:string;meta:number|null|undefined;realizado:number;carteira:number;valor:boolean}){
 const format=valor?reais:n;const projetado=realizado+carteira;const desvio=meta!=null?projetado-meta:null;
 return <section><h3 style={{textAlign:'center',color:'#f56800',fontWeight:800,fontSize:20,margin:'8px 0 12px'}}>{titulo}</h3><div style={{display:'grid',gridTemplateColumns:'repeat(4,minmax(0,1fr))',gap:7}}>
 <Indicador rotulo="PREVISTO (META)" valor={meta!=null?format(meta):'Sem meta'}/><Indicador rotulo="REALIZADO" valor={format(realizado)}/><Indicador rotulo="CARTEIRA / TENDÊNCIA" valor={format(carteira)}/><Indicador rotulo="PROJEÇÃO ATUAL" valor={format(projetado)}/>
 <Indicador rotulo="DESVIO" valor={desvio!==null?format(desvio):'—'} destaque={desvio!==null&&desvio<0}/><Indicador rotulo="% META" valor={pct(projetado,meta)}/><Indicador rotulo="FALTA BUSCAR" valor={desvio!==null?format(desvio):'—'} destaque={desvio!==null&&desvio<0}/><Indicador rotulo="% REALIZADO" valor={pct(realizado,meta)}/>
 </div></section>
}
function Tabela({titulo,colunas,linhas}:{titulo:string;colunas:string[];linhas:(string|number)[][]}){
 return <div style={{border:'2px solid #ff6900',background:'white',padding:4,minWidth:0,overflowX:'auto'}}><strong style={{color:'#f56800',fontSize:13}}>{titulo}</strong><table style={{width:'100%',borderCollapse:'collapse',fontSize:11,marginTop:4}}><thead><tr>{colunas.map(c=><th key={c} style={{background:'#459ee9',color:'#101b2b',padding:5,border:'1px solid #fff',textAlign:'left',whiteSpace:'nowrap'}}>{c}</th>)}</tr></thead><tbody>{linhas.length?linhas.map((r,i)=><tr key={i} style={{background:i%2?'#edf2f8':'#fff'}}>{r.map((v,j)=><td key={j} style={{borderBottom:'1px solid #d5deea',padding:5,textAlign:j?'right':'left'}}>{v}</td>)}</tr>):<tr><td colSpan={colunas.length} style={{padding:12}}>Sem registros para o período selecionado.</td></tr>}</tbody></table></div>
}
export default function FechamentoMensal({dados}:{dados:Dados}){
 const fat=dados.faturamento,ent=dados.entrada,cart=dados.tendencia||{pares:0,valor:0};
 const me=dados.metaEntradaFechamento,mf=dados.metaFaturamentoFechamento;
 const paises=dados.porPaisFechamento||[];const clientes=dados.porClienteFechamento||[];
 const periodo=(dados.mesesSelecionados?.length?dados.mesesSelecionados:[dados.mes]).map(m=>monthNames[m-1]).join(', ');
 return <div style={{background:'#d6d6d6',border:'1px solid #444',padding:'18px 14px',color:'#111'}}>
 <h2 style={{textAlign:'center',margin:'0 0 18px',fontSize:22,color:'#ed6200'}}>FECHAMENTO — {periodo.toUpperCase()} / {(dados.anosSelecionados||[dados.ano]).join(', ')}</h2>
 <Painel titulo="FATURAMENTO — VALORES" meta={mf?.valor||null} realizado={fat.valor} carteira={cart.valor} valor/>
 <div style={{marginTop:10}}><Painel titulo="FATURAMENTO — PARES" meta={mf?.pares||null} realizado={fat.pares} carteira={cart.pares} valor={false}/></div>
 <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1.3fr',gap:14,margin:'18px 0 24px'}}>
 <Tabela titulo="VALORES POR PAÍS" colunas={['País','Faturado','Tendência','Projeção']} linhas={paises.map(p=>[p.pais,reais(p.faturamento.valor),reais(p.tendencia.valor),reais(p.faturamento.valor+p.tendencia.valor)])}/>
 <Tabela titulo="PARES POR PAÍS" colunas={['País','Faturado','Tendência','Projeção']} linhas={paises.map(p=>[p.pais,n(p.faturamento.pares),n(p.tendencia.pares),n(p.faturamento.pares+p.tendencia.pares)])}/>
 <Tabela titulo="CLIENTES — TENDÊNCIA" colunas={['Cliente','Pares','Valores']} linhas={clientes.filter(c=>c.tendencia.pares||c.tendencia.valor).map(c=>[c.cliente,n(c.tendencia.pares),reais(c.tendencia.valor)])}/>
 </div>
 <div style={{borderTop:'4px solid #ff6900',margin:'14px 0'}}/>
 <Painel titulo="ENTRADA — VALORES" meta={me?.valor||null} realizado={ent.valor} carteira={0} valor/>
 <div style={{marginTop:10}}><Painel titulo="ENTRADA — PARES" meta={me?.pares||null} realizado={ent.pares} carteira={0} valor={false}/></div>
 <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1.3fr',gap:14,marginTop:18}}>
 <Tabela titulo="ENTRADA — VALORES POR PAÍS" colunas={['País','Realizado (R$)']} linhas={paises.map(p=>[p.pais,reais(p.entrada.valor)])}/>
 <Tabela titulo="ENTRADA — PARES POR PAÍS" colunas={['País','Realizado (pares)']} linhas={paises.map(p=>[p.pais,n(p.entrada.pares)])}/>
 <Tabela titulo="ENTRADA — CLIENTES" colunas={['Razão social','Pares','Valores']} linhas={clientes.filter(c=>c.entrada.pares||c.entrada.valor).map(c=>[c.cliente,n(c.entrada.pares),reais(c.entrada.valor)])}/>
 </div>
 <p style={{fontSize:11,color:'#444',marginBottom:0,marginTop:14}}>Projeção do faturamento = faturado + carteira ref. Falta buscar = projeção − meta. Sem meta cadastrada, o percentual não é calculado. Período conforme filtros selecionados.</p>
 </div>
}
