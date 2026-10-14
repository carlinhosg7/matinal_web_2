import {usuarioAtual,jsonErro} from '../../../../lib/matinal-auth';
export const dynamic='force-dynamic';
export async function GET(){const u=await usuarioAtual();return u?Response.json(u,{headers:{'Cache-Control':'no-store'}}):jsonErro('Não autenticado',401)}
