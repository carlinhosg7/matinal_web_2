import {NextRequest,NextResponse} from 'next/server';
import {createServerClient} from '@supabase/ssr';
const TELAS=['faturamento','entrada','cobertura','projetos-especiais','brinquedos'];
export async function middleware(req:NextRequest){
 const path=req.nextUrl.pathname;
 const isApi=path.startsWith('/api/');
 const tela=TELAS.find(t=>path===`/${t}`||path.startsWith(`/${t}/`)||path===`/api/${t}`||path.startsWith(`/api/${t}/`));
 const admin=path.startsWith('/admin/')||path.startsWith('/api/admin/');
 const troca=path==='/trocar-senha'||path.startsWith('/api/auth/trocar-senha');
 const portal=path==='/portal'||path.startsWith('/portal/');
 if(!tela&&!admin&&!portal&&!troca)return NextResponse.next();
 const res=NextResponse.next();
 const db=createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL!,process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,{cookies:{getAll(){return req.cookies.getAll()},setAll(items){items.forEach(({name,value,options})=>res.cookies.set(name,value,options))}}});
 const {data:{user}}=await db.auth.getUser();
 const deny=(status:number)=>isApi?NextResponse.json({erro:status===401?'Não autenticado':'Acesso negado'},{status}):NextResponse.redirect(new URL(status===401?'/login':'/portal',req.url));
 if(!user)return deny(401);
 // Middleware usa somente a chave anon; RLS permite leitura limitada do próprio perfil e permissões.
 const {data:p,error:pe}=await db.from('matinal_usuarios').select('perfil,ativo,trocar_senha').eq('id',user.id).maybeSingle();
 if(pe||!p||!p.ativo)return deny(403);
 if(p.trocar_senha&&!troca)return isApi?NextResponse.json({erro:'Troca de senha obrigatória'},{status:403}):NextResponse.redirect(new URL('/trocar-senha',req.url));
 if(!p.trocar_senha&&troca&&!isApi)return NextResponse.redirect(new URL('/portal',req.url));
 if(admin&&p.perfil!=='ADMINISTRADOR')return deny(403);
 if(tela&&p.perfil!=='ADMINISTRADOR'){
  const {data:perms,error}=await db.from('matinal_permissoes').select('tela').eq('usuario_id',user.id).eq('tela',tela).limit(1);
  if(error||!perms?.length)return deny(403);
 }
 return res;
}
export const config={matcher:['/trocar-senha/:path*','/api/auth/trocar-senha/:path*','/portal/:path*','/admin/:path*','/api/admin/:path*','/faturamento/:path*','/entrada/:path*','/cobertura/:path*','/projetos-especiais/:path*','/brinquedos/:path*','/api/faturamento/:path*','/api/entrada/:path*','/api/cobertura/:path*','/api/projetos-especiais/:path*','/api/brinquedos/:path*']};
