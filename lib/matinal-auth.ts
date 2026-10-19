import 'server-only';
import { createClient } from '@supabase/supabase-js';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

export const TELAS = ['faturamento','entrada','cobertura','projetos-especiais','brinquedos','export'] as const;
export type Tela = (typeof TELAS)[number];
export type Perfil = 'ADMINISTRADOR'|'GERENTE'|'SUPERVISOR'|'EXPORTACAO';
export type Usuario = {id:string;nome:string;email:string;perfil:Perfil;ativo:boolean;supervisor_codigo:string|null;telas:Tela[]};
const url=()=>{const v=process.env.NEXT_PUBLIC_SUPABASE_URL;if(!v)throw Error('Configure NEXT_PUBLIC_SUPABASE_URL');return v};
const anon=()=>{const v=process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;if(!v)throw Error('Configure NEXT_PUBLIC_SUPABASE_ANON_KEY');return v};
export function adminDb(){const key=process.env.SUPABASE_SERVICE_ROLE_KEY;if(!key)throw Error('Configure SUPABASE_SERVICE_ROLE_KEY (somente servidor)');return createClient(url(),key,{auth:{persistSession:false,autoRefreshToken:false}})}
export async function sessionDb(){const jar=await cookies();return createServerClient(url(),anon(),{cookies:{getAll(){return jar.getAll()},setAll(items){try{items.forEach(({name,value,options})=>jar.set(name,value,options))}catch{ /* Server Component read-only */ }}}})}
export async function usuarioAtual():Promise<Usuario|null>{
 const db=await sessionDb();const {data:{user},error}=await db.auth.getUser();if(error||!user)return null;
 const adm=adminDb();const {data:p,error:pe}=await adm.from('matinal_usuarios').select('id,nome,email,perfil,ativo,supervisor_codigo').eq('id',user.id).maybeSingle();
 if(pe||!p||!p.ativo)return null;
 const {data:permissions,error:re}=await adm.from('matinal_permissoes').select('tela').eq('usuario_id',user.id);
 if(re)return null;
 return {...p,telas:(permissions||[]).map(x=>x.tela).filter((x):x is Tela=>TELAS.includes(x as Tela))} as Usuario;
}
export function podeAcessar(user:Usuario,tela:Tela){return user.perfil==='ADMINISTRADOR'||user.telas.includes(tela)}
export function podeAdministrar(user:Usuario){return user.perfil==='ADMINISTRADOR'}
export function jsonErro(mensagem:string,status:number){return Response.json({erro:mensagem},{status,headers:{'Cache-Control':'no-store'}})}
