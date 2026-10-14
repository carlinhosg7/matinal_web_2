import {NextRequest,NextResponse} from 'next/server';
import {createServerClient} from '@supabase/ssr';
import {adminDb} from '../../../../lib/matinal-auth';
export async function POST(req:NextRequest){
 try{
  const b=await req.json();const atual=String(b.atual||'');const nova=String(b.nova||'');
  if(atual.length<6||nova.length<12||nova.length>128||nova===atual)return NextResponse.json({erro:'A nova senha deve ter no mÃÂ­nimo 12 caracteres e ser diferente da atual.'},{status:400});
  const res=NextResponse.json({ok:true},{headers:{'Cache-Control':'no-store'}});
  const db=createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL!,process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,{cookies:{getAll(){return req.cookies.getAll()},setAll(items){items.forEach(({name,value,options})=>res.cookies.set(name,value,options))}}});
  const {data:{user}}=await db.auth.getUser();if(!user?.email)return NextResponse.json({erro:'NÃÂ£o autenticado'},{status:401});
  const check=await db.auth.signInWithPassword({email:user.email,password:atual});
  if(check.error||check.data.user?.id!==user.id)return NextResponse.json({erro:'Senha atual incorreta'},{status:403});
  const adm=adminDb();const {data:profile}=await adm.from('matinal_usuarios').select('ativo').eq('id',user.id).single();
  if(!profile?.ativo)return NextResponse.json({erro:'UsuÃÂ¡rio inativo'},{status:403});
  const updated=await db.auth.updateUser({password:nova});if(updated.error)return NextResponse.json({erro:'NÃÂ£o foi possÃÂ­vel atualizar a senha'},{status:500});
  const {error}=await adm.from('matinal_usuarios').update({trocar_senha:false,atualizado_em:new Date().toISOString()}).eq('id',user.id);
  if(error)return NextResponse.json({erro:'Senha alterada, mas a confirmaÃÂ§ÃÂ£o falhou. Contate o administrador.'},{status:500});
  return res;
 }catch{return NextResponse.json({erro:'RequisiÃÂ§ÃÂ£o invÃÂ¡lida'},{status:400})}
}
