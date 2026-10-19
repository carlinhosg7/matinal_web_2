import {NextRequest, NextResponse} from 'next/server';
import {createServerClient} from '@supabase/ssr';

const TELAS = ['faturamento','entrada','cobertura','projetos-especiais','brinquedos','export'];
const API_PUBLICAS = ['/api/auth/login','/api/auth/logout','/api/auth/me'];

export async function middleware(req: NextRequest) {
  const path = req.nextUrl.pathname;
  const isApi = path.startsWith('/api/');
  if (API_PUBLICAS.some(p => path === p || path.startsWith(p + '/'))) return NextResponse.next();
  const troca = path === '/trocar-senha' || path.startsWith('/api/auth/trocar-senha');
  const portal = path === '/portal' || path.startsWith('/portal/');
  const raiz = path === '/';
  const tela = TELAS.find(t => path === `/${t}` || path.startsWith(`/${t}/`) || path === `/api/${t}` || path.startsWith(`/api/${t}/`));
  const admin = path.startsWith('/admin/') || path.startsWith('/api/admin/');
  const protegida = !!tela || admin || portal || troca || raiz || isApi || path.startsWith('/matinal') || path.startsWith('/representantes') || path.startsWith('/entrada-semanal') || path.startsWith('/kidex');
  if (!protegida) return NextResponse.next();

  const res = NextResponse.next();
  const db = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {cookies:{getAll(){return req.cookies.getAll()},setAll(items){items.forEach(({name,value,options}) => res.cookies.set(name,value,options));}}}
  );
  const {data:{user}} = await db.auth.getUser();
  const negar = (status:number) => isApi
    ? NextResponse.json({erro:status===401?'Nao autenticado':'Acesso negado'},{status})
    : NextResponse.redirect(new URL(status===401?'/login':'/portal',req.url));
  if (!user) return negar(401);
  const {data:p,error:pe} = await db.from('matinal_usuarios')
    .select('perfil,ativo,trocar_senha').eq('id',user.id).maybeSingle();
  if (pe || !p || !p.ativo) return negar(403);
  if (p.trocar_senha && !troca) return isApi
    ? NextResponse.json({erro:'Troca de senha obrigatoria'},{status:403})
    : NextResponse.redirect(new URL('/trocar-senha',req.url));
  if (!p.trocar_senha && troca && !isApi) return NextResponse.redirect(new URL('/portal',req.url));

  // Perfil de exportacao: negar qualquer outro modulo e API.
  if (p.perfil === 'EXPORTACAO') {
    if (portal || raiz) return NextResponse.redirect(new URL('/export',req.url));
    if (admin || (tela && tela !== 'export') || (isApi && !path.startsWith('/api/export/')) || (!tela && !troca && !isApi)) return negar(403);
  }
  if (admin && p.perfil !== 'ADMINISTRADOR') return negar(403);
  if (tela && p.perfil !== 'ADMINISTRADOR') {
    const {data:perms,error} = await db.from('matinal_permissoes')
      .select('tela').eq('usuario_id',user.id).eq('tela',tela).limit(1);
    if (error || !perms?.length) return negar(403);
  }
  return res;
}

export const config = {matcher:[
  '/','/portal/:path*','/trocar-senha/:path*','/admin/:path*',
  '/matinal/:path*','/representantes/:path*','/entrada-semanal/:path*',
  '/faturamento/:path*','/entrada/:path*','/cobertura/:path*',
  '/projetos-especiais/:path*','/brinquedos/:path*','/kidex/:path*',
  '/export/:path*','/api/:path*'
]};