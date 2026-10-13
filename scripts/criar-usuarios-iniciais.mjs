// Execute somente em ambiente administrativo: node --env-file=.env.local scripts/criar-usuarios-iniciais.mjs
import {createClient} from '@supabase/supabase-js';
const url=process.env.NEXT_PUBLIC_SUPABASE_URL,key=process.env.SUPABASE_SERVICE_ROLE_KEY;
if(!url||!key)throw Error('Configure NEXT_PUBLIC_SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY no .env.local');
const db=createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false}});
const usuarios=[
 {nome:'Carlos Gomes',email:'carlos.gomes@kidy.com.br',perfil:'ADMINISTRADOR'},
 {nome:'Mauricio Laluce',email:'mauricio.laluce@kidy.com.br',perfil:'GERENTE'},
 {nome:'Andreia Cristina',email:'andreia.cristina@kidy.com.br',perfil:'GERENTE'},
 // Wanderley pendente: confirmar se o e-mail correto é wanderley.garcia@kidy.com.br
];
for(const u of usuarios){
 const {data:existing,error:lookup}=await db.from('matinal_usuarios').select('id').eq('email',u.email).maybeSingle();
 if(lookup)throw lookup;if(existing){console.log('Já cadastrado, sem alterações:',u.email);continue}
 const {data,error}=await db.auth.admin.createUser({email:u.email,password:'123456',email_confirm:true,user_metadata:{nome:u.nome}});
 if(error){console.error('Falha ao criar',u.email,error.message);continue}
 const id=data.user.id;
 const {error:insertError}=await db.from('matinal_usuarios').insert({id,nome:u.nome,email:u.email,perfil:u.perfil,ativo:true,trocar_senha:true});
 if(insertError){await db.auth.admin.deleteUser(id);console.error('Falha no perfil:',u.email,insertError.message);continue}
 const telas=['faturamento','entrada','cobertura','projetos-especiais','brinquedos'];
 const {error:permissionError}=await db.from('matinal_permissoes').insert(telas.map(tela=>({usuario_id:id,tela})));
 if(permissionError){await db.auth.admin.deleteUser(id);console.error('Falha nas permissões:',u.email,permissionError.message);continue}
 console.log('Criado:',u.email,u.perfil);
}
