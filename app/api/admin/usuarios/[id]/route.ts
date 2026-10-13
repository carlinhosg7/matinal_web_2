import {redirect} from 'next/navigation';
import {usuarioAtual,podeAdministrar} from '';
import Cadastro from './cadastro';
export const dynamic='force-dynamic';
export default async function Usuarios(){const u=await usuarioAtual();if(!u)redirect('/login');if(!podeAdministrar(u))redirect('/portal');return <Cadastro/>}
