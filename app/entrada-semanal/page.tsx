'use client';
import {useEffect,useState} from 'react';
import Link from 'next/link';
type Secao='NACIONAL'|'RN'|'B2B';
type Tipo='PRODUCAO'|'KIDEX';
type Linha={secao:Secao;regional:string;gerente:string;representante?:string;tipo:Tipo;meta:number;realizado:number};
type Semana={numero:number;inicio:number;fim:number;linhas:Linha[]};
type Api={periodo:string;semanas:Semana[];avisos:string[];erro?:string};
const fmt=(n:number)=>n.toLocaleString('pt-BR',{maximumFractionDigits:0});
const pct=(m:number,r:number)=>m?(r/m*100).toLocaleString('pt-BR',{minimumFractionDigits:2,maximumFractionDigits:2})+'%':'—';
const cell:React.CSSProperties={border:'1px solid #cbd5e1',padding:'10px 12px'};

// Defesa adicional: a exibicao nunca mistura linhas entre segmentos.
const normalizarRegional=(s:string)=>s.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toUpperCase().replace(/\s+/g,' ').trim();
const regionaisNacionais=new Set(['CEO','REM','NORTE / NORDESTE','NORTE/NORDESTE','SUL','SPC','SPI']);
const regionaisRN=new Set(['RN - SP/SUL','RN - NORTE/NORDESTE','RN - CEO/REM']);
function pertenceAoSegmento(l:Linha,segmento:Secao){
 const reg=normalizarRegional(l.regional);
 const rep=String(l.representante||'').trim();
 if(segmento==='NACIONAL')return l.secao==='NACIONAL'&&regionaisNacionais.has(reg);
 if(segmento==='RN')return l.secao==='RN'&&regionaisRN.has(reg);
 return l.secao==='B2B'&&(['264','273','296','334'].some(id=>rep===id||rep.startsWith(id+'-')||rep.startsWith(id+' '))||['264','273','296','334'].some(id=>reg===id||reg.startsWith(id+'-')));
}

export default function EntradaSemanal(){
 const [dados,setDados]=useState<Api|null>(null),[semana,setSemana]=useState(1),[segmento,setSegmento]=useState<Secao>('NACIONAL'),[erro,setErro]=useState('');
 useEffect(()=>{fetch('/api/entrada-semanal',{cache:'no-store'}).then(async r=>{const j=await r.json();if(!r.ok)throw Error(j.erro||'Falha ao carregar');setDados(j)}).catch(e=>setErro(e instanceof Error?e.message:String(e)))},[]);
 const atual=dados?.semanas.find(s=>s.numero===semana)||dados?.semanas[0];
 function tabela(titulo:string,tipo:'GERAL'|Tipo){
  const agrupados=new Map<string,Linha>();
  for(const l of atual?.linhas||[]){if(!pertenceAoSegmento(l,segmento)||(tipo!=='GERAL'&&l.tipo!==tipo))continue;const key=segmento==='B2B'?(l.representante||l.regional):l.regional;const prev=agrupados.get(key);if(prev){prev.meta+=l.meta;prev.realizado+=l.realizado}else agrupados.set(key,{...l})}
  const linhas=[...agrupados.values()].sort((a,b)=>(segmento==='B2B'?(a.representante||''):(a.regional)).localeCompare(segmento==='B2B'?(b.representante||''):b.regional,'pt-BR'));
  const meta=linhas.reduce((s,l)=>s+l.meta,0),realizado=linhas.reduce((s,l)=>s+l.realizado,0);
  function linha(l:Linha,isTotal=false){return <tr key={l.regional} style={{fontWeight:isTotal?800:400,background:isTotal?'#eef2f7':'white'}}><td style={cell}>{segmento==='B2B'?(l.representante||l.regional):l.regional}</td><td style={cell}>{l.gerente}</td><td style={{...cell,textAlign:'right'}}>{fmt(l.meta)}</td><td style={{...cell,textAlign:'right'}}>{fmt(l.realizado)}</td><td style={{...cell,textAlign:'right',background:l.realizado<l.meta?'#fee2e2':'#dcfce7'}}>{fmt(l.realizado-l.meta)}</td><td style={{...cell,textAlign:'right',background:l.realizado<l.meta?'#fee2e2':'#dcfce7'}}>{pct(l.meta,l.realizado)}</td></tr>}
  return <section key={titulo} style={{marginBottom:26}}><h2 style={{fontSize:18,background:'#90a9d3',textAlign:'center',padding:12,margin:0}}>{titulo}</h2><div style={{overflowX:'auto'}}><table style={{borderCollapse:'collapse',width:'100%',minWidth:750}}><thead><tr>{[segmento==='B2B'?'REPRESENTANTE':'REGIONAL','GERENTE','META SEMANA','REALIZADO SEMANA','DIF.','▲ %'].map(h=><th key={h} style={{...cell,background:'#f8fafc'}}>{h}</th>)}</tr></thead><tbody>{linhas.map(l=>linha(l))}{linha({secao:segmento,regional:'TOTAL',representante:'TOTAL',gerente:'—',tipo:'PRODUCAO',meta,realizado},true)}</tbody></table></div></section>;
 }
 async function gerarPdf(){
  if(!atual||!dados)return;
  const semanaAtual=atual;
  const dadosAtuais=dados;
  const {jsPDF}=await import('jspdf');
  const pdf=new jsPDF({orientation:'landscape',unit:'mm',format:'a4'});
  const W=297,H=210,M=11;
  const titulos:[string,'GERAL'|Tipo][]=[['GERAL','GERAL'],['PRODUÇÃO — PEDIDO NORMAL','PRODUCAO'],['PRONTA ENTREGA — KIDEX','KIDEX']];
  const colunas=['REGIONAL','GERENTE','META SEMANA','REALIZADO SEMANA','DIF.','%'];
  const larguras=[53,43,45,51,40,43];
  const linhasDaTabela=(secao:Secao,tipo:'GERAL'|Tipo)=>{
   const mapa=new Map<string,Linha>();
   for(const l of semanaAtual.linhas){if(!pertenceAoSegmento(l,secao)||(tipo!=='GERAL'&&l.tipo!==tipo))continue;
    const chave=secao==='B2B'?(l.representante||l.regional):l.regional;const anterior=mapa.get(chave);
    if(anterior){anterior.meta+=l.meta;anterior.realizado+=l.realizado;}
    else mapa.set(chave,{...l});
   }
   const linhas=[...mapa.values()].sort((a,b)=>(secao==='B2B'?(a.representante||''):a.regional).localeCompare(secao==='B2B'?(b.representante||''):b.regional,'pt-BR'));
   const meta=linhas.reduce((a,l)=>a+l.meta,0),realizado=linhas.reduce((a,l)=>a+l.realizado,0);
   return [...linhas,{secao,regional:'TOTAL',representante:'TOTAL',gerente:'—',tipo:'PRODUCAO' as Tipo,meta,realizado}];
  };
  function texto(t:string,x:number,y:number,align:'left'|'center'|'right'='left'){
   pdf.text(t,x,y,{align,maxWidth:align==='left'?52:undefined});
  }
  function tabelaPdf(secao:Secao,tipo:'GERAL'|Tipo,titulo:string,y:number,altura:number){
   const linhas=linhasDaTabela(secao,tipo);
   const rowH=Math.min(6.2,Math.max(3.2,(altura-8)/(linhas.length+1)));
   const fontSize=Math.min(8.2,Math.max(5.3,rowH*1.22));
   pdf.setFillColor(144,169,211);pdf.rect(M,y,W-2*M,8,'F');
   pdf.setFont('helvetica','bold');pdf.setTextColor(20,38,66);pdf.setFontSize(9.5);
   pdf.text(titulo,W/2,y+5.4,{align:'center'});
   let yy=y+8;
   const todas=[null,...linhas];
   todas.forEach((linha,i)=>{
    const total=i===todas.length-1;
    if(i===0)pdf.setFillColor(239,243,249);
    else if(total)pdf.setFillColor(226,233,243);
    else pdf.setFillColor(255,255,255);
    pdf.rect(M,yy,W-2*M,rowH,'F');
    pdf.setDrawColor(202,211,224);pdf.setLineWidth(0.15);
    let x=M;
    const valores=linha?[secao==='B2B'?(linha.representante||linha.regional):linha.regional,linha.gerente,fmt(linha.meta),fmt(linha.realizado),fmt(linha.realizado-linha.meta),pct(linha.meta,linha.realizado)]:(secao==='B2B'?['REPRESENTANTE',...colunas.slice(1)]:colunas);
    pdf.setFont('helvetica',i===0||total?'bold':'normal');pdf.setFontSize(fontSize);pdf.setTextColor(26,42,65);
    valores.forEach((v,j)=>{
     pdf.rect(x,yy,larguras[j],rowH);
     const value=String(v);
     const max=larguras[j]-3;
     let display=value;
     while(pdf.getTextWidth(display)>max&&display.length>1)display=display.slice(0,-2)+'…';
     texto(display,j<2?x+1.5:x+larguras[j]-1.5,yy+rowH*.71,j<2?'left':'right');
     x+=larguras[j];
    });
    yy+=rowH;
   });
  }
  function cabecalho(pagina:number,descricao:string){
   pdf.setFillColor(249,115,22);pdf.rect(0,0,W,3,'F');
   pdf.setFont('helvetica','bold');pdf.setFontSize(17);pdf.setTextColor(249,115,22);
   pdf.text('KIDY  |  ENTRADA SEMANAL',M,15);
   pdf.setFontSize(10);pdf.setTextColor(39,55,78);
   pdf.text(descricao,M,22);
   pdf.setFontSize(9);pdf.text('Semana '+semanaAtual.numero+'  •  '+String(semanaAtual.inicio).padStart(2,'0')+' a '+String(semanaAtual.fim).padStart(2,'0')+'/'+dadosAtuais.periodo,W-M,22,{align:'right'});
   pdf.setFontSize(8);pdf.setTextColor(110,122,139);
   pdf.text('Matinal Comercial  •  Página '+pagina+' de 3',W-M,H-5,{align:'right'});
  }
  cabecalho(1,'NACIONAL — Geral, Produção e Kidex');
  const tabelasNacional=titulos.map(([titulo,tipo])=>({titulo,tipo,linhas:linhasDaTabela('NACIONAL',tipo).length}));
  const espaco1=H-35-10;
  const pesos1=tabelasNacional.map(t=>Math.max(3,t.linhas+2));
  const soma1=pesos1.reduce((a,b)=>a+b,0);
  let y=29;
  tabelasNacional.forEach((t,i)=>{const h=espaco1*pesos1[i]/soma1;tabelaPdf('NACIONAL',t.tipo,t.titulo,y,h);y+=h+3;});
  pdf.addPage();cabecalho(2,'RN — Geral, Produção e Kidex');
  const gruposRn=titulos.map(([titulo,tipo])=>({titulo,tipo,linhas:linhasDaTabela('RN',tipo).length}));
  const pesosRn=gruposRn.map(g=>Math.max(3,g.linhas+2));
  const somaRn=pesosRn.reduce((a,b)=>a+b,0);
  y=29;
  gruposRn.forEach((g,i)=>{const h=espaco1*pesosRn[i]/somaRn;tabelaPdf('RN',g.tipo,'RN — '+g.titulo,y,h);y+=h+3;});
  pdf.addPage();cabecalho(3,'B2B — Por representante | Geral, Produção e Kidex');
  const gruposB2b=titulos.map(([titulo,tipo])=>({titulo,tipo,linhas:linhasDaTabela('B2B',tipo).length}));
  const pesosB2b=gruposB2b.map(g=>Math.max(3,g.linhas+2));
  const somaB2b=pesosB2b.reduce((a,b)=>a+b,0);
  y=29;
  gruposB2b.forEach((g,i)=>{const h=espaco1*pesosB2b[i]/somaB2b;tabelaPdf('B2B',g.tipo,'B2B — '+g.titulo,y,h);y+=h+3;});
  pdf.save('KIDY_Entrada_Semanal_Semana_'+semanaAtual.numero+'_'+dadosAtuais.periodo.replace(/\W/g,'-')+'.pdf');
 }
 const botao=(ativo:boolean):React.CSSProperties=>({padding:'11px 20px',border:0,borderRadius:7,cursor:'pointer',background:ativo?'#f97316':'#dbe2ed',color:ativo?'white':'#1f2937',fontWeight:700});
 return <main style={{background:'#f4f6f9',minHeight:'100vh',padding:'28px 18px',fontFamily:'Arial,sans-serif'}}><div style={{maxWidth:1150,margin:'auto'}}><Link href="/portal">← Voltar ao portal</Link><header style={{display:'flex',alignItems:'center',gap:22,margin:'22px 0'}}><img src="/kidy-logo.png" alt="KIDY" style={{width:110}}/><div><h1 style={{color:'#f97316',margin:0}}>ENTRADA SEMANAL</h1><strong>{dados?.periodo||'Carregando período...'}</strong></div></header><div style={{display:'flex',gap:8,flexWrap:'wrap',marginBottom:18}}>{(['NACIONAL','RN','B2B'] as Secao[]).map(s=><button key={s} onClick={()=>setSegmento(s)} style={botao(segmento===s)}>{s==='NACIONAL'?'Nacional':s}</button>)}</div>{erro&&<p role="alert" style={{color:'#b91c1c'}}>{erro}</p>}<div style={{display:'flex',gap:8,flexWrap:'wrap',marginBottom:24}}>{dados?.semanas.map(s=><button key={s.numero} onClick={()=>setSemana(s.numero)} style={botao(semana===s.numero)}>Semana {s.numero}</button>)}{atual&&<button onClick={gerarPdf} style={{...botao(false),background:'#1f4676',color:'#fff',marginLeft:'auto'}}>📄 Gerar PDF (3 páginas)</button>}</div>{atual&&<><p style={{fontWeight:700}}>PERÍODO: {String(atual.inicio).padStart(2,'0')} A {String(atual.fim).padStart(2,'0')} / {dados?.periodo}</p>{tabela('GERAL','GERAL')}{tabela('PRODUÇÃO — PEDIDO NORMAL','PRODUCAO')}{tabela('PRONTA ENTREGA — KIDEX','KIDEX')}</>}{dados?.avisos?.map((a,i)=><p key={i} style={{fontSize:12,color:'#64748b'}}>{a}</p>)}</div></main>;
}
