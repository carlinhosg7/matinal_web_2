import {usuarioAtual,podeAdministrar,adminDb,TELAS,jsonErro,Perfil} from '../../../../lib/matinal-auth';
export const dynamic='force-dynamic';
async function autorizado(){const u=await usuarioAtual();return u&&podeAdministrar(u)}
export async function GET(){
 if(!await autorizado())return jsonErro('Acesso negado',403);
 const db=adminDb();const {data,error}=await db.from('matinal_usuarios').select('id,nome,email,perfil,ativo,supervisor_codigo,matinal_permissoes(tela)').order('nome');
 return error?jsonErro('Erro ao listar usuários',500):Response.json(data,{headers:{'Cache-Control':'no-store'}});
}
export async function POST(req:Request){
 if(!await autorizado())return jsonErro('Acesso negado',403);
 let b:any;try{b=await req.json()}catch{return jsonErro('JSON inválido',400)}
 const nome=typeof b.nome==='string'?b.nome.trim():'';
 const email=typeof b.email==='string'?b.email.trim().toLowerCase():'';
 const senha=typeof b.senha==='string'?b.senha:'';
 const perfil=b.perfil as Perfil;
 const supervisor=typeof b.supervisor_codigo==='string'?b.supervisor_codigo.trim():'';
 const telas=b.telas;
 if(nome.length<2||nome.length>160||email.length>254||!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)||senha.length<12||!['ADMINISTRADOR','GERENTE','SUPERVISOR'].includes(perfil)||!Array.isArray(telas)||telas.some((x:unknown)=>!TELAS.includes(x as any))||new Set(telas).size!==telas.length||(perfil==='SUPERVISOR'&&!supervisor))return jsonErro('Verifique nome, e-mail, senha (mínimo 12 caracteres), perfil, telas e código do supervisor',400);
 const db=adminDb();const {data:created,error:ce}=await db.auth.admin.createUser({email,password:senha,email_confirm:false,user_metadata:{nome}});
 if(ce||!created.user)return jsonErro('Não foi possível criar usuário; verifique se o e-mail já existe',409);
 const id=created.user.id;
 try{
  const {error:ue}=await db.from('matinal_usuarios').insert({id,nome,email,perfil,ativo:true,supervisor_codigo:perfil==='SUPERVISOR'?supervisor:null});if(ue)throw ue;
  if(telas.length){const {error:pe}=await db.from('matinal_permissoes').insert(telas.map((tela:string)=>({usuario_id:id,tela})));if(pe)throw pe}
  return Response.json({ok:true,id},{status:201,headers:{'Cache-Control':'no-store'}});
 }catch{await db.auth.admin.deleteUser(id);return jsonErro('Falha ao salvar cadastro e permissões; criação revertida',500)}
}
