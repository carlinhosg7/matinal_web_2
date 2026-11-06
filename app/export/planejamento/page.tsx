'use client';
import React,{useEffect,useMemo,useState} from 'react';
import Link from 'next/link';
type Meta={pais:string;id:string;pares2025:number;valor2025:number;pares2026JanSet:number;valor2026JanSet:number;metaPares:number;metaValor:number;participacaoPares:number|null;participacaoValor:number|null;variacaoPares:number|null;variacaoValor:number|null};
type Cruz={pais:string;cliente:string;entrada:string;entrega:string;pares:number;valor:number};
type Prev={pais:string;metodo:string;meses:{mes:number;pares:number;valor:number;participacao:number}[]};
type Payload={metas:Meta[];totalMeta:{pares:number;valor:number};cruzamento:Cruz[];previsao:Prev[];avisos:string[];avisoCache?:string};
const money=(n:number)=>n.toLocaleString('pt-BR',{style:'currency',currency:'BRL'});
const count=(n:number)=>n.toLocaleString('pt-BR',{maximumFractionDigits:0});
const percent=(n:number|null)=>n===null?'—':n.toLocaleString('pt-BR',{maximumFractionDigits:1})+'%';
const meses=['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];
const th:React.CSSProperties={padding:'11px 12px',textAlign:'right',background:'#e8edf6',position:'sticky',top:0,whiteSpace:'nowrap'};
const td:React.CSSProperties={padding:'9px 12px',textAlign:'right',borderBottom:'1px solid #edf0f5',whiteSpace:'nowrap'};
const section:React.CSSProperties={background:'#fff',padding:22,borderRadius:14,boxShadow:'0 4px 15px #172e4a12',marginTop:18};
function FiltroMeses({titulo,selecionados,alterar}:{titulo:string;selecionados:number[];alterar:(v:number[])=>void}){
 return <details style={{position:'relative',minWidth:210}}>
  <summary style={{cursor:'pointer',padding:'11px 13px',border:'1px solid #cad3df',borderRadius:9,background:'#fff',fontSize:13,fontWeight:600}}>
   {titulo}: {selecionados.length===0?'Todos':selecionados.length===1?meses[selecionados[0]-1]:`${selecionados.length} meses`}
  </summary>
  <div style={{position:'absolute',left:0,top:'100%',zIndex:100,background:'#fff',padding:10,minWidth:210,maxHeight:350,overflowY:'auto',border:'1px solid #cad3df',borderRadius:9,boxShadow:'0 8px 22px #0002'}}>
   <label style={{display:'flex',gap:9,padding:8,cursor:'pointer',fontWeight:700}}>
    <input type="checkbox" checked={selecionados.length===0} onChange={()=>alterar([])}/> Todos os meses
   </label>
   {meses.map((nome,i)=><label key={i} style={{display:'flex',gap:9,padding:8,cursor:'pointer'}}>
    <input type="checkbox" checked={selecionados.includes(i+1)} onChange={()=>{
     const proximo=selecionados.includes(i+1)?selecionados.filter(x=>x!==i+1):[...selecionados,i+1].sort((a,b)=>a-b);
     alterar(proximo.length===12?[]:proximo);
    }}/>{nome}
   </label>)}
  </div>
 </details>;
}
export default function Planejamento(){
 const [tab,setTab]=useState('metas');const [dados,setDados]=useState<Payload|null>(null);const [erro,setErro]=useState('');const [pais,setPais]=useState('');const [carregando,setCarregando]=useState(true);
 useEffect(()=>{let ok=true;fetch('/api/export/planejamento',{cache:'no-store'}).then(async r=>{const j=await r.json();if(!r.ok)throw Error(j.erro||`HTTP ${r.status}`);return j as Payload}).then(j=>{if(ok)setDados(j)}).catch(e=>{if(ok)setErro(String(e.message))}).finally(()=>{if(ok)setCarregando(false)});return()=>{ok=false}},[]);
 const [mesFiltro,setMesFiltro]=useState<number[]>([]);
 const metas=useMemo(()=>dados?.metas.filter(r=>!pais||r.id===pais)||[],[dados,pais]);
 const cruz=useMemo(()=>dados?.cruzamento.filter(r=>!pais||r.pais.normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-zA-Z0-9]/g,'').toUpperCase()===pais)||[],[dados,pais]);
 const prev=useMemo(()=>dados?.previsao.filter(r=>!pais||r.pais.normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-zA-Z0-9]/g,'').toUpperCase()===pais)||[],[dados,pais]);
 const linhasPrevisao=useMemo(
  ()=>prev.flatMap(r=>r.meses
   .filter(m=>mesFiltro.length===0||mesFiltro.includes(m.mes))
   .map(m=>({pais:r.pais,metodo:r.metodo,...m}))),
  [prev,mesFiltro]
 );
 const totaisPrevisao=useMemo(()=>{
  const pares=linhasPrevisao.reduce((s,r)=>s+r.pares,0);
  const valor=linhasPrevisao.reduce((s,r)=>s+r.valor,0);
  const paresAnuais=prev.reduce(
   (s,r)=>s+r.meses.reduce((a,m)=>a+m.pares,0),0
  );
  const peso=paresAnuais>0?pares/paresAnuais*100:null;
  return {pares,valor,peso};
 },[linhasPrevisao,prev]);
 const [mesEntradaFiltro,setMesEntradaFiltro]=useState<number[]>([]);
 const [mesEntregaFiltro,setMesEntregaFiltro]=useState<number[]>([]);
 const cruzFiltrado=useMemo(()=>cruz.filter(r=>
  (mesEntradaFiltro.length===0||mesEntradaFiltro.includes(Number(r.entrada.slice(5,7))))&&
  (mesEntregaFiltro.length===0||mesEntregaFiltro.includes(Number(r.entrega.slice(5,7))))
 ),[cruz,mesEntradaFiltro,mesEntregaFiltro]);
 const totaisCruz=useMemo(()=>({
  pares:cruzFiltrado.reduce((s,r)=>s+r.pares,0),
  valor:cruzFiltrado.reduce((s,r)=>s+r.valor,0)
 }),[cruzFiltrado]);
 const [mostrarMatrizPrevisao,setMostrarMatrizPrevisao]=useState(false);
 const exportarMatrizExcel=async()=>{
  const XLSX=await import('xlsx');
  const selecionados=mesFiltro.length===0?meses.map((_,i)=>i+1):[...mesFiltro].sort((a,b)=>a-b);
  const paises=Array.from(new Set(linhasPrevisao.map(r=>r.pais))).sort((a,b)=>a.localeCompare(b,'pt-BR'));
  const agregar=(nome:string|null,mes:number|null,campo:'pares'|'valor')=>
   linhasPrevisao.reduce((total,r)=>total+((nome===null||r.pais===nome)&&(mes===null||r.mes===mes)?r[campo]:0),0);
  const cabecalho1:(string|number)[]=['PaÃ­s'];
  const cabecalho2:(string|number)[]=[''];
  selecionados.forEach(m=>{cabecalho1.push(`${meses[m-1]}/2027`,'');cabecalho2.push('Pares','Valor (R$)')});
  cabecalho1.push('TOTAL','');cabecalho2.push('Pares','Valor (R$)');
  const linhas:(string|number)[][]=[cabecalho1,cabecalho2];
  paises.forEach(nome=>{
   const linha:(string|number)[]=[nome];
   selecionados.forEach(m=>linha.push(agregar(nome,m,'pares'),agregar(nome,m,'valor')));
   linha.push(agregar(nome,null,'pares'),agregar(nome,null,'valor'));
   linhas.push(linha);
  });
  const total:(string|number)[]=['TOTAL GERAL'];
  selecionados.forEach(m=>total.push(agregar(null,m,'pares'),agregar(null,m,'valor')));
  total.push(agregar(null,null,'pares'),agregar(null,null,'valor'));
  linhas.push(total);
  const ws=XLSX.utils.aoa_to_sheet(linhas);
  ws['!merges']=[...selecionados.map((_,i)=>({s:{r:0,c:1+2*i},e:{r:0,c:2+2*i}})),{s:{r:0,c:1+2*selecionados.length},e:{r:0,c:2+2*selecionados.length}}];
  ws['!cols']=[{wch:28},...selecionados.flatMap(()=>[{wch:14},{wch:19}]),{wch:16},{wch:20}];
  for(let r=2;r<linhas.length;r++){
   for(let i=0;i<=selecionados.length;i++){
    const colPares=1+i*2;
    const colValor=colPares+1;
    const celPares=XLSX.utils.encode_cell({r,c:colPares});
    const celValor=XLSX.utils.encode_cell({r,c:colValor});
    if(ws[celPares])ws[celPares].z='#,##0';
    if(ws[celValor])ws[celValor].z='"R$ "#,##0.00';
   }
  }
  const wb=XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb,ws,'Matriz 2027');
  XLSX.writeFile(wb,`matriz_previsao_2027_${pais||'todos_paises'}.xlsx`);
 };
 const crescimento=metas.filter(r=>r.variacaoPares!==null||r.variacaoValor!==null).sort((a,b)=>(b.variacaoValor||0)-(a.variacaoValor||0));
 const T=({children}:{children:React.ReactNode})=><div style={{overflowX:'auto',maxHeight:620}}><table style={{width:'100%',borderCollapse:'collapse',fontSize:13}}>{children}</table></div>;
 return <main style={{minHeight:'100vh',background:'#f2f5fa',fontFamily:'Arial, sans-serif',color:'#19334f',padding:'25px 3%'}}><div style={{maxWidth:1500,margin:'0 auto'}}>
 <Link href="/export" style={{color:'#33577f',textDecoration:'none'}}>← Exportação</Link>
 <header style={{...section,display:'flex',gap:18,alignItems:'center',justifyContent:'space-between',flexWrap:'wrap'}}><div><div style={{color:'#ee7100',fontWeight:800}}>KIDY | EXPORTAÇÃO</div><h1 style={{margin:'7px 0'}}>Planejamento Estratégico 2027</h1><small>Metas, evolução de mercados, entrada × faturamento e previsão de pedidos</small></div><select value={pais} onChange={e=>setPais(e.target.value)} style={{padding:12,minWidth:220,borderRadius:9,border:'1px solid #cad3df'}}><option value="">Todos os países</option>{dados?.metas.map(x=><option key={x.id} value={x.id}>{x.pais}</option>)}</select></header>
 <nav style={{display:'flex',gap:9,flexWrap:'wrap',marginTop:20}}>{[['metas','Metas 2027'],['evolucao','Alta e queda 2025 × 2026'],['fluxo','Entrada × Faturamento'],['previsao','Predição 2027']].map(([k,l])=><button key={k} onClick={()=>setTab(k)} style={{padding:'12px 17px',borderRadius:9,border:'1px solid #d8e0eb',background:tab===k?'#ed7200':'#fff',color:tab===k?'#fff':'#19334f',fontWeight:700,cursor:'pointer'}}>{l}</button>)}</nav>
 {carregando&&<p>Carregando dados do Google Drive...</p>}{erro&&<p style={{padding:16,color:'#991b1b',background:'#ffe4e6'}}>Erro: {erro}</p>}{dados&&<>
 {dados.avisoCache&&<p>{dados.avisoCache}</p>}
 {tab==='metas'&&<section style={section}><h2>Metas por país — 2027</h2><p>Participação na meta geral em pares e valores.</p><div style={{display:'flex',gap:16,flexWrap:'wrap',marginBottom:18}}><b>Meta total em pares: {count(dados.totalMeta.pares)}</b><b>Meta total em valores: {money(dados.totalMeta.valor)}</b></div><T><thead><tr>{['País','Meta pares','Meta valores','% pares total','% valores total'].map((x,i)=><th key={x} style={{...th,textAlign:i===0?'left':'right'}}>{x}</th>)}</tr></thead><tbody>{metas.map(r=><tr key={r.id}><td style={{...td,textAlign:'left'}}>{r.pais}</td><td style={td}>{count(r.metaPares)}</td><td style={td}>{money(r.metaValor)}</td><td style={td}>{percent(r.participacaoPares)}</td><td style={td}>{percent(r.participacaoValor)}</td></tr>)}</tbody></T></section>}
 {tab==='evolucao'&&<section style={section}><h2>Mercados em alta e queda</h2><p>Comparação disponível: 2025 completo × janeiro–setembro de 2026. O percentual ainda não é uma variação anual equivalente.</p><T><thead><tr>{['País','Pares 2025','Pares 2026 jan–set','Var. pares*','Valor 2025','Valor 2026 jan–set','Var. valores*'].map((x,i)=><th key={x} style={{...th,textAlign:i===0?'left':'right'}}>{x}</th>)}</tr></thead><tbody>{crescimento.map(r=><tr key={r.id}><td style={{...td,textAlign:'left'}}>{r.pais}</td><td style={td}>{count(r.pares2025)}</td><td style={td}>{count(r.pares2026JanSet)}</td><td style={{...td,color:(r.variacaoPares||0)<0?'#b91c1c':'#15803d'}}>{percent(r.variacaoPares)}</td><td style={td}>{money(r.valor2025)}</td><td style={td}>{money(r.valor2026JanSet)}</td><td style={{...td,color:(r.variacaoValor||0)<0?'#b91c1c':'#15803d'}}>{percent(r.variacaoValor)}</td></tr>)}</tbody></T><small>*Variação parcial 2026 Jan–Set em relação ao total 2025, sem anualização.</small></section>}
 {tab==='fluxo'&&<section style={section}>
  <h2>Entrada × Faturamento previsto</h2>
  <p>Mês Cadastro = entrada do pedido. Mês Entrega = faturamento previsto. Valores por país e cliente.</p>
  <div style={{display:'flex',gap:12,alignItems:'center',flexWrap:'wrap',marginBottom:18}}>
   <FiltroMeses titulo="Mês entrada" selecionados={mesEntradaFiltro} alterar={setMesEntradaFiltro}/>
   <FiltroMeses titulo="Mês faturamento" selecionados={mesEntregaFiltro} alterar={setMesEntregaFiltro}/>
   <span style={{fontSize:12,color:'#64748b'}}>{count(cruzFiltrado.length)} registros filtrados</span>
  </div>
  <div style={{display:'flex',gap:18,flexWrap:'wrap',marginBottom:16,fontWeight:700}}>
   <span>Total de pares: {count(totaisCruz.pares)}</span>
   <span>Total em valores: {money(totaisCruz.valor)}</span>
  </div>
  <T>
   <thead><tr>{['País','Cliente','Mês Entrada','Mês Faturamento previsto','Pares','Valores'].map((x,i)=><th key={x} style={{...th,textAlign:i<2?'left':'right'}}>{x}</th>)}</tr></thead>
   <tbody>
    {cruzFiltrado.slice(0,1000).map((r,i)=><tr key={i}>
     <td style={{...td,textAlign:'left'}}>{r.pais}</td>
     <td style={{...td,textAlign:'left'}}>{r.cliente}</td>
     <td style={td}>{r.entrada.slice(5,7)}/{r.entrada.slice(0,4)}</td>
     <td style={td}>{r.entrega.slice(5,7)}/{r.entrega.slice(0,4)}</td>
     <td style={td}>{count(r.pares)}</td>
     <td style={td}>{money(r.valor)}</td>
    </tr>)}
    <tr style={{background:'#e8edf6',fontWeight:800}}>
     <td style={{...td,textAlign:'left'}}>TOTAL</td><td style={td}>Todos os registros filtrados</td>
     <td style={td}></td><td style={td}></td>
     <td style={td}>{count(totaisCruz.pares)}</td><td style={td}>{money(totaisCruz.valor)}</td>
    </tr>
   </tbody>
  </T>
  {cruzFiltrado.length>1000&&<small>Exibindo as primeiras 1.000 combinações. O TOTAL considera todos os {count(cruzFiltrado.length)} registros filtrados.</small>}
 </section>}
 {tab==='previsao'&&
 <section style={section}>
  <h2>Estimativa de entrada de pedidos — 2027</h2>
  <p>Distribuição mensal da meta 2027 conforme sazonalidade das entradas em 2025–2026. Projeção inicial, ainda não é modelo de ML validado.</p>

  <div style={{display:'flex',gap:14,alignItems:'center',flexWrap:'wrap',marginBottom:18}}>
   <label htmlFor="filtro-mes-2027" style={{fontWeight:700}}>Filtrar mês:</label>
   <details style={{position:'relative',minWidth:230}}>
 <summary style={{padding:12,border:'1px solid #cad3df',borderRadius:9,cursor:'pointer',background:'#fff'}}>
  {mesFiltro.length===0?'Todos os meses':`${mesFiltro.length} meses selecionados`}
 </summary>
 <div style={{position:'absolute',top:'100%',left:0,zIndex:50,background:'#fff',border:'1px solid #cad3df',borderRadius:9,padding:12,minWidth:230,maxHeight:350,overflowY:'auto',boxShadow:'0 8px 20px #0002'}}>
  <label style={{display:'flex',gap:10,padding:8,fontWeight:700}}>
   <input type="checkbox" checked={mesFiltro.length===0} onChange={()=>setMesFiltro([])}/>
   Todos os meses
  </label>
  {meses.map((m,i)=>
   <label key={i} style={{display:'flex',gap:10,padding:8,cursor:'pointer'}}>
    <input
     type="checkbox"
     checked={mesFiltro.includes(i+1)}
     onChange={()=>{
      setMesFiltro(anterior=>{
       const novos=anterior.includes(i+1)
        ?anterior.filter(x=>x!==i+1)
        :[...anterior,i+1].sort((a,b)=>a-b);
       return novos.length===12?[]:novos;
      });
     }}
    />
    {m}/2027
   </label>
  )}
 </div>
</details>
  </div>

    <div style={{display:'flex',gap:12,alignItems:'center',margin:'14px 0',flexWrap:'wrap'}}>
   <button type="button" onClick={()=>setMostrarMatrizPrevisao(v=>!v)} style={{background:'#ee7100',color:'#fff',border:0,borderRadius:9,padding:'11px 16px',fontWeight:700,cursor:'pointer'}}>
    {mostrarMatrizPrevisao?'Voltar para tabela':'Gerar matriz da seleção'}
   </button>
   {mostrarMatrizPrevisao&&<button type="button" onClick={exportarMatrizExcel} style={{background:'#167347',color:'#fff',padding:'10px 16px',border:0,borderRadius:8,fontWeight:700,cursor:'pointer',marginLeft:10}}>Exportar Excel (.xlsx)</button>}{mostrarMatrizPrevisao&&<small style={{color:'#64748b'}}>Matriz de países por meses selecionados, com pares e valores</small>}
  </div>
  {mostrarMatrizPrevisao&&(()=>{
   const mesesSelecionados=mesFiltro.length===0?meses.map((_,i)=>i+1):[...mesFiltro].sort((a,b)=>a-b);
   const paisesMatriz=Array.from(new Set(linhasPrevisao.map(r=>r.pais))).sort((a,b)=>a.localeCompare(b,'pt-BR'));
   const soma=(paisNome:string|null,mesNumero:number|null,campo:'pares'|'valor')=>linhasPrevisao.reduce((total,r)=>total+( (paisNome===null||r.pais===paisNome)&&(mesNumero===null||r.mes===mesNumero) ?r[campo]:0),0);
   return <div style={{overflowX:'auto',maxHeight:620,marginTop:12}}>
    <table style={{borderCollapse:'collapse',width:'100%',fontSize:13,whiteSpace:'nowrap'}}>
     <thead>
      <tr><th rowSpan={2} style={{...th,textAlign:'left',position:'sticky',left:0,zIndex:3}}>País</th>
       {mesesSelecionados.map(m=><th key={m} colSpan={2} style={{...th,textAlign:'center',borderLeft:'1px solid #cad3df'}}>{meses[m-1]}/2027</th>)}
       <th colSpan={2} style={{...th,textAlign:'center',background:'#d3def0'}}>TOTAL</th>
      </tr>
      <tr>{mesesSelecionados.map(m=><React.Fragment key={m}><th style={{...th,borderLeft:'1px solid #cad3df'}}>Pares</th><th style={th}>Valor (R$)</th></React.Fragment>)}<th style={{...th,background:'#d3def0'}}>Pares</th><th style={{...th,background:'#d3def0'}}>Valor (R$)</th></tr>
     </thead>
     <tbody>
      {paisesMatriz.map(nome=><tr key={nome}>
       <td style={{...td,textAlign:'left',position:'sticky',left:0,background:'#fff',fontWeight:700}}>{nome}</td>
       {mesesSelecionados.map(m=><React.Fragment key={m}><td style={{...td,borderLeft:'1px solid #edf0f5'}}>{count(soma(nome,m,'pares'))}</td><td style={td}>{money(soma(nome,m,'valor'))}</td></React.Fragment>)}
       <td style={{...td,fontWeight:700,background:'#eff4fb'}}>{count(soma(nome,null,'pares'))}</td>
       <td style={{...td,fontWeight:700,background:'#eff4fb'}}>{money(soma(nome,null,'valor'))}</td>
      </tr>)}
      <tr style={{fontWeight:800,background:'#e8edf6'}}>
       <td style={{...td,textAlign:'left',position:'sticky',left:0,background:'#e8edf6'}}>TOTAL GERAL</td>
       {mesesSelecionados.map(m=><React.Fragment key={m}><td style={td}>{count(soma(null,m,'pares'))}</td><td style={td}>{money(soma(null,m,'valor'))}</td></React.Fragment>)}
       <td style={td}>{count(totaisPrevisao.pares)}</td><td style={td}>{money(totaisPrevisao.valor)}</td>
      </tr>
     </tbody>
    </table>
   </div>;
  })()}
  {!mostrarMatrizPrevisao&&<T>
   <thead>
    <tr>
     {['País','Mês','Pares previstos','Valor previsto','Peso sazonal','Método'].map((x,i)=>
      <th key={x} style={{...th,textAlign:i===0||i===5?'left':'right'}}>{x}</th>
     )}
    </tr>
   </thead>
   <tbody>
    {linhasPrevisao.map((r,i)=>
     <tr key={`${r.pais}-${r.mes}-${i}`}>
      <td style={{...td,textAlign:'left'}}>{r.pais}</td>
      <td style={td}>{meses[r.mes-1]}/2027</td>
      <td style={td}>{count(r.pares)}</td>
      <td style={td}>{money(r.valor)}</td>
      <td style={td}>{percent(r.participacao)}</td>
      <td style={{...td,textAlign:'left'}}>{r.metodo}</td>
     </tr>
    )}
    <tr style={{background:'#e8edf6',fontWeight:800,color:'#19334f'}}>
     <td style={{...td,textAlign:'left'}}>TOTAL</td>
     <td style={td}>{mesFiltro.length===0?'Ano 2027':mesFiltro.length===1?`${meses[mesFiltro[0]-1]}/2027`:'Meses selecionados'}</td>
     <td style={td}>{count(totaisPrevisao.pares)}</td>
     <td style={td}>{money(totaisPrevisao.valor)}</td>
     <td style={td}>{percent(totaisPrevisao.peso)}</td>
     <td style={{...td,textAlign:'left'}}>Total filtrado</td>
    </tr>
   </tbody>
  </T>}
 </section>}
 <div style={{...section,fontSize:12,color:'#64748b'}}>{dados.avisos.map((t,i)=><p key={i}>{t}</p>)}</div>
 </>}</div></main>
}
