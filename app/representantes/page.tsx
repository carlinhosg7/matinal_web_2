import {redirect} from 'next/navigation';
import {usuarioAtual} from '../../lib/matinal-auth';
import Painel from './painel';
export const dynamic='force-dynamic';
export default async function Representantes(){
  const usuario=await usuarioAtual();
  if(!usuario)redirect('/login');
  if(usuario.perfil==='EXPORTACAO')redirect('/portal');
  return <Painel/>;
}
