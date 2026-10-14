import {abrirDrive,encontrarDrive} from '../../../lib/drive-source';
import { NextResponse } from 'next/server';
import fs from 'node:fs';
import path from 'node:path';
import * as XLSX from 'xlsx';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

interface Linha { codigo:string; nome:string; supervisor:string; metaValor:number; realValor:number; anteriorValor:number; metaPares:number; realPares:number; anteriorPares:number }
type Registro = Record<string, unknown>;
const normal = (v:unknown) => String(v ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toUpperCase().replace(/[^A-Z0-9]/g,'');
const codigo = (v:unknown) => String(v ?? '').trim().replace(/\.0$/,'');
const numero = (v:unknown) => {
  if(typeof v === 'number') return Number.isFinite(v) ? v : 0;
  const raw = String(v ?? '').trim().replace(/\s/g,'');
  if(!raw) return 0;
  const n = Number(raw.includes(',') ? raw.replace(/\./g,'').replace(',','.') : raw);
  return Number.isFinite(n) ? n : 0;
};
const vazio = (v:unknown) => v === undefined || v === null || String(v).trim() === '';
const total = (id:string) => ['TOTALGERAL','TOTAL','SUBTOTAL'].includes(normal(id));

function localizar(_dir:string, nomes:string[]):string {return encontrarDrive(nomes)}
async function abrir(file:string):Promise<XLSX.WorkBook> {return abrirDrive(file)}
function ler(wb:XLSX.WorkBook, aba:string, linhaCabecalho:number):Registro[] {
  const nome=wb.SheetNames.find(n=>normal(n)===normal(aba));
  if(!nome) throw new Error(`Aba ${aba} não encontrada. Abas disponíveis: ${wb.SheetNames.join(', ')}`);
  const matriz=XLSX.utils.sheet_to_json<unknown[]>(wb.Sheets[nome],{header:1,defval:'',raw:true});
  const headers=(matriz[linhaCabecalho-1]??[]).map(normal);
  return matriz.slice(linhaCabecalho).filter(r=>r.some(v=>!vazio(v))).map(r=>Object.fromEntries(headers.filter(Boolean).map(h=>[h,r[headers.indexOf(h)]])));
}
function campo(r:Registro,...nomes:string[]):unknown {
  for(const n of nomes){const v=r[normal(n)];if(!vazio(v))return v;}
  return undefined;
}
export async function GET() {
  try {
    const dir=(process.env.MATINAL_KIDEX_DIR || process.env.MATINAL_ENTRADA_DIR || 'I:\\Meu Drive\\Dados Matinal\\DADOS_2').trim();
    const metaFile=localizar(dir,['META ENTRADA C KIDEX.xlsx']);
    const matinalFile=localizar(dir,['MATINAL COMERIAL.xlsx','MATINAL COMERCIAL.xlsx']);
    const metaWb=await abrir(metaFile);
    const metaAba=metaWb.SheetNames.find(n=>normal(n)===normal('Folha 1'));
    if(!metaAba)throw new Error('Aba Folha 1 não encontrada no arquivo de metas KIDEX');
    const metaMatriz=XLSX.utils.sheet_to_json<unknown[]>(metaWb.Sheets[metaAba],{header:1,defval:'',raw:true});
    const meta:Registro[]=metaMatriz.slice(2).filter(r=>!vazio(r[0])&&!total(String(r[0]))).map(r=>({
      CODIGOREPRESENTANTE:r[0], REPRESENTANTE:r[1], PARESKIDEX:r[8], VALORKIDEX:r[9]
    }));
    const wb=await abrir(matinalFile);
    const atual=ler(wb,'KIDEX',3);
    const anterior:Registro[]=[];
    const avisos:string[]=[];
    // Blocos fixos: 01-07, 08-14, 15-21, 22-28, 29-fim.
    const agora=new Date();
    const ultimoDia=new Date(agora.getFullYear(),agora.getMonth()+1,0).getDate();
    const quantidadeSemanas=4;
    const semanasDisponiveis:boolean[]=[];
    const realizadosSemanais=Array.from({length:quantidadeSemanas},()=>new Map<string,{pares:number;valor:number}>());
    for(let s=1;s<=quantidadeSemanas;s++){
      const nomeAba=`KIDEX  SEMANA ${String(s).padStart(2,'0')}`;
      const existe=wb.SheetNames.some(n=>normal(n)===normal(nomeAba));
      const possuiDados=existe && wb.Sheets[wb.SheetNames.find(n=>normal(n)===normal(nomeAba))!]?.['!ref'] !== undefined && ler(wb,nomeAba,3).length>0;
       semanasDisponiveis.push(possuiDados);
      if(!possuiDados){avisos.push(`${nomeAba} ainda não disponível no arquivo MATINAL COMERIAL.`);continue;}
      for(const r of ler(wb,nomeAba,3)){
        const id=codigo(campo(r,'Codigo Representante Carteira','Codigo Representante'));
        if(!id||total(id))continue;
        const antigo=realizadosSemanais[s-1].get(id)||{pares:0,valor:0};
        antigo.pares+=numero(campo(r,'Qtd Venda'));
        antigo.valor+=numero(campo(r,'Vlr Venda'));
        realizadosSemanais[s-1].set(id,antigo);
      }
    }

    const mapa=new Map<string,Linha>();
    const obter=(id:string,nome?:string,supervisor?:string):Linha=>{
      let l=mapa.get(id);
      if(!l){l={codigo:id,nome:nome||id,supervisor:supervisor||'SEM SUPERVISOR',metaValor:0,realValor:0,anteriorValor:0,metaPares:0,realPares:0,anteriorPares:0};mapa.set(id,l);}
      if(nome && (l.nome===id || !l.nome)) l.nome=nome;
      if(supervisor && supervisor!=='SEM SUPERVISOR') l.supervisor=supervisor;
      return l;
    };
    for(const r of meta){
      const id=codigo(campo(r,'Codigo Representante','CODIGO_REP'));
      if(!id || total(id))continue;
      const l=obter(id,String(campo(r,'Representante','REP')??id));
      l.metaPares+=numero(campo(r,'PARES KIDEX'));
      l.metaValor+=numero(campo(r,'VALOR KIDEX'));
    }
    for(const r of atual){
      const id=codigo(campo(r,'Codigo Representante Carteira','Codigo Representante'));
      if(!id || total(id))continue;
      const l=obter(id,String(campo(r,'Representante Carteira','Representante')??id),String(campo(r,'Supervisor')??'SEM SUPERVISOR'));
      l.realPares+=numero(campo(r,'Qtd Venda'));
      l.realValor+=numero(campo(r,'Vlr Venda'));
    }
    for(const r of anterior){
      const id=codigo(campo(r,'Codigo Representante Carteira','Codigo Representante'));
      if(!id || total(id))continue;
      const l=obter(id,String(campo(r,'Representante Carteira','Representante')??id),String(campo(r,'Supervisor')??'SEM SUPERVISOR'));
      l.anteriorPares+=numero(campo(r,'Qtd Venda'));
      l.anteriorValor+=numero(campo(r,'Vlr Venda'));
    }
    try {
      const cadastro=ler(await abrir(localizar(dir,['CAD_REPRESENTANTE.xlsx'])),'CAD_REPRESENTANTE',1);
      for(const r of cadastro){
        const id=codigo(campo(r,'Codigo Representante','CODIGO_REP','CODREP','CODIGO'));
        const l=mapa.get(id);if(!l)continue;
        const sup=campo(r,'Supervisor');if(!vazio(sup))l.supervisor=String(sup).trim();
        const nome=campo(r,'Nome Rep');if(!vazio(nome))l.nome=String(nome).trim();
      }
    } catch(e) {avisos.push('Não foi possível aplicar CAD_REPRESENTANTE: '+String(e));}
    const linhas=[...mapa.values()].sort((a,b)=>a.nome.localeCompare(b.nome,'pt-BR'));
    if(!linhas.length)throw new Error('Nenhum representante encontrado nas planilhas. Verifique os cabeçalhos e dados.');
    const supervisores=[...new Set(linhas.map(x=>x.supervisor))].sort((a,b)=>a.localeCompare(b,'pt-BR'));
    const semanas=Array.from({length:quantidadeSemanas},(_,index)=>{
      const numeroSemana=index+1;
      const anterioresDisponiveis=semanasDisponiveis.slice(0,index).every(Boolean);
      const disponivel=semanasDisponiveis[index];
      const linhasSemana=linhas.map(l=>{
        let paresAnteriores=0,valorAnterior=0;
        for(let i=0;i<index;i++){
          const realizado=realizadosSemanais[i].get(l.codigo);
          paresAnteriores+=realizado?.pares||0;
          valorAnterior+=realizado?.valor||0;
        }
        const atualSemana=realizadosSemanais[index].get(l.codigo);
        const restantes=quantidadeSemanas-index;
        return {...l,
          metaPares:anterioresDisponiveis?(l.metaPares-paresAnteriores)/restantes:0,
          metaValor:anterioresDisponiveis?(l.metaValor-valorAnterior)/restantes:0,
          realPares:disponivel?(atualSemana?.pares||0):0,
          realValor:disponivel?(atualSemana?.valor||0):0,
          anteriorPares:0,anteriorValor:0};
      });
      return {numero:numeroSemana,inicio:4+(index*7),fim:Math.min(10+(index*7),ultimoDia),
        disponivel,metaDisponivel:anterioresDisponiveis,linhas:linhasSemana};
    });
    return NextResponse.json({quantidadeSemanas,semanas,status:'aguardando_validacao_pbix',linhas,supervisores,periodo:'Conforme arquivos de origem',metasValidas:meta.filter(r=>!!codigo(campo(r,'Codigo Representante','CODIGO_REP'))&&!total(codigo(campo(r,'Codigo Representante','CODIGO_REP')))).length,vendasValidas:atual.filter(r=>!!codigo(campo(r,'Codigo Representante Carteira','Codigo Representante'))&&!total(codigo(campo(r,'Codigo Representante Carteira','Codigo Representante')))).length,avisos,arquivos:{meta:path.basename(metaFile),matinal:path.basename(matinalFile)}});
  } catch(e) {
    console.error('[API KIDEX]',e);
    return NextResponse.json({erro:e instanceof Error?e.message:String(e)},{status:500});
  }
}
