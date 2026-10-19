import {redirect} from 'next/navigation';
import {usuarioAtual} from '../../../lib/matinal-auth';
import Painel from './painel';
export const dynamic='force-dynamic';
export default async function PreditivoPage(){
 const u=await usuarioAtual();
 if(!u)redirect('/login');
 if(u.perfil!=='ADMINISTRADOR' && !u.telas.some(x=>String(x)==='export')) redirect('/portal');
 return <Painel/>;
}
