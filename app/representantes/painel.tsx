'use client';
import {useEffect,useMemo,useState} from 'react';
import Link from 'next/link';

type Linha={codigo:string;nome:string;supervisor:string;metaValor?:number;realValor?:number;metaPares?:number;realPares?:number;meta?:number;gruposMes?:string[];metaClientes?:number;realClientes?:number;[key:string]:unknown};
type Projeto={id:string;nome:string;linhas:Linha[]};
type Dados={linhas?:Linha[];projetos?:Projeto[];erro?:string};
type Bases=Record<string,Dados>;
const fontes=['faturamento','entrada','cobertura','projetos-especiais','brinquedos','kidex'];
const ORDEM=['BRINCAFLEX','VELOZ','IMPULSO 2','LOCALIZE','LUZES','REBECCA BONBON','BRINQUEDOS'];
const LOGOS:Record<string,string>={
 'BRINCAFLEX':'/logos/brincaflex.png','VELOZ':'/logos/veloz.png',
 'IMPULSO 2':'/logos/impulso2.png','LOCALIZE':'/logos/localize.png',
 'LUZES':'/logos/luzes.png','REBECCA BONBON':'/logos/rebecca-bonbon.png',
 'BRINQUEDOS':'/logos/brinquedos.png'
};
const norm=(s:string)=>s.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toUpperCase().replace(/[^A-Z0-9]/g,'');
function projetoNome(s:string){const k=norm(s);if(k.includes('KUZES')||k.includes('LUZES'))return 'LUZES';if(k.includes('REBECA')||k.includes('REBECCA'))return 'REBECCA BONBON';return ORDEM.find(x=>k.includes(norm(x)))||s.toUpperCase();}
const numero=(x:unknown)=>Number(x)||0;
const fmt=(x:number)=>x.toLocaleString('pt-BR',{maximumFractionDigits:0});
const moeda=(x:number)=>x.toLocaleString('pt-BR',{style:'currency',currency:'BRL'});
const pct=(a:number,b:number)=>b?`${(100*a/b).toLocaleString('pt-BR',{maximumFractionDigits:1})}%`:'—';
const seguro=(s:string)=>s.replace(/[^a-zA-Z0-9_-]/g,'_').slice(0,65);
const linha=(b:Dados|undefined,id:string)=>b?.linhas?.find(x=>String(x.codigo)===id);
function resumo(b:Bases,id:string){
 return ['faturamento','entrada','kidex','cobertura'].map(key=>{
  const x=linha(b[key],id);
  const cobertura=key==='cobertura';
  return {nome:key.toUpperCase(),metaP:numero(cobertura?x?.meta:x?.metaPares),
   realP:cobertura?new Set(x?.gruposMes||[]).size:numero(x?.realPares),
   metaV:numero(x?.metaValor),realV:numero(x?.realValor),cobertura};
 });
}
function projetos(b:Bases,id:string){
 const itens=[...(b['projetos-especiais']?.projetos||[]),...(b.brinquedos?.projetos||[])];
 const map=new Map<string,Linha|undefined>();
 for(const p of itens){
  const nome=projetoNome(p.nome);
  const x=p.linhas.find(v=>String(v.codigo)===id);
  if(!map.has(nome)||(!map.get(nome)&&x))map.set(nome,x);
 }
 // As sete linhas são exibidas, mas números inexistentes não são inventados.
 return ORDEM.map(nome=>({nome,linha:map.get(nome),existe:map.has(nome)}))
  .concat([...map.entries()].filter(([nome])=>!ORDEM.includes(nome)).map(([nome,x])=>({nome,linha:x,existe:true})));
}
// Busca apenas campos existentes, sem converter ausencia em zero.
const campos={
 metaClientes:['metaClientes','metaCli','metaClientesMes'],
 realClientes:['realClientes','realCli','realizadoClientes','clientesRealizados'],
 metaPares:['metaPares','metaQtd','metaQuantidade'],
 realPares:['realPares','realQtd','realQuantidade','qtdVenda'],
 metaValor:['metaValor','metaValores','metaVlr','metaFaturamento'],
 realValor:['realValor','realValores','realVlr','realFaturamento','vlrVenda']
} as const;
type Metrica=keyof typeof campos;
function valorProjeto(x:Linha|undefined,k:Metrica):number|null{
 if(!x)return null;
 for(const campo of campos[k]){
  const bruto=x[campo];
  if(bruto===undefined||bruto===null||bruto==='')continue;
  const numero=typeof bruto==='number'?bruto:Number(String(bruto).replace(/\./g,'').replace(',','.'));
  if(Number.isFinite(numero))return numero;
 }
 return null;
}
function exibicao(x:number|null,valor=false){return x===null?'—':valor?moeda(x):fmt(x)}
function percentualProjeto(a:number|null,b:number|null){return a===null||b===null?'—':pct(a,b)}
function valoresProjeto(x:Linha|undefined){
 const mc=valorProjeto(x,'metaClientes'),rc=valorProjeto(x,'realClientes');
 const mp=valorProjeto(x,'metaPares'),rp=valorProjeto(x,'realPares');
 const mv=valorProjeto(x,'metaValor'),rv=valorProjeto(x,'realValor');
 return [exibicao(mc),exibicao(rc),percentualProjeto(rc,mc),exibicao(mp),exibicao(rp),percentualProjeto(rp,mp),exibicao(mv,true),exibicao(rv,true),percentualProjeto(rv,mv)];
}
async function imagemData(url:string):Promise<string|null>{
 try{
  const response=await fetch(url,{cache:'force-cache'});
  if(!response.ok||!(response.headers.get('content-type')||'').startsWith('image/'))return null;
  const blob=await response.blob();
  return await new Promise<string>((resolve,reject)=>{
   const reader=new FileReader();reader.onload=()=>resolve(String(reader.result));reader.onerror=reject;reader.readAsDataURL(blob);
  });
 }catch{return null}
}
const th:React.CSSProperties={background:'#ff6900',color:'#fff',padding:'7px 8px',textAlign:'left',fontSize:11};
const td:React.CSSProperties={padding:'6px 8px',borderBottom:'1px solid #ddd',fontSize:11};
const select:React.CSSProperties={display:'block',width:'100%',padding:10,marginTop:7,border:'1px solid #bbb',borderRadius:6};
const btn:React.CSSProperties={background:'#333',color:'#fff',padding:'12px 15px',border:0,borderRadius:6,fontWeight:700,cursor:'pointer'};

export default function Painel(){
 const [bases,setBases]=useState<Bases>({}),[falhas,setFalhas]=useState<string[]>([]),[loading,setLoading]=useState(true);
 const [supervisor,setSupervisor]=useState(''),[codigo,setCodigo]=useState(''),[gerando,setGerando]=useState(false),[status,setStatus]=useState('');
 useEffect(()=>{
  let ativo=true;
  Promise.all(fontes.map(async key=>{
   try{const r=await fetch(`/api/${key}`,{cache:'no-store'});const d=await r.json() as Dados;if(!r.ok)throw Error(d.erro||`HTTP ${r.status}`);return [key,d,''] as const}
   catch(e){return [key,{},`${key}: ${String(e)}`] as const}
  })).then(results=>{if(!ativo)return;setBases(Object.fromEntries(results.map(([k,d])=>[k,d])));setFalhas(results.map(x=>x[2]).filter(Boolean));setLoading(false)});
  return()=>{ativo=false};
 },[]);
 const reps=useMemo(()=>{
  const map=new Map<string,Linha>();
  for(const key of ['faturamento','entrada','cobertura','kidex'])
   for(const x of bases[key]?.linhas||[]){
    const old=map.get(String(x.codigo));
    if(!old||!old.supervisor||old.supervisor==='SEM SUPERVISOR')map.set(String(x.codigo),x);
   }
  for(const key of ['projetos-especiais','brinquedos'])
   for(const p of bases[key]?.projetos||[])for(const x of p.linhas)
    if(!map.has(String(x.codigo)))map.set(String(x.codigo),x);
  return [...map.values()].sort((a,b)=>a.nome.localeCompare(b.nome,'pt-BR'));
 },[bases]);
 const supervisores=useMemo(()=>[...new Set(reps.map(x=>x.supervisor).filter(Boolean))].sort(),[reps]);
 const disponiveis=useMemo(()=>reps.filter(x=>!supervisor||x.supervisor===supervisor),[reps,supervisor]);
 const rep=disponiveis.find(x=>String(x.codigo)===codigo);
 const dadosResumo=rep?resumo(bases,String(rep.codigo)):[];
 const dadosProjetos=rep?projetos(bases,String(rep.codigo)):[];
 async function criarPDF(r:Linha){
  const {jsPDF}=await import('jspdf');
  const pdf=new jsPDF({orientation:'landscape',unit:'mm',format:'a4'});
  const W=297;
  pdf.setFillColor(255,105,0);pdf.rect(0,0,W,18,'F');
  const logo=await imagemData('/kidy-logo.png');
  if(logo){try{pdf.addImage(logo,'PNG',8,2,24,14)}catch{/* Logo inválida: mantém cabeçalho textual */}}
  pdf.setFont('helvetica','bold');pdf.setTextColor(255);pdf.setFontSize(16);pdf.text('KIDY  |  RESUMO COMERCIAL',logo?37:10,12);
  pdf.setTextColor(40);pdf.setFontSize(11);pdf.text(`${r.codigo} - ${r.nome}  |  ${r.supervisor}`,10,25);
  pdf.setFontSize(7);pdf.setTextColor(100);pdf.text(new Date().toLocaleString('pt-BR'),287,25,{align:'right'});
  const head=(headers:string[],widths:number[],y:number)=>{
   pdf.setFillColor(255,105,0);pdf.rect(10,y,277,7,'F');pdf.setTextColor(255);pdf.setFont('helvetica','bold');pdf.setFontSize(8);
   let x=12;headers.forEach((h,i)=>{pdf.text(h,x,y+4.8);x+=widths[i]});
  };
  const row=(values:string[],widths:number[],y:number,i:number)=>{
   if(i%2===0){pdf.setFillColor(245,245,245);pdf.rect(10,y,277,7,'F')}
   pdf.setFont('helvetica','normal');pdf.setFontSize(8);pdf.setTextColor(35);
   let x=12;values.forEach((v,j)=>{pdf.text(v,x,y+4.8,{maxWidth:widths[j]-3});x+=widths[j]});
  };
  pdf.setFont('helvetica','bold');pdf.setTextColor(255,105,0);pdf.setFontSize(11);pdf.text('RESUMO COMERCIAL',10,33);
  const widths=[37,29,29,29,25,38,38,30,22];
  head(['INDICADOR','META PAR','REAL PAR','DIF PAR','% PAR','META R$','REAL R$','DIF R$','% R$'],widths,36);
  resumo(bases,String(r.codigo)).forEach((x,i)=>row([x.nome,fmt(x.metaP),fmt(x.realP),fmt(x.realP-x.metaP),pct(x.realP,x.metaP),x.cobertura?'—':moeda(x.metaV),x.cobertura?'—':moeda(x.realV),x.cobertura?'—':moeda(x.realV-x.metaV),x.cobertura?'—':pct(x.realV,x.metaV)],widths,43+i*7,i));
  pdf.setFont('helvetica','bold');pdf.setTextColor(255,105,0);pdf.setFontSize(11);pdf.text('PROJETOS ESPECIAIS E BRINQUEDOS',10,79);
  const lista=projetos(bases,String(r.codigo));
  const logos=await Promise.all(lista.map(p=>imagemData(LOGOS[p.nome]||'')));
  const cols=['META CLI','REAL CLI','% CLI','META PAR','REAL PAR','% PAR','META R$','REAL R$','% R$'];
  const w3=[30,30,29,30,30,29,34,34,31];
  lista.forEach((p,i)=>{
   const y=82+i*16;
   if(y+15>199)return;
   pdf.setDrawColor(255,105,0);pdf.roundedRect(10,y,277,15,1,1,'S');
   pdf.setFillColor(255,246,239);pdf.rect(10.5,y+0.5,276,5,'F');
   pdf.setTextColor(255,105,0);pdf.setFont('helvetica','bold');pdf.setFontSize(8);
   if(logos[i]){try{pdf.addImage(logos[i]!,'PNG',13,y+0.5,19,4.5)}catch{/* mantém nome */}}
   pdf.text(p.nome,logos[i]?35:13,y+4);
   pdf.setFillColor(255,105,0);pdf.rect(10.5,y+5.5,276,4.5,'F');
   pdf.setTextColor(255);pdf.setFontSize(6.2);
   let xx=12;cols.forEach((v,j)=>{pdf.text(v,xx,y+8.7,{maxWidth:w3[j]-2});xx+=w3[j]});
   pdf.setTextColor(25);pdf.setFont('helvetica','normal');pdf.setFontSize(7);
   xx=12;valoresProjeto(p.linha).forEach((v,j)=>{pdf.text(v,xx,y+13.1,{maxWidth:w3[j]-2});xx+=w3[j]});
  });
  pdf.setDrawColor(255,105,0);pdf.line(10,200,287,200);
  pdf.setFontSize(7);pdf.setTextColor(90);pdf.text('KIDY | Uso interno comercial • Dados dos módulos do Matinal',10,205);
  pdf.text('1 / 1',287,205,{align:'right'});
  return pdf;
 }
 async function individual(){
  if(!rep)return;setGerando(true);setStatus('Gerando PDF completo...');
  try{(await criarPDF(rep)).save(`${seguro(String(rep.codigo)+'_'+rep.nome)}_completo.pdf`);setStatus('PDF completo gerado.')}
  catch(e){setStatus('Erro ao gerar PDF: '+String(e))}finally{setGerando(false)}
 }
 async function lote(){
  if(!supervisor){setStatus('Selecione um supervisor.');return}
  setGerando(true);
  try{
   const JSZip=(await import('jszip')).default;const zip=new JSZip();
   for(let i=0;i<disponiveis.length;i++){
    const r=disponiveis[i];setStatus(`Gerando ${i+1}/${disponiveis.length}: ${r.nome}`);
    const pdf=await criarPDF(r);zip.file(`${seguro(String(r.codigo)+'_'+r.nome)}_completo.pdf`,pdf.output('arraybuffer'));
   }
   const blob=await zip.generateAsync({type:'blob'});const url=URL.createObjectURL(blob);
   const a=document.createElement('a');a.href=url;a.download=`KIDY_${seguro(supervisor)}_completo.zip`;a.click();
   setTimeout(()=>URL.revokeObjectURL(url),60000);setStatus(`${disponiveis.length} PDFs completos gerados.`);
  }catch(e){setStatus('Erro no lote: '+String(e))}finally{setGerando(false)}
 }
 return <main style={{maxWidth:1190,margin:'auto',padding:20,fontFamily:'Arial,sans-serif',background:'#f5f6f8',minHeight:'100vh',color:'#222'}}>
  <header style={{display:'flex',alignItems:'center',gap:18,background:'#fff',padding:16,borderRadius:12,flexWrap:'wrap'}}>
   <img src="/kidy-logo.png" alt="KIDY" style={{width:105,maxHeight:70,objectFit:'contain'}}/>
   <div style={{flex:1}}><h1 style={{color:'#ff6900',margin:0}}>RESUMO COMERCIAL | REPRESENTANTES</h1><p style={{margin:'6px 0'}}>Resumo e projetos especiais em uma página</p></div>
   <Link href="/portal" style={{background:'#d9ffd1',border:'2px solid #ff6900',padding:10,color:'#222',textDecoration:'none',fontWeight:700}}>VOLTAR AO INÍCIO</Link>
  </header>
  <section style={{background:'#fff',padding:16,marginTop:14,border:'2px solid #ff6900',borderRadius:12,display:'flex',gap:12,flexWrap:'wrap'}}>
   <label style={{flex:'1 1 220px'}}>Supervisor<select value={supervisor} onChange={e=>{setSupervisor(e.target.value);setCodigo('')}} style={select}><option value="">Todos os supervisores</option>{supervisores.map(s=><option key={s}>{s}</option>)}</select></label>
   <label style={{flex:'2 1 300px'}}>Representante<select value={codigo} onChange={e=>setCodigo(e.target.value)} style={select}><option value="">Selecione um representante</option>{disponiveis.map(r=><option key={r.codigo} value={String(r.codigo)}>{r.codigo} - {r.nome}</option>)}</select></label>
  </section>
  {loading&&<p>Carregando bases comerciais...</p>}
  {falhas.length>0&&<div style={{background:'#fff3dc',padding:12,marginTop:10,border:'1px solid #e7a23d'}}><strong>Falha no carregamento:</strong>{falhas.map(f=><p key={f}>{f}</p>)}<p>Não gere PDFs até corrigir as bases.</p></div>}
  <section style={{display:'flex',gap:10,flexWrap:'wrap',margin:'16px 0'}}>
   <button style={btn} disabled={!rep||gerando||loading||falhas.length>0} onClick={individual}>GERAR PDF DO REPRESENTANTE</button>
   <button style={btn} disabled={!supervisor||gerando||loading||falhas.length>0} onClick={lote}>GERAR PDFs DO SUPERVISOR (ZIP)</button>
  </section>
  {status&&<p role="status">{status}</p>}
  {!rep?<div style={{padding:30,background:'#fff',borderRadius:12,textAlign:'center'}}>Selecione um representante para visualizar o relatório completo.</div>:
   <article style={{background:'#fff',border:'2px solid #ff6900',borderRadius:12,padding:18}}>
    <h2 style={{color:'#ff6900',margin:'0 0 5px'}}>RESUMO COMERCIAL</h2>
    <p><strong>{rep.codigo} - {rep.nome}</strong> | {rep.supervisor}</p>
    <div style={{overflowX:'auto'}}><table style={{width:'100%',minWidth:1100,borderCollapse:'collapse',tableLayout:'fixed'}}><thead><tr>{['Indicador','Meta Pares','Real. Pares','Dif. Pares','% Pares','Meta R$','Real. R$','Dif. R$','% Valores'].map(h=><th key={h} style={{...th,whiteSpace:'nowrap'}}>{h}</th>)}</tr></thead>
    <tbody>{dadosResumo.map(x=><tr key={x.nome}><td style={td}>{x.nome}</td><td style={td}>{fmt(x.metaP)}</td><td style={td}>{fmt(x.realP)}</td><td style={td}>{fmt(x.realP-x.metaP)}</td><td style={td}>{pct(x.realP,x.metaP)}</td><td style={td}>{x.cobertura?'—':moeda(x.metaV)}</td><td style={td}>{x.cobertura?'—':moeda(x.realV)}</td><td style={td}>{x.cobertura?'—':moeda(x.realV-x.metaV)}</td><td style={td}>{x.cobertura?'—':pct(x.realV,x.metaV)}</td></tr>)}</tbody></table></div>
    <h2 style={{color:'#ff6900',margin:'20px 0 12px'}}>PROJETOS ESPECIAIS E BRINQUEDOS</h2>
    {dadosProjetos.map(p=><section key={p.nome} style={{border:'2px solid #ff6900',borderRadius:7,marginBottom:9,overflow:'hidden'}}>
     <div style={{background:'#fff6ef',padding:'5px 12px',minHeight:39,display:'flex',alignItems:'center',justifyContent:'center',gap:12}}>
      <img src={LOGOS[p.nome]||'/kidy-logo.png'} alt={p.nome} onError={e=>{e.currentTarget.style.display='none'}} style={{height:31,maxWidth:150,objectFit:'contain'}}/>
      <strong style={{color:'#ff6900',fontSize:15}}>{p.nome}</strong>
     </div>
     <div style={{overflowX:'auto'}}><table style={{width:'100%',borderCollapse:'collapse',minWidth:1020,tableLayout:'fixed'}}>
      <thead><tr>{['Meta Clientes','Real. Clientes','% Clientes','Meta Pares','Real. Pares','% Pares','Meta R$','Real. R$','% Valores'].map((h,i)=><th key={h} style={{...th,textAlign:'center',padding:'7px 4px',borderRight:(i===2||i===5)?'2px solid white':undefined}}>{h}</th>)}</tr></thead>
      <tbody><tr>{valoresProjeto(p.linha).map((v,i)=><td key={i} style={{...td,textAlign:'center',fontWeight:i===2||i===5||i===8?700:400,whiteSpace:'nowrap',padding:'8px 3px'}}>{v}</td>)}</tr></tbody>
     </table></div>
     {!p.existe&&<small style={{color:'#a33',padding:8,display:'block'}}>Projeto não encontrado na API atual. Verificar origem dos dados.</small>}
    </section>)}
    <p style={{fontSize:11,color:'#666'}}>Relatório único por representante. Traço (—) indica campo ausente na API ou percentual sem meta válida. Confira as metas e realizados com o PBIX antes do envio.</p>
   </article>}
 </main>;
}
