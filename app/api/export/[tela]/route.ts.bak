import {NextResponse} from 'next/server';
import {usuarioAtual} from '../../../../lib/matinal-auth';
import {exportData} from '../../../../lib/export-data';
export const runtime='nodejs';
export const dynamic='force-dynamic';
export async function GET(request:Request,{params}:{params:Promise<{tela:string}>}){
 try{
  const user=await usuarioAtual();
  if(!user)return NextResponse.json({erro:'Não autenticado'},{status:401});
  // Permissões de Exportação devem ser parametrizadas antes de liberar perfis não administrativos.
  if(user.perfil!=='ADMINISTRADOR')return NextResponse.json({erro:'Acesso Exportação ainda não configurado para este perfil'},{status:403});
  const {tela}=await params;const u=new URL(request.url);
  const numeros=(plural:string,singular:string)=>{
   const raw=u.searchParams.get(plural)||u.searchParams.get(singular)||'';
   return [...new Set(raw.split(',').map(Number).filter(Number.isInteger))];
  };
  const paises=(u.searchParams.get('paises')||u.searchParams.get('pais')||'').split(',').map(x=>x.trim()).filter(Boolean);
  const data=await exportData(tela,numeros('anos','ano'),numeros('meses','mes'),paises,u.searchParams.get('atualizar')==='1');
  return NextResponse.json(data,{headers:{'Cache-Control':'private, no-store, max-age=0'}});
 }catch(e){console.error('[export]',e);return NextResponse.json({erro:e instanceof Error?e.message:'Erro ao buscar Exportação'},{status:500,headers:{'Cache-Control':'no-store'}})}
}
