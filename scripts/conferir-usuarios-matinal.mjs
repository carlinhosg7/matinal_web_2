// Matinal Web: auditoria e inclusão segura de usuários faltantes.
// Uso: node --env-file=.env.local scripts/conferir-usuarios-matinal.mjs
//      node --env-file=.env.local scripts/conferir-usuarios-matinal.mjs --apply
// Ajuste CODIGOS_SUPERVISORES antes de --apply, se necessário.
import { createClient } from '@supabase/supabase-js';
import { randomBytes } from 'node:crypto';
import fs from 'node:fs';

const APLICAR = process.argv.includes('--apply');
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) throw Error('Configure NEXT_PUBLIC_SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY no .env.local');
const db = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });

// "Ativo" na relação recebida é status, não um perfil. A confirmar.
const usuarios = [
 ['dados@kidy.com.br',null,'total'],
 ['andreia.cristina@kidy.com.br','ADMINISTRADOR','total'],
 ['beatriz.rodrigues@kidy.com.br','SUPERVISOR','sem_exportacao_cadastro'],
 ['carlos.gomes@kidy.com.br','ADMINISTRADOR','total'],
 ['carolina.pedroza@kidy.com.br','SUPERVISOR','sem_exportacao_cadastro'],
 ['guilherme.falleiros@kidy.com.br','GERENTE','somente_exportacao'],
 ['jaqueline.helena@kidy.com.br','GERENTE','sem_cadastro'],
 ['jeane.ribeiro@kidy.com.br','SUPERVISOR','sem_exportacao_cadastro'],
 ['leticia.dias@kidy.com.br','SUPERVISOR','sem_exportacao_cadastro'],
 ['leyticia.lima@kidy.com.br','SUPERVISOR','sem_exportacao_cadastro'],
 ['mauricio.laluce@kidy.com.br','GERENTE','total'],
 ['menezes.vendas@kidy.com.br','GERENTE','sem_exportacao_cadastro'],
 ['milene.oliveira@kidy.com.br','SUPERVISOR','sem_exportacao_cadastro'],
 ['natalia.sperafico@kidy.com.br','GERENTE','sem_exportacao_cadastro'],
 ['sueli.moreira@kidy.com.br','SUPERVISOR','sem_exportacao_cadastro'],
 ['thiago.cardeal@kidy.com.br','GERENTE','sem_exportacao_cadastro'],
 ['wanderley.garcia@kidy.com.br','GERENTE','sem_exportacao_cadastro'],
 ['jessica.bassetto@kidy.com.br','SUPERVISOR','sem_cadastro'],
 // Acesso exclusivo a Exportação requer permissão específica no app. Não assumir um perfil inválido.
 ['export@kidy.com.br',null,'somente_exportacao'],
];
// Códigos vinculados à CAD_REPRESENTANTE; não confundir com e-mail ou código do representante.
const CODIGOS_SUPERVISORES = {
  // 'beatriz.rodrigues@kidy.com.br': '9900',
};
const telaPadrao = ['faturamento','entrada','cobertura','projetos-especiais','brinquedos'];
const emailNorm = s => (s || '').trim().toLowerCase();
const nomeDoEmail = email => email.split('@')[0].replace(/[._-]+/g,' ').replace(/\b\w/g, x=>x.toUpperCase());
const {data:perfis,error:ep} = await db.from('matinal_usuarios').select('id,email,nome,perfil,ativo,supervisor_codigo');
if(ep)throw Error('Erro consultando matinal_usuarios: '+ep.message);
const porEmail = new Map(perfis.map(x=>[emailNorm(x.email),x]));
const authUsers=[];
for(let page=1;;page++){
 const {data,error}=await db.auth.admin.listUsers({page,perPage:1000});
 if(error)throw Error('Erro consultando auth.users: '+error.message);
 authUsers.push(...(data.users||[]));
 if((data.users||[]).length<1000)break;
}
const authPorEmail = new Map(authUsers.map(x=>[emailNorm(x.email),x]));
const checks=[];
for(const [email,perfil,regra] of usuarios){
 const registro=porEmail.get(email),auth=authPorEmail.get(email);
 checks.push({email,perfil:perfil||'A CONFIRMAR',regra,auth:!!auth,cadastro:!!registro,codigoSupervisor:registro?.supervisor_codigo||CODIGOS_SUPERVISORES[email]||null,status:(!perfil?'CONFIRMAR PERFIL':registro&&auth?'CADASTRADO':auth?'FALTA PERFIL':registro?'FALTA AUTH':'A CRIAR')});
}
console.table(checks.map(({email,perfil,auth,cadastro,status})=>({email,perfil,auth,cadastro,status})));
console.log(`Total na lista: ${usuarios.length}; com cadastro e autenticação: ${checks.filter(x=>x.auth&&x.cadastro).length}; pendências: ${checks.filter(x=>x.status!=='CADASTRADO').length}`);
console.log('ATENÇÃO: o modelo atual NÃO contempla permissões separadas de Exportação/Cadastro. Não modifica permissões de usuários existentes.');
if(!APLICAR){console.log('Modo conferência. Para criar pendentes com perfil e código válidos, execute novamente com --apply.');process.exit(0)}
const credentials=[];
for(const item of checks){
 const {email,perfil}=item;
 if(!usuarios.find(u=>u[0]===email)?.[1]){console.log('PENDENTE: perfil precisa ser confirmado:',email);continue}
 const codigo = item.codigoSupervisor;
 if(perfil==='SUPERVISOR'&&!codigo){console.log('PENDENTE: falta supervisor_codigo:',email);continue}
 if(item.auth&&item.cadastro){console.log('PRESERVADO, sem mudar senha/permissões:',email);continue}
 let authUser=authPorEmail.get(email),created=false;
 if(!authUser){
   const senha = randomBytes(24).toString('base64url');
   const {data,error}=await db.auth.admin.createUser({email,password:senha,email_confirm:true,user_metadata:{nome:nomeDoEmail(email)}});
   if(error||!data?.user){console.error('ERRO auth:',email,error?.message);continue}
   authUser=data.user;created=true;
   credentials.push({email,senha_provisoria:senha});
 }
 const nome=nomeDoEmail(email);
 const {error:eu}=await db.from('matinal_usuarios').upsert({id:authUser.id,email,nome,perfil,ativo:true,supervisor_codigo:perfil==='SUPERVISOR'?codigo:null,trocar_senha:true},{onConflict:'id'});
 if(eu){console.error('ERRO perfil:',email,eu.message);if(created){await db.auth.admin.deleteUser(authUser.id);credentials.pop()}continue}
 // Apenas para novos perfis: permissões básicas. Regras avançadas serão aplicadas em etapa própria.
 const telas= item.regra==='somente_exportacao'?[]:telaPadrao;
 if(telas.length){const {error:et}=await db.from('matinal_permissoes').upsert(telas.map(tela=>({usuario_id:authUser.id,tela})),{onConflict:'usuario_id,tela'});if(et)console.error('ERRO permissões básicas:',email,et.message)}
 console.log('INCLUÍDO perfil:',email);
}
if(credentials.length){
 const file = `./credenciais-provisorias-matinal-${new Date().toISOString().slice(0,10)}.json`;
 fs.writeFileSync(file,JSON.stringify(credentials,null,2),{mode:0o600,flag:'wx'});
 console.log('Senhas provisórias dos novos usuários salvas SOMENTE localmente em:',file);
 console.log('NÃO envie o arquivo ao GitHub. Entregue a cada usuário apenas sua senha. Troca exigida no primeiro acesso.');
}
console.log('Concluído. Verifique os PENDENTES e implemente as permissões Exportação/Cadastro separadamente.');
