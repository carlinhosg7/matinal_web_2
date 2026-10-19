'use client';
import {useState} from 'react';
import {jsPDF} from 'jspdf';

type Meta={pais:string;id:string;metaValor:number;metaPares:number;valor2025:number;valor2026JanSet:number;pares2025:number;pares2026JanSet:number};
type Dados={metas:Meta[];avisos?:string[];geradoEm?:string};
type Pais={pais:string;id:string;meta:number;projecao:number;metaPares:number;pares:number;mercado?:unknown;comercio?:unknown};
function estimar(m:Meta){const v=m.valor2026JanSet*12/9,p=m.pares2026JanSet*12/9;return {v:Math.max(0,m.valor2025>0&&v>0?m.valor2025*.35+v*.65:v||m.valor2025),p:Math.max(0,m.pares2025>0&&p>0?m.pares2025*.35+p*.65:p||m.pares2025)};}
const br=(n:number)=>n.toLocaleString('pt-BR',{minimumFractionDigits:2,maximumFractionDigits:2});
const eur=(n:number)=>'R$ '+br(n);
function getRecent(a:any,key:string){const ind=(a?.indicadores||[]).find((x:any)=>x.key===key);return ind?.serie?.length?ind.serie[ind.serie.length-1]:null;}
async function externo(url:string){try{const ac=new AbortController();const t=setTimeout(()=>ac.abort(),11000);try{const r=await fetch(url,{cache:'no-store',signal:ac.signal});return r.ok?await r.json():null}finally{clearTimeout(t)}}catch{return null}}
export default function ResumoExecutivo({dados,paisSelecionado,cenario}:{dados:Dados;paisSelecionado:string;cenario:'conservador'|'base'|'otimista'}){
 const [gerando,setGerando]=useState(false),[etapa,setEtapa]=useState(''),[erro,setErro]=useState('');
 async function gerar(){
  setGerando(true);setErro('');setEtapa('Consolidando metas e estimativas...');
  try{
   const fator=cenario==='conservador'?.9:cenario==='otimista'?1.1:1;
   const lista=dados.metas.filter(m=>!paisSelecionado||m.id===paisSelecionado).map(m=>{const e=estimar(m);return {pais:m.pais,id:m.id,meta:m.metaValor,projecao:e.v*fator,metaPares:m.metaPares,pares:e.p*fator} as Pais});
   if(!lista.length)throw Error('Nao ha dados para o filtro atual');
   // External APIs can have rate limits. Consult in small batches, preserving unavailable status.
   for(let offset=0;offset<lista.length;offset+=3){
    const lote=lista.slice(offset,offset+3);setEtapa(`Consultando mercado e SH64: ${Math.min(offset+3,lista.length)}/${lista.length} paises...`);
    await Promise.all(lote.map(async x=>{const [mercado,comercio]=await Promise.all([externo('/api/export/mercado?pais='+encodeURIComponent(x.pais)),externo('/api/export/comercio-calcados?pais='+encodeURIComponent(x.pais))]);x.mercado=mercado;x.comercio=comercio}));
   }
   const totalMeta=lista.reduce((s,p)=>s+p.meta,0),totalProjecao=lista.reduce((s,p)=>s+p.projecao,0);
   setEtapa('Calculando diagnostico executivo...');
   let narrativa='';
   const res=await fetch('/api/export/resumo-executivo',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({escopo:paisSelecionado?'Pais selecionado':'Todos os paises',cenario,totalMeta,totalProjecao,paises:lista,avisos:dados.avisos||[]})});
   if(!res.ok){const falha=await res.json().catch(()=>({}));throw Error(falha.erro||('Falha no servico de analise (HTTP '+res.status+')'));}
   const txt=await res.json();narrativa=txt.texto||'';
   setEtapa('Montando PDF e graficos...');
   const pdf=new jsPDF({format:'a4',unit:'mm'});const W=210,H=297,M=16;let y=20;let pagina=1;
   const cabe=()=>{pdf.setFillColor(17,42,72);pdf.rect(0,0,W,13,'F');pdf.setFont('helvetica','bold');pdf.setTextColor(255,255,255);pdf.setFontSize(9);pdf.text('KIDY  |  INTELIGENCIA DE EXPORTACAO',M,8.5);pdf.setTextColor(30,48,71);pdf.setFont('helvetica','normal')};
   const rodape=()=>{pdf.setDrawColor(215,223,232);pdf.line(M,H-14,W-M,H-14);pdf.setFontSize(8);pdf.setTextColor(105,120,140);pdf.text(`Relatorio gerado em ${new Date().toLocaleString('pt-BR')}  |  Pagina ${pagina}`,M,H-9)};
   const nova=()=>{rodape();pdf.addPage();pagina++;y=21;cabe()};
   const esp=(n:number)=>{if(y+n>H-20)nova()};
   const titulo=(s:string)=>{esp(14);pdf.setTextColor(17,42,72);pdf.setFont('helvetica','bold');pdf.setFontSize(13);pdf.text(s,M,y);y+=8;pdf.setFont('helvetica','normal')};
   const par=(s:string,size=9)=>{pdf.setFontSize(size);pdf.setTextColor(47,64,82);const lines=pdf.splitTextToSize(s,W-2*M);for(const line of lines){esp(5);pdf.text(line,M,y);y+=5}y+=2};
   cabe();pdf.setFontSize(20);pdf.setFont('helvetica','bold');pdf.text('RESUMO EXECUTIVO',M,y);y+=9;pdf.setFontSize(13);pdf.text('Preditivo de Exportacao - 2027',M,y);y+=9;
   pdf.setFont('helvetica','normal');par(`Abrangencia: ${paisSelecionado?'pais selecionado':'todos os paises'} | Cenario: ${cenario} | Elaboracao: ${new Date().toLocaleDateString('pt-BR')}`);
   const kpis=[['Meta 2027',eur(totalMeta)],['Estimativa historica',eur(totalProjecao)],['Cobertura',(totalMeta?totalProjecao/totalMeta*100:0).toFixed(1).replace('.',',')+'%'],['Diferenca',eur(totalProjecao-totalMeta)]];
   let x=M;for(let i=0;i<4;i++){pdf.setFillColor(236,243,249);pdf.roundedRect(x,y,43,22,2,2,'F');pdf.setTextColor(80,99,122);pdf.setFontSize(8);pdf.text(kpis[i][0],x+3,y+6);pdf.setFontSize(9);pdf.setFont('helvetica','bold');pdf.setTextColor(21,45,76);const fit=pdf.splitTextToSize(kpis[i][1],39);pdf.text(fit.slice(0,2),x+3,y+13);pdf.setFont('helvetica','normal');x+=45;}y+=29;
   titulo('Diagnostico executivo quantitativo');
   for(const bloco of narrativa.split(/\n\s*\n/)){if(bloco.trim())par(bloco.trim(),9)}
   titulo('Meta x estimativa - maiores mercados');
   const top=[...lista].sort((a,b)=>b.meta-a.meta).slice(0,10),max=Math.max(1,...top.map(a=>Math.max(a.meta,a.projecao)));
   for(const p of top){esp(13);pdf.setTextColor(38,57,79);pdf.setFont('helvetica','bold');pdf.setFontSize(8);pdf.text(p.pais.slice(0,30),M,y);y+=3;pdf.setFillColor(23,62,103);pdf.rect(M,y,(W-M*2)*(p.meta/max),2.6,'F');y+=3.8;pdf.setFillColor(237,119,10);pdf.rect(M,y,(W-M*2)*(p.projecao/max),2.6,'F');y+=5.8;}
   par('Azul: meta de 2027. Laranja: estimativa historica. Comparacao visual, sem incorporar automaticamente indicadores externos.',8);
   titulo('Analise por pais e mercados externos');
   for(const p of [...lista].sort((a,b)=>b.meta-a.meta)){
    esp(47);pdf.setFont('helvetica','bold');pdf.setTextColor(21,46,76);pdf.setFontSize(11);pdf.text(p.pais,M,y);y+=7;pdf.setFont('helvetica','normal');
    par(`Meta: ${eur(p.meta)} | Estimativa: ${eur(p.projecao)} | Diferenca: ${eur(p.projecao-p.meta)} | Cobertura: ${p.meta?(p.projecao/p.meta*100).toFixed(1)+'%':'indisponivel'}`,8.5);
    const pib=getRecent(p.mercado,'pib'),inflacao=getRecent(p.mercado,'inflacao');
    par('PIB real: '+(pib?`${br(pib.valor)}% (${pib.ano})`:'indisponivel')+' | Inflacao: '+(inflacao?`${br(inflacao.valor)}% (${inflacao.ano})`:'indisponivel'),8.5);
    const serie=Array.isArray((p.comercio as any)?.serie)?(p.comercio as any).serie:[];const sh=serie.filter((a:any)=>a.importacoesUsd!==null&&Number.isFinite(Number(a.importacoesUsd))).at(-1);
    if(sh){const participacao=sh.importacoesUsd>0&&sh.brasilUsd!=null?` | Participacao Brasil: ${br(sh.brasilUsd/sh.importacoesUsd*100)}%`:'';par(`Importacoes SH64: US$ ${br(sh.importacoesUsd)} (${sh.ano})${participacao}`,8.5)}else par('Importacoes SH64: dados indisponiveis nesta consulta.',8.5);
    const fontes=['https://api.worldbank.org/','https://comtradeapi.un.org/'];pdf.setTextColor(99,113,130);pdf.setFontSize(8);pdf.text('Fontes: Banco Mundial e UN Comtrade (SH64 inclui componentes e nao isola infantil).',M,y);y+=9;
   }
   titulo('Metodologia, restricoes e rastreabilidade');
   par('Meta: planilha de planejamento de exportacao 2027. Estimativa: ponderacao do ano de 2025 (35%) e anualizacao dos meses janeiro-setembro de 2026 (65%), quando ambos disponiveis; cenarios: 0,90 / 1,00 / 1,10. Nao equivale a modelo estatistico validado nem probabilidade de atingir meta.',8.5);
   par('A carteira efetivamente aberta nao foi confirmada nem acrescida as projecoes, para evitar dupla contagem. Informacoes macroeconomicas e SH64 sao observacoes de mercado, nao fatores automaticamente aplicados a previsao de vendas KIDY.',8.5);
   par('Dados de SH64 correspondem a calcados e componentes, e nao isolam o segmento infantil. Consultas indisponiveis sao marcadas como tais; as fontes podem apresentar atraso ou limites de acesso. Indicadores economicos sao do ultimo ano divulgado, nao necessariamente 2027.',8.5);
   if(dados.avisos?.length){par('Alertas de origem: '+dados.avisos.slice(0,5).join('; '),8);}
   rodape();pdf.save(`KIDY-Resumo-Executivo-Exportacao-2027-${paisSelecionado||'Geral'}.pdf`);setEtapa('PDF gerado.');
  }catch(e){setErro(e instanceof Error?e.message:String(e));setEtapa('')}finally{setGerando(false)}
 }
 return <div style={{display:'flex',flexDirection:'column',alignItems:'flex-start',gap:7}}><button type="button" disabled={gerando} onClick={gerar} style={{border:0,borderRadius:10,padding:'12px 18px',background:gerando?'#8793a2':'#173f6a',color:'#fff',fontWeight:750,cursor:gerando?'wait':'pointer'}}>{gerando?'Preparando PDF...':'Gerar resumo executivo em PDF'}</button>{etapa&&<small aria-live="polite" style={{color:'#48627c'}}>{etapa}</small>}{erro&&<small role="alert" style={{color:'#a32424'}}>Erro: {erro}</small>}</div>;
}
