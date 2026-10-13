 'use client';
import {useRouter} from 'next/navigation';
export default function Sair(){const router=useRouter();return <button onClick={async()=>{await fetch('/api/auth/logout',{method:'POST'});router.replace('/login');router.refresh()}} style={{padding:'10px 20px',cursor:'pointer'}}>Sair</button>}
