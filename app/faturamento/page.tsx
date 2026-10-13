'use client';

import {useEffect,useMemo,useState} from 'react';

import Image from 'next/image';
import Link from 'next/link';

type Linha={codigo:string;nome:string;supervisor:string;metaValor:number;realValor:number;anteriorValor:number;metaPares:number;realPares:number;anteriorPares:number};

type Api={status:string;linhas:Linha[];supervisores:string[];periodo:string;mes:number;ano:number;metasValidas:number;vendasValidas:number;semCadastro:string[];erro?:string};

type Totais=Pick<Linha,'metaValor'|'realValor'|'anteriorValor'|'metaPares'|'realPares'|'anteriorPares'>;

const campos:(keyof Totais)[]=['metaValor','realValor','anteriorValor','metaPares','realPares','anteriorPares'];

const somar=(linhas:Linha[])=>linhas.reduce((t,r)=>{for(const c of campos)t[c]+=r[c];return t},Object.fromEntries(campos.map(c=>[c,0])) as Totais);

const dinheiro=(v:number)=>v.toLocaleString('pt-BR',{style:'currency',currency:'BRL'});

const inteiro=(v:number)=>v.toLocaleString('pt-BR',{maximumFractionDigits:0});

const percentual=(a:number,b:number)=>b===0?'—':(a/b*100).toLocaleString('pt-BR',{minimumFractionDigits:2,maximumFractionDigits:2})+'%';



const normal=(s:string)=>s.trim().toUpperCase();

export default function Faturamento(){

 const [dados,setDados]=useState<Api|null>(null),[erro,setErro]=useState(''),[regionaisSelecionadas,setRegionaisSelecionadas]=useState<string[]>([]),[representante,setRepresentante]=useState(''),[pares,setPares]=useState(false),[aberto,setAberto]=useState(true);

 useEffect(()=>{fetch('/api/faturamento',{cache:'no-store'}).then(async r=>{const j=await r.json();if(!r.ok)throw Error(j.erro||'Erro ao ler as bases');return j as Api}).then(setDados).catch(e=>setErro(String(e.message||e)))},[]);

 const linhas=dados?.linhas||[];

 const regioes=dados?.supervisores||[];

 const reps=useMemo(()=>linhas.filter(r=>regionaisSelecionadas.length===0||regionaisSelecionadas.some(nome=>normal(r.supervisor)===normal(nome))),[linhas,regionaisSelecionadas]);

 const filtrados=useMemo(()=>reps.filter(r=>!representante||r.codigo===representante),[reps,representante]);

 const total=useMemo(()=>somar(filtrados),[filtrados]);

 const m=pares?total.metaPares:total.metaValor, r=pares?total.realPares:total.realValor, aa=pares?total.anteriorPares:total.anteriorValor;

 const fmt=pares?inteiro:dinheiro;

 const grupos=useMemo(()=>{const nomes=[...new Set(linhas.map(r=>r.supervisor))].filter(Boolean).sort((a,b)=>a.localeCompare(b,'pt-BR'));return nomes.map(nome=>({nome,tot:somar(filtrados.filter(r=>r.supervisor===nome))})).filter(x=>x.tot.metaValor||x.tot.realValor||x.tot.metaPares||x.tot.realPares)},[linhas,filtrados]);

 const titulo=regionaisSelecionadas.length===0?'NACIONAL':regionaisSelecionadas.length===1?regionaisSelecionadas[0]:'REGIONAIS SELECIONADAS';

 const alternarRegional=(nome:string)=>{setRegionaisSelecionadas(atuais=>atuais.includes(nome)?atuais.filter(item=>item!==nome):[...atuais,nome]);setRepresentante('')};

 return <div className="fat-wrap">

 <nav className="fat-nav" aria-label="Navegação Matinal" style={{display:"flex",marginLeft:145,gap:2,height:38}}>
  {[
    { nome: 'FATURAMENTO', href: '/faturamento' },
    { nome: 'ENTRADA', href: '/entrada' },
    { nome: 'COBERTURA', href: '/cobertura' },
    { nome: 'PROJETOS ESPECIAIS', href: '/projetos-especiais' },
    { nome: 'BRINQUEDOS', href: '/brinquedos' },
  ].map(item => (
    <Link key={item.href} href={item.href} className={item.href === '/faturamento' ? 'on' : ''} style={{display:"flex",flex:1,alignItems:"center",justifyContent:"center",background:item.href === '/faturamento' ? "#ff6b00" : "#7b8590",color:"#fff",fontWeight:800,fontSize:12,textDecoration:"none",whiteSpace:"nowrap",cursor:"pointer",textAlign:"center",padding:"0 4px"}}>
      {item.nome}
    </Link>
  ))}
 </nav>

 <header className="fat-header"><Image src="/kidy-logo.png" alt="Kidy Cuidando de Cada Passo" width={135} height={106} style={{objectFit:'contain'}} priority/><h1>FATURAMENTO MENSAL</h1><div className="fat-actions"><button onClick={()=>{setRegionaisSelecionadas([]);setRepresentante('');setPares(false)}}>LIMPAR TODOS OS FILTROS</button><a href="/">VOLTAR AO INÍCIO</a></div></header>

 <section className="fat-region"><span>Supervisor</span><div className="fat-region-buttons">{regioes.map(n=><button key={n} className={regionaisSelecionadas.includes(n)?'selected':''} aria-pressed={regionaisSelecionadas.includes(n)} onClick={()=>alternarRegional(n)}>{n}</button>)}</div></section>

 <div className="fat-title">{titulo}</div>

 <section className="fat-rep"><label>Representante <select value={representante} onChange={e=>setRepresentante(e.target.value)}><option value="">Todos</option>{reps.map(x=><option key={x.codigo} value={x.codigo}>{x.nome}</option>)}</select></label></section>

 <div className="fat-title">{titulo}</div>

 {erro&&<p className="fat-error">{erro}</p>}

 {!dados&&!erro&&<p>Carregando dados...</p>}

 <div className="fat-mode"><button className={!pares?'active':''} onClick={()=>setPares(false)}>VALORES (R$)</button><button className={pares?'active':''} onClick={()=>setPares(true)}>PARES</button></div>

 <section className="fat-kpis">

 <div className="fat-card"><span>METAS {pares?'PARES':'R$'} MÊS</span><strong>{dados?fmt(m):'—'}</strong></div>

 <div className="fat-card"><span>REALIZADO {pares?'PARES':'R$'} MÊS</span><strong>{dados?fmt(r):'—'}</strong></div>

 <div className="fat-card pink"><span>DIFERENÇA {pares?'PARES':'R$'} MÊS</span><strong>{dados?fmt(r-m):'—'}</strong></div>

 <div className="fat-card pink"><span>Δ % MÊS</span><strong>{dados?percentual(r,m):'—'}</strong></div>

 <div className="fat-toggle"><button onClick={()=>setAberto(true)}>ABRIR DADOS</button><button onClick={()=>setAberto(false)}>FECHAR DADOS</button></div>

 <div className="fat-card"><span>REALIZADO {pares?'PARES':'R$'} MÊS ANO ANTERIOR</span><strong>{dados?fmt(aa):'—'}</strong></div>

 <div className="fat-card pink"><span>DIFERENÇA {pares?'PARES':'R$'} MÊS AO ANO ANTERIOR</span><strong>{dados?fmt(r-aa):'—'}</strong></div>

 <div className="fat-card pink"><span>Δ % MÊS AO ANO ANTERIOR</span><strong>{dados?percentual(r,aa):'—'}</strong></div>

 </section>

 {aberto&&<><section className="fat-table"><div className="fat-table-scroll"><table><thead><tr><th>Supervisor</th><th>Meta {pares?'Pares':'Valor'}</th><th>Realizado {pares?'Pares':'Valor'}</th><th>Dif. {pares?'Pares':'Valor'}</th><th>Δ %</th><th>Valor Ano Anterior</th><th>Dif. Atual x Anterior</th><th>Δ %</th></tr></thead><tbody>{grupos.map(({nome,tot})=>{const a=pares?tot.metaPares:tot.metaValor,b=pares?tot.realPares:tot.realValor,c=pares?tot.anteriorPares:tot.anteriorValor;return <tr key={nome}><td>{nome}</td><td>{fmt(a)}</td><td>{fmt(b)}</td><td>{fmt(b-a)}</td><td>{percentual(b,a)}</td><td>{fmt(c)}</td><td>{fmt(b-c)}</td><td>{percentual(b,c)}</td></tr>})}<tr className="fat-total"><td>Total</td><td>{fmt(m)}</td><td>{fmt(r)}</td><td>{fmt(r-m)}</td><td>{percentual(r,m)}</td><td>{fmt(aa)}</td><td>{fmt(r-aa)}</td><td>{percentual(r,aa)}</td></tr></tbody></table></div></section>

 <section className="fat-table"><div className="fat-table-scroll"><table><thead><tr><th>Representante</th><th>Meta {pares?'Pares':'Valor'}</th><th>Realizado {pares?'Pares':'Valor'}</th><th>Diferença</th><th>Δ %</th><th>Ano Anterior</th><th>Dif. Atual x Anterior</th><th>Δ %</th></tr></thead><tbody>{filtrados.map(x=>{const a=pares?x.metaPares:x.metaValor,b=pares?x.realPares:x.realValor,c=pares?x.anteriorPares:x.anteriorValor;return <tr key={x.codigo}><td>{x.nome}</td><td>{fmt(a)}</td><td>{fmt(b)}</td><td>{fmt(b-a)}</td><td>{percentual(b,a)}</td><td>{fmt(c)}</td><td>{fmt(b-c)}</td><td>{percentual(b,c)}</td></tr>})}</tbody></table></div></section></>}

 <p className="fat-foot">Fonte: {dados?.periodo||'—'} · Metas: {dados?.metasValidas??'—'} registros · Realizado: {dados?.vendasValidas??'—'} registros{dados?.semCadastro?.length?' · Atenção: representantes sem cadastro: '+dados.semCadastro.join(', '):''}</p>

 <style jsx>{`

 .fat-wrap{max-width:1300px;margin:0 auto;padding:10px 18px 45px;background:#fff;color:#141414;font-family:Arial,sans-serif;min-height:100vh}.fat-nav{display:flex;margin-left:145px;gap:2px;height:38px}.fat-nav a{background:#7b8590;color:white;flex:1;text-align:center;padding:12px 3px;font-weight:800;font-size:12px;white-space:nowrap;text-decoration:none;cursor:pointer;display:block}.fat-nav .on{background:#ff6b00}.fat-header{display:flex;align-items:center;gap:15px;min-height:102px}.fat-header h1{color:#ff6b00;font-size:32px;font-weight:900;margin:0;flex:1}.fat-actions{display:flex;flex-direction:column;min-width:155px}.fat-actions button,.fat-actions a{border:2px solid #ff6b00;background:#fff;text-decoration:none;color:#000;text-align:center;font-weight:800;font-size:10px;padding:5px;cursor:pointer}.fat-actions a{background:#caffc1}.fat-region{border:3px solid #ff6b00;border-radius:11px;padding:7px 10px 10px;margin-top:4px}.fat-region>span{font-size:10px}.fat-region-buttons{display:flex;gap:3px}.fat-region-buttons button{flex:1;background:#303030;color:white;border:2px solid #ff6b00;min-height:32px;font-size:10px;font-weight:800;cursor:pointer;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.fat-region-buttons button.selected{background:#ff6b00;color:white}.fat-title{border:3px solid #ff6b00;border-radius:10px;text-align:center;font-size:32px;font-weight:900;margin:13px 0;padding:6px}.fat-rep{border:3px solid #ff6b00;border-radius:10px;padding:8px 12px}.fat-rep label{display:block;font-size:11px}.fat-rep select{display:block;width:100%;padding:8px;border:1px solid #ddd;background:white}.fat-mode{display:flex;gap:8px;margin:10px 0}.fat-mode button{background:#333;color:white;border:2px solid #ff6b00;font-size:11px;font-weight:800;padding:7px 18px;cursor:pointer}.fat-mode .active{background:#ff6b00}.fat-kpis{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:9px;margin:12px 0 20px}.fat-card{min-height:82px;border:3px solid #ff6b00;border-radius:10px;display:flex;flex-direction:column;justify-content:center;align-items:center;gap:8px;padding:8px;text-align:center;box-shadow:0 2px 5px #0002}.fat-card.pink{background:#efb3b6}.fat-card span{font-size:12px;color:#ff6b00;font-weight:900}.fat-card strong{font-size:18px;white-space:nowrap}.fat-toggle{display:flex;flex-direction:column;justify-content:center;align-items:center;gap:9px}.fat-toggle button{width:150px;border:2px solid #111;border-radius:5px;font-weight:900;font-size:11px;padding:6px;cursor:pointer;background:#9dff9b;box-shadow:0 2px 4px #0005}.fat-toggle button+button{background:#111;color:white}.fat-table{margin:12px 0 22px}.fat-table-scroll{overflow:auto;max-height:460px}.fat-table table{width:100%;border-collapse:collapse;font-size:11px;white-space:nowrap}.fat-table th{background:#ff6b00;color:white;text-align:left;padding:6px;position:sticky;top:0}.fat-table td{padding:5px 6px;border-bottom:1px solid #d6d6d6;text-align:right}.fat-table td:first-child{text-align:left;font-weight:700}.fat-table tr:nth-child(even){background:#f6f6f6}.fat-table .fat-total{background:#8bc5ff!important;font-weight:900}.fat-foot{font-size:11px;color:#666;margin-top:15px}.fat-error{padding:12px;background:#fee;color:#900;border:1px solid #d00}@media(max-width:900px){.fat-header h1{font-size:24px}.fat-nav{margin-left:0}.fat-nav a{font-size:9px}.fat-region-buttons{flex-wrap:wrap}.fat-region-buttons button{min-width:90px}.fat-kpis{grid-template-columns:repeat(2,minmax(0,1fr))}.fat-card strong{font-size:14px}}@media(max-width:550px){.fat-header{flex-wrap:wrap}.fat-actions{width:100%}.fat-kpis{grid-template-columns:1fr 1fr}.fat-card span{font-size:10px}.fat-card strong{font-size:12px}.fat-title{font-size:23px}}

 `}</style>

 </div>

}
