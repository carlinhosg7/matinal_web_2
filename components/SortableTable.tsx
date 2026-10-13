'use client';

import {useCallback, useRef, useState, type MouseEvent, type ReactNode} from 'react';

type Direcao = 'asc' | 'desc';
type Ordem = {coluna:number; direcao:Direcao} | null;

function valorCelula(texto:string):string|number {
  const textoLimpo=texto.trim();
  if (!textoLimpo || textoLimpo==='—' || textoLimpo==='-') return Number.NEGATIVE_INFINITY;
  const numerico=textoLimpo.replace(/\s/g,'').replace(/R\$/gi,'').replace(/%/g,'');
  const negativo=/^-/.test(numerico);
  const semSinal=numerico.replace(/^[+-]/,'');
  const valido=/^[\d.,]+$/.test(semSinal);
  if (!valido) return textoLimpo.toLocaleLowerCase('pt-BR');
  const posVirgula=semSinal.lastIndexOf(',');
  const posPonto=semSinal.lastIndexOf('.');
  let normalizado:string;
  if(posVirgula>=0 && posPonto>=0) {
    normalizado=posVirgula>posPonto?semSinal.replace(/\./g,'').replace(',','.'):semSinal.replace(/,/g,'');
  } else if(posVirgula>=0) {
    normalizado=semSinal.replace(/\./g,'').replace(',','.');
  } else if(posPonto>=0 && /^\d{1,3}(\.\d{3})+$/.test(semSinal)) {
    normalizado=semSinal.replace(/\./g,'');
  } else {
    normalizado=semSinal;
  }
  const numero=Number(normalizado);
  return Number.isFinite(numero)?(negativo?-numero:numero):textoLimpo.toLocaleLowerCase('pt-BR');
}

export default function SortableTable({children}: {children:ReactNode}) {
  const ref=useRef<HTMLTableElement>(null);
  const [ordem,setOrdem]=useState<Ordem>(null);
  const ordenar=useCallback((coluna:number,direcao:Direcao)=>{
    const table=ref.current;
    const tbody=table?.tBodies.item(0);
    if(!table || !tbody)return;
    const linhas=Array.from(tbody.rows);
    const fixas=linhas.filter(row=>row.classList.contains('en-total') || row.classList.contains('co-total') || row.classList.contains('fat-total') || row.classList.contains('pe-total') || row.classList.contains('total') || /^(TOTAL|TOTAL GERAL)$/i.test(row.cells[0]?.textContent?.trim()||''));
    const comuns=linhas.filter(row=>!fixas.includes(row));
    comuns.sort((a,b)=>{
      const x=valorCelula(a.cells[coluna]?.textContent||'');
      const y=valorCelula(b.cells[coluna]?.textContent||'');
      const comparacao=typeof x==='number'&&typeof y==='number'?x-y:String(x).localeCompare(String(y),'pt-BR',{numeric:true});
      return direcao==='asc'?comparacao:-comparacao;
    });
    // Reordena apenas os elementos visuais; os cálculos originais permanecem intactos.
    for(const row of [...comuns,...fixas])tbody.appendChild(row);
    const cabecalhos=Array.from(table.tHead?.rows[0]?.cells||[]);
    cabecalhos.forEach((th,i)=>th.setAttribute('aria-sort',i===coluna?(direcao==='asc'?'ascending':'descending'):'none'));
  },[]);
  function clicar(e:MouseEvent<HTMLTableElement>) {
    const alvo=e.target as HTMLElement;
    const th=alvo.closest('thead th');
    if(!th || !ref.current?.contains(th))return;
    const coluna=Array.from(th.parentElement?.children||[]).indexOf(th);
    if(coluna<0)return;
    const direcao:Direcao=ordem?.coluna===coluna&&ordem.direcao==='desc'?'asc':'desc';
    setOrdem({coluna,direcao});
    ordenar(coluna,direcao);
  }
  return <> 
    <table ref={ref} onClick={clicar} className="kidy-sort-table">{children}</table>
    <style jsx global>{`
      .kidy-sort-table thead th{cursor:pointer;user-select:none;position:relative;padding-right:17px!important}
      .kidy-sort-table thead th::after{content:'↕';position:absolute;right:4px;opacity:.8}
      .kidy-sort-table thead th[aria-sort="descending"]::after{content:'▼';opacity:1}
      .kidy-sort-table thead th[aria-sort="ascending"]::after{content:'▲';opacity:1}
      .kidy-sort-table thead th:hover{filter:brightness(.88)}
    `}</style>
  </>;
}

