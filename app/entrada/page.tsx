'use client';

import {useEffect,useMemo,useState} from 'react';

import Link from 'next/link';

import Image from 'next/image';
import SortableTable from '../../components/SortableTable';



type Linha={codigo:string;nome:string;supervisor:string;metaValor:number;realValor:number;anteriorValor:number;metaPares:number;realPares:number;anteriorPares:number};

type Semana={numero:number;inicio:number;fim:number;disponivel:boolean;metaDisponivel:boolean;linhas:Linha[]};
type Api={linhas:Linha[];supervisores:string[];periodo:string;metasValidas:number;vendasValidas:number;quantidadeSemanas?:number;semanas?:Semana[];avisos?:string[];erro?:string};

type Totais=Pick<Linha,'metaValor'|'realValor'|'anteriorValor'|'metaPares'|'realPares'|'anteriorPares'>;

const keys:(keyof Totais)[]=['metaValor','realValor','anteriorValor','metaPares','realPares','anteriorPares'];

const somar=(arr:Linha[])=>arr.reduce((t,x)=>{for(const k of keys)t[k]+=x[k];return t},Object.fromEntries(keys.map(k=>[k,0])) as Totais);

const moeda=(v:number)=>v.toLocaleString('pt-BR',{style:'currency',currency:'BRL'});

const inteiro=(v:number)=>v.toLocaleString('pt-BR',{maximumFractionDigits:0});

const pct=(v:number,base:number)=>base===0?'—':(v/base*100).toLocaleString('pt-BR',{minimumFractionDigits:2,maximumFractionDigits:2})+'%';

const parametroMes=(hoje:Date)=>{

 const ano=hoje.getFullYear(),mes=hoje.getMonth();

 const ultimo=new Date(ano,mes+1,0).getDate();

 let uteis=0,decorridos=0;

 for(let dia=1;dia<=ultimo;dia++){

  const semana=new Date(ano,mes,dia).getDay();

  if(semana!==0&&semana!==6){uteis++;if(dia<=hoje.getDate())decorridos++;}

 }

 return {uteis,decorridos,percentual:uteis?decorridos/uteis*100:0};

};

const links=[['FATURAMENTO','/faturamento'],['ENTRADA','/entrada'],['COBERTURA','/cobertura'],['PROJETOS ESPECIAIS','/projetos-especiais'],['BRINQUEDOS','/brinquedos']];

export default function Entrada(){

 const [hoje,setHoje]=useState<Date|null>(null);

 useEffect(()=>{const atualizar=()=>setHoje(new Date());atualizar();const id=setInterval(atualizar,60_000);return ()=>clearInterval(id)},[]);

 const parametro=hoje?parametroMes(hoje):null;

 const [dados,setDados]=useState<Api|null>(null),[erro,setErro]=useState(''),[regionais,setRegionais]=useState<string[]>([]),[rep,setRep]=useState(''),[mostrarSupervisor,setMostrarSupervisor]=useState(true),[mostrarRepresentante,setMostrarRepresentante]=useState(true),[modo,setModo]=useState<'ambos'|'pares'|'valores'>('ambos'),[semana,setSemana]=useState<number|null>(null);

 useEffect(()=>{fetch('/api/entrada',{cache:'no-store'}).then(async r=>{const j=await r.json();if(!r.ok)throw Error([j.erro,...(j.avisos||[])].join('\n'));setDados(j)}).catch(e=>setErro(String(e.message||e)))},[]);

 const semanaSelecionada=semana===null?null:dados?.semanas?.find(s=>s.numero===semana)??null;
 const dadosSemanaValidos=semana===null||Boolean(semanaSelecionada?.disponivel&&semanaSelecionada?.metaDisponivel);
 const linhas=useMemo(()=>semana===null?(dados?.linhas||[]):(dados?.semanas?.find(s=>s.numero===semana)?.linhas||[]),[dados,semana]);
 const linhasCadastro=useMemo(()=>dados?.linhas||[],[dados]);
 const disponiveis=useMemo(()=>linhasCadastro.filter(x=>!regionais.length||regionais.includes(x.supervisor)),[linhasCadastro,regionais]);
 const filtrados=useMemo(()=>linhas.filter(x=>(!regionais.length||regionais.includes(x.supervisor))&&(!rep||x.codigo===rep)),[linhas,regionais,rep]);
 const total=useMemo(()=>somar(filtrados),[filtrados]);
 const grupos=useMemo(()=>[...new Set(filtrados.map(x=>x.supervisor))].sort().map(nome=>({nome,t:somar(filtrados.filter(x=>x.supervisor===nome))})),[filtrados]);

 const titulo=regionais.length===0?'NACIONAL':regionais.length===1?regionais[0]:'REGIONAIS SELECIONADAS';

 const card=(rotulo:string,valor:string,tipo='')=><div className={'en-card '+tipo}><span>{rotulo}</span><strong>{dados&&dadosSemanaValidos?valor:'—'}</strong></div>;

 const tabela=(por:'supervisor'|'representante')=><section className="en-table"><div className="en-scroll"><SortableTable><thead><tr><th>{por==='supervisor'?'Supervisor':'Representante'}</th><th>Meta Pares</th><th>Realizado Pares</th><th>Dif. Pares</th><th>Î” %</th><th>Meta Valor</th><th>Realizado Valor</th><th>Dif. Valor</th><th>Î” %</th></tr></thead><tbody>{(por==='supervisor'?grupos.map(g=>({nome:g.nome,t:g.t})):filtrados.map(x=>({nome:x.nome,t:x}))).map(({nome,t},i)=><tr key={nome+i}><td>{nome}</td><td>{inteiro(t.metaPares)}</td><td>{inteiro(t.realPares)}</td><td>{inteiro(t.realPares-t.metaPares)}</td><td>{pct(t.realPares,t.metaPares)}</td><td>{moeda(t.metaValor)}</td><td>{moeda(t.realValor)}</td><td>{moeda(t.realValor-t.metaValor)}</td><td>{pct(t.realValor,t.metaValor)}</td></tr>)}<tr className="en-total"><td>Total</td><td>{inteiro(total.metaPares)}</td><td>{inteiro(total.realPares)}</td><td>{inteiro(total.realPares-total.metaPares)}</td><td>{pct(total.realPares,total.metaPares)}</td><td>{moeda(total.metaValor)}</td><td>{moeda(total.realValor)}</td><td>{moeda(total.realValor-total.metaValor)}</td><td>{pct(total.realValor,total.metaValor)}</td></tr></tbody></SortableTable></div></section>;

 return <main className="en-wrap">

 <nav className="en-nav" aria-label="Navegação Matinal">{links.map(([nome,url])=><Link key={url} href={url} className={url==='/entrada'?'active':''}>{nome}</Link>)}</nav>

 <header className="en-header"><Image src="/kidy-logo.png" alt="Kidy" width={135} height={105} style={{objectFit:'contain'}} priority/><h1>ENTRADA MENSAL</h1><div className="en-actions"><button onClick={()=>{setRegionais([]);setRep('');setModo('ambos');setSemana(null)}}>LIMPAR TODOS OS FILTROS</button><Link href="/portal">VOLTAR AO INÍCIO</Link></div></header>

 <section className="en-region"><small>Supervisor</small><div>{(dados?.supervisores||[]).map(n=><button key={n} className={regionais.includes(n)?'selected':''} onClick={()=>{setRegionais(s=>s.includes(n)?s.filter(x=>x!==n):[...s,n]);setRep('')}}>{n}</button>)}</div></section>

 <div className="en-title">{titulo}</div>

 <section className="en-rep"><label>Representante<select value={rep} onChange={e=>setRep(e.target.value)}><option value="">Todos</option>{disponiveis.map(x=><option key={x.codigo} value={x.codigo}>{x.nome}</option>)}</select></label></section>

 <div className="en-summary"><div className="en-title">{titulo}</div><div className="en-parameter"><span>% PARÂMETRO MÊS</span><strong>{parametro?parametro.percentual.toLocaleString('pt-BR',{minimumFractionDigits:2,maximumFractionDigits:2})+'%':'—'}</strong><small>{parametro?`${parametro.decorridos} de ${parametro.uteis} dias úteis (seg. a sex.)`:'Calculando dias úteis...'}</small></div></div>

 {erro&&<div className="en-error"><strong>Não foi possível carregar os dados.</strong><pre>{erro}</pre></div>}

 {!dados&&!erro&&<p>Carregando bases de Entrada...</p>}

 <div className="en-filterbar"><div className="en-mode"><button className={modo==='ambos'?'selected':''} onClick={()=>setModo('ambos')}>PARES E VALORES</button><button className={modo==='pares'?'selected':''} onClick={()=>setModo('pares')}>PARES</button><button className={modo==='valores'?'selected':''} onClick={()=>setModo('valores')}>VALORES (R$)</button></div><div className="en-weeks" aria-label="Período de entrada"><button className={semana===null?'active':''} onClick={()=>setSemana(null)}>MÊS COMPLETO</button>{Array.from({length:dados?.quantidadeSemanas??5},(_,i)=>i+1).map(n=><button key={n} className={semana===n?'active':''} onClick={()=>setSemana(n)} aria-pressed={semana===n}>{`SEMANA ${String(n).padStart(2,'0')}`}</button>)}</div></div>

 {semana!==null&&<p className="en-week-notice" role="status">SEMANA {String(semana).padStart(2,'0')} ({semanaSelecionada?`${String(semanaSelecionada.inicio).padStart(2,'0')} a ${String(semanaSelecionada.fim).padStart(2,'0')}`:'período não identificado'}): {!semanaSelecionada?'Aguardando dados do período.':!semanaSelecionada.metaDisponivel?'Meta indisponível: falta uma ou mais abas das semanas anteriores.':!semanaSelecionada.disponivel?'Realizado indisponível: a aba desta semana ainda não existe.':'Meta redistribuída pelo saldo das semanas anteriores e realizado da semana selecionada.'}</p>}

 {(modo==='ambos'||modo==='pares')&&<div className="en-kpis">{card(semana===null?'METAS PARES MÊS':'META PARES SEMANA',inteiro(total.metaPares))}{card(semana===null?'REALIZADO PARES MÊS':'REALIZADO PARES SEMANA',inteiro(total.realPares))}{card(semana===null?'DIFERENÇA PARES MÊS':'DIFERENÇA PARES SEMANA',inteiro(total.realPares-total.metaPares),'pink')}{card('â–² % MÊS',pct(total.realPares,total.metaPares),'pink')}{semana===null&&<><div className="en-empty"/>{card('REALIZADO PARES MÊS ANTERIOR',inteiro(total.anteriorPares))}{card('DIFERENÇA PARES MÊS ANTERIOR',inteiro(total.realPares-total.anteriorPares),'pink')}{card('â–² % MÊS ANTERIOR',pct(total.realPares,total.anteriorPares),'pink')}</>}</div>}

 {(modo==='ambos'||modo==='valores')&&<div className="en-kpis">{card(semana===null?'METAS R$ MÊS':'META R$ SEMANA',moeda(total.metaValor))}{card(semana===null?'REALIZADO R$ MÊS':'REALIZADO R$ SEMANA',moeda(total.realValor))}{card(semana===null?'DIFERENÇA R$ MÊS':'DIFERENÇA R$ SEMANA',moeda(total.realValor-total.metaValor),'pink')}{card('â–² % MÊS',pct(total.realValor,total.metaValor),'pink')}{semana===null&&<><div className="en-empty"/>{card('REALIZADO R$ MÊS ANTERIOR',moeda(total.anteriorValor))}{card('DIFERENÇA R$ MÊS ANTERIOR',moeda(total.realValor-total.anteriorValor),'pink')}{card('â–² % MÊS ANTERIOR',pct(total.realValor,total.anteriorValor),'pink')}</>}</div>}

 <div className="en-controls"><div><button className="open" onClick={()=>{setMostrarSupervisor(true);setMostrarRepresentante(true)}}>ABRIR DADOS</button><button className="close" onClick={()=>{setMostrarSupervisor(false);setMostrarRepresentante(false)}}>FECHAR DADOS</button></div><span>DETALHAMENTO POR SUPERVISOR E REPRESENTANTE</span></div>

 <div className="en-table-heading"><strong>DETALHAMENTO POR SUPERVISOR</strong><button type="button" aria-expanded={mostrarSupervisor} onClick={()=>setMostrarSupervisor(v=>!v)}>{mostrarSupervisor?'OCULTAR SUPERVISORES':'EXIBIR SUPERVISORES'}</button></div>
  {mostrarSupervisor&&(dadosSemanaValidos?tabela('supervisor'):<p className="en-week-notice">Dados da semana ainda não disponíveis para esta tabela.</p>)}
  <div className="en-table-heading"><strong>DETALHAMENTO POR REPRESENTANTE</strong><button type="button" aria-expanded={mostrarRepresentante} onClick={()=>setMostrarRepresentante(v=>!v)}>{mostrarRepresentante?'OCULTAR REPRESENTANTES':'EXIBIR REPRESENTANTES'}</button></div>
  {mostrarRepresentante&&(dadosSemanaValidos?tabela('representante'):<p className="en-week-notice">Dados da semana ainda não disponíveis para esta tabela.</p>)}

 <p className="en-foot">Fonte: {dados?.periodo||'—'} · Metas: {dados?.metasValidas??'—'} registros · Entrada: {dados?.vendasValidas??'—'} registros. Cálculos aguardando validação contra o PBIX.</p>

 {dados?.avisos?.map((a,i)=><p className="en-foot" key={i}>{a}</p>)}

 <style jsx global>{`

 .en-wrap{max-width:1300px;margin:0 auto;padding:10px 18px 45px;background:#fff;color:#141414;font-family:Arial,sans-serif;min-height:100vh}.en-nav{display:flex;margin-left:145px;gap:2px;height:38px}.en-nav :global(a){display:flex;align-items:center;justify-content:center;background:#7b8590;color:white;flex:1;text-align:center;font-weight:800;font-size:12px;text-decoration:none;white-space:nowrap;padding:0 3px}.en-nav :global(a.active){background:#ff6b00}.en-header{display:flex;align-items:center;gap:15px;min-height:102px}.en-header h1{color:#ff6b00;font-size:32px;font-weight:900;margin:0;flex:1}.en-actions{display:flex;flex-direction:column;min-width:155px}.en-actions button,.en-actions :global(a){border:2px solid #ff6b00;background:white;text-decoration:none;color:black;text-align:center;font-weight:800;font-size:10px;padding:5px;cursor:pointer}.en-actions :global(a){background:#caffc1}.en-region{border:3px solid #ff6b00;border-radius:11px;padding:7px 10px 10px;margin-top:4px}.en-region small{font-size:10px}.en-region>div{display:flex;gap:3px;flex-wrap:wrap}.en-region button{flex:1;min-width:90px;background:#303030;color:white;border:2px solid #ff6b00;min-height:32px;font-size:10px;font-weight:800;cursor:pointer}.en-region button.selected{background:#ff6b00}.en-title{border:3px solid #ff6b00;border-radius:10px;text-align:center;font-size:32px;font-weight:900;margin:13px 0;padding:6px}.en-rep{border:3px solid #ff6b00;border-radius:10px;padding:8px 12px}.en-rep label{display:block;font-size:11px}.en-rep select{display:block;width:100%;padding:8px;border:1px solid #ddd;background:white}.en-summary{display:grid;grid-template-columns:4fr 1.1fr;gap:16px;align-items:stretch}.en-summary .en-title{display:flex;align-items:center;justify-content:center}.en-parameter{margin:13px 0;border:3px solid #ff6b00;border-radius:10px;background:#9dff9b;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:5px;padding:8px;text-align:center}.en-parameter span{font-weight:900;color:#ff6b00;font-size:13px}.en-parameter strong{font-size:19px}.en-parameter small{font-size:9px}.en-filterbar{display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap;margin:12px 0}.en-mode{display:flex;gap:8px;margin:0;flex-wrap:wrap}.en-mode button{background:#333;color:white;border:2px solid #ff6b00;font-size:11px;font-weight:800;padding:7px 18px;cursor:pointer}.en-mode button.selected{background:#ff6b00}.en-weeks{display:flex;align-items:center;gap:3px;flex-wrap:wrap}.en-weeks button{background:#7b8590;color:white;border:2px solid #0866bb;transform:skew(-12deg);padding:9px 10px;font-weight:900;font-size:10px;cursor:pointer;white-space:nowrap}.en-weeks button.active{background:#ff6b00;border-color:#ff6b00}.en-week-notice{background:#fff7e8;border:1px solid #ff6b00;color:#713800;padding:10px 12px;font-size:12px;border-radius:6px}.en-kpis{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:9px;margin:12px 0 20px}.en-card{min-height:70px;border:3px solid #ff6b00;border-radius:10px;display:flex;flex-direction:column;justify-content:center;align-items:center;gap:8px;padding:8px;text-align:center;box-shadow:0 2px 5px #0002}.en-card.pink{background:#efb3b6}.en-card span{font-size:12px;color:#ff6b00;font-weight:900}.en-card strong{font-size:17px;white-space:nowrap}.en-controls{display:flex;justify-content:space-between;align-items:center;gap:10px;margin:20px 0 10px}.en-controls>div{display:flex;gap:8px}.en-controls button{border:2px solid #111;border-radius:5px;font-weight:900;font-size:11px;padding:6px 15px;cursor:pointer}.en-controls .open{background:#9dff9b}.en-controls .close{background:#111;color:white}.en-controls span{font-size:11px;color:#777;font-weight:800}.en-table-heading{display:flex;align-items:center;justify-content:space-between;gap:12px;margin:14px 0 6px;font-size:11px;font-weight:800;color:#555}.en-table-heading button{background:#fff;color:#222;border:2px solid #ff6b00;border-radius:5px;padding:7px 12px;font-size:10px;font-weight:900;cursor:pointer}.en-table-heading button:hover{background:#fff1e7}.en-table{margin:6px 0 22px}.en-scroll{overflow:auto;max-height:460px}.en-table table{width:100%;border-collapse:collapse;font-size:11px;white-space:nowrap}.en-table th{background:#ff6b00;color:white;text-align:left;padding:6px;position:sticky;top:0}.en-table td{padding:5px 6px;border-bottom:1px solid #d6d6d6;text-align:right}.en-table td:first-child{text-align:left;font-weight:700}.en-table tr:nth-child(even){background:#f6f6f6}.en-table .en-total{background:#8bc5ff!important;font-weight:900}.en-foot{font-size:11px;color:#666}.en-error{padding:12px;background:#fee;color:#900;border:1px solid #d00;white-space:pre-wrap}.en-error pre{white-space:pre-wrap;font-size:12px}@media(max-width:900px){.en-nav{margin-left:0}.en-nav :global(a){font-size:9px}.en-header h1{font-size:24px}.en-kpis{grid-template-columns:repeat(2,minmax(0,1fr))}.en-card strong{font-size:14px}}@media(max-width:550px){.en-header{flex-wrap:wrap}.en-actions{width:100%}.en-kpis{grid-template-columns:repeat(2,minmax(0,1fr))}.en-summary{grid-template-columns:1fr}.en-controls{flex-wrap:wrap}}

 `}</style>

 </main>

}
