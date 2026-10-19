import {NextResponse} from 'next/server';
import {usuarioAtual} from '../../../../lib/matinal-auth';
import {carregarPlanejamento} from '../../../../lib/export-planejamento';
export const runtime='nodejs';
export const dynamic='force-dynamic';
let cache:{valor:Awaited<ReturnType<typeof carregarPlanejamento>>;expires:number}|undefined;
let pendente:Promise<Awaited<ReturnType<typeof carregarPlanejamento>>>|undefined;
export async function GET(){
 try{
  const user=await usuarioAtual();if(!user)return NextResponse.json({erro:'Nao autenticado'},{status:401});
  if((user.perfil!=='ADMINISTRADOR' && user.email.trim().toLowerCase()!=='andreia.cristina@kidy.com.br'))return NextResponse.json({erro:'Acesso nao autorizado'},{status:403});
  if(cache&&cache.expires>Date.now())return NextResponse.json(cache.valor,{headers:{'Cache-Control':'private, no-store'}});
  if(!pendente)pendente=carregarPlanejamento().then(valor=>{cache={valor,expires:Date.now()+15*60*1000};return valor}).finally(()=>{pendente=undefined});
  try{return NextResponse.json(await pendente,{headers:{'Cache-Control':'private, no-store'}})}
  catch(e){if(cache)return NextResponse.json({...cache.valor,avisoCache:'Dados anteriores exibidos; atualizacao falhou'},{headers:{'Cache-Control':'private, no-store'}});throw e}
 }catch(e){console.error('[export-planejamento]',e);return NextResponse.json({erro:e instanceof Error?e.message:'Falha na carga'},{status:500})}
}
